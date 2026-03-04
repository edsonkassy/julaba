/**
 * TANTIE SAGESSE - Context React Global (v2 — Architecture Phase 2/3 complète)
 *
 * Corrections P0 implémentées :
 *   [P0-1] Guard enabledForRoles enforced — bloque ouverture + sendMessage si rôle désactivé
 *   [P0-2] isProcessing ref — élimine la race condition double-envoi
 *   [P0-3] executeAction — utilise NavigationService (plus window.location.hash)
 *   [P0-4] Feedback erreur STT — toast visible à l'utilisateur
 *   [P0-5] Refresh contexte — toutes les 60 secondes en session active
 *   [P0-6] Migration localStorage — migrateUserStorageKeys() au login
 *
 * Modules P1 intégrés :
 *   [P1-1] config BO consommée — passée à processMessage() et buildWelcomeMessage()
 *   [P1-2] AILogService — log structuré accepté/refusé dans tantieEngine
 *   [P1-3] PermissionGuard — allowlist intent par rôle dans tantieEngine
 *
 * Modules P3 créés (Architecture Phase 3) :
 *   [P3-1] ActionRegistry.ts — registre centralisé des 30+ actions par rôle
 *   [P3-2] AgentRouter.ts    — routeur intent → actions + stubs services backend
 *   [P3-3] ConfirmationManager.ts — flow confirmation actions critiques
 *
 * Nettoyage v1 :
 *   [CLEAN] TantieSagesseModal, CommandesVocales, voice/TantieSagesse supprimés
 *   [CLEAN] showTantieSagesseModal, isTantieOpen états supprimés dans les pages
 *   [BUGFIX] processMessage appelé 1x (était 2x → double logAccepted)
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { toast } from 'sonner';

import { useApp } from './AppContext';

import {
  processMessage,
  createSession,
  addMessagesToSession,
  buildWelcomeMessage,
  buildLoadingMessage,
  analyzeContextAlerts,
  getWelcomeSuggestions,
  refreshContext,
  type ContextAlert,
} from '../services/tantieSagesse/tantieEngine';

import {
  speak,
  stopSpeaking,
  startListening,
  stopListening,
  preloadVoices,
  playFeedbackSound,
  isTTSSupported,
  isSTTSupported,
} from '../services/tantieSagesse/speechService';

import {
  saveCurrentSession,
  loadCurrentSession,
  archiveSession,
  recordSessionInStats,
  computeStats,
} from '../services/tantieSagesse/sessionManager';

import { buildUserContext } from '../services/tantieSagesse/contextCollector';
import { migrateUserStorageKeys } from '../services/tantieSagesse/AIStorageKeys';
import { GLOBAL_KEYS, safeReadStorage, safeWriteStorage } from '../services/tantieSagesse/AIStorageKeys';
import { NavigationService } from '../services/tantieSagesse/NavigationService';

import type {
  TantieMessage,
  TantieSession,
  TantieAction,
  TantieConfig,
  TantieStats,
} from '../types/tantie.types';

// ============================================================================
// CONFIG PAR DÉFAUT
// ============================================================================

const DEFAULT_CONFIG: TantieConfig = {
  enabledForRoles:          ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'],
  voiceEnabled:             true,
  voiceLanguage:            'fr-FR',
  speechRate:               0.92,
  speechPitch:              1.05,
  speechVolume:             1.0,
  nom:                      'Tantie Sagesse',
  styleReponse:             'CHALEUREUX',
  longueurReponse:          'MOYENNE',
  utiliseDioula:            false,
  utiliseBaoule:            false,
  maxMessagesParSession:    100,
  delaiTimeoutSession:      120,
  suggestionsRapidesEnabled: true,
  actionsRapidesEnabled:    true,
  analyseStockEnabled:      true,
  alertesProactivesEnabled: true,
  conseilsPrixEnabled:      true,
  updatedAt:                new Date().toISOString(),
  updatedBy:                'system',
};

function loadConfig(): TantieConfig {
  try {
    const raw = localStorage.getItem(GLOBAL_KEYS.TANTIE_CONFIG);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

function saveConfig(cfg: TantieConfig): void {
  safeWriteStorage(GLOBAL_KEYS.TANTIE_CONFIG, cfg);
}

// ============================================================================
// TYPES DU CONTEXTE
// ============================================================================

interface TantieContextType {
  isOpen:             boolean;
  isMinimized:        boolean;
  session:            TantieSession | null;
  messages:           TantieMessage[];
  isTyping:           boolean;
  isSpeaking:         boolean;
  isListening:        boolean;
  interimTranscript:  string;
  contextAlerts:      ContextAlert[];
  config:             TantieConfig;
  ttsSupported:       boolean;
  sttSupported:       boolean;
  stats:              TantieStats;
  isBlocked:          boolean;  // true si le rôle courant est désactivé dans la config

  openTantie:         () => void;
  closeTantie:        () => void;
  minimizeTantie:     () => void;
  sendMessage:        (text: string, mode?: 'text' | 'voice') => Promise<void>;
  clearConversation:  () => void;

  startVoiceInput:    () => void;
  stopVoiceInput:     () => void;
  toggleSpeak:        (text: string) => void;
  stopCurrentSpeech:  () => void;

  updateConfig:       (updates: Partial<TantieConfig>) => void;
  executeAction:      (action: TantieAction) => void;
  refreshStats:       () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const TantieContext = createContext<TantieContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function TantieProvider({ children }: { children: React.ReactNode }) {
  const { user } = useApp();

  const [isOpen, setIsOpen]               = useState(false);
  const [isMinimized, setIsMinimized]     = useState(false);
  const [session, setSession]             = useState<TantieSession | null>(null);
  const [messages, setMessages]           = useState<TantieMessage[]>([]);
  const [isTyping, setIsTyping]           = useState(false);
  const [isSpeakingState, setIsSpeaking]  = useState(false);
  const [isListening, setIsListening]     = useState(false);
  const [interimTranscript, setInterim]   = useState('');
  const [contextAlerts, setAlerts]        = useState<ContextAlert[]>([]);
  const [config, setConfig]               = useState<TantieConfig>(loadConfig);
  const [stats, setStats]                 = useState<TantieStats>(computeStats);

  const ttsSupported = isTTSSupported();
  const sttSupported = isSTTSupported();

  // [P0-1] Guard enabledForRoles — le rôle courant est-il activé ?
  const isBlocked = !!(
    user?.role && !config.enabledForRoles.includes(user.role as any)
  );

  // Refs pour éviter les closures stales
  const sessionRef    = useRef<TantieSession | null>(null);
  const configRef     = useRef<TantieConfig>(config);
  // [P0-2] Guard race condition
  const isProcessing  = useRef<boolean>(false);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { configRef.current  = config;  }, [config]);

  // ============================================================================
  // INITIALISATION + MIGRATION LOCALSTORAGE [P0-6]
  // ============================================================================

  useEffect(() => {
    preloadVoices();
  }, []);

  // Migration + création/restauration de session au login
  useEffect(() => {
    if (!user) return;

    const userId = user.id || 'user-default';

    // [P0-6] Migrer les anciennes clés globales vers les clés préfixées par userId
    migrateUserStorageKeys(userId);

    const existing = loadCurrentSession(userId);

    let sess: TantieSession;
    if (existing) {
      sess = refreshContext(existing, user);
    } else {
      sess = createSession(user);
    }

    const alerts = analyzeContextAlerts(sess.context);
    setAlerts(alerts);
    setSession(sess);
    sessionRef.current = sess;

    if (existing && existing.messages.length > 0) {
      setMessages(existing.messages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // [P0-5] Rafraîchissement du contexte toutes les 60 secondes en session active
  useEffect(() => {
    if (!isOpen || !user || !sessionRef.current) return;

    const intervalId = setInterval(() => {
      if (sessionRef.current && user) {
        const refreshed = refreshContext(sessionRef.current, user);
        setSession(refreshed);
        sessionRef.current = refreshed;
        const alerts = analyzeContextAlerts(refreshed.context);
        setAlerts(alerts);
      }
    }, 60_000);

    return () => clearInterval(intervalId);
  }, [isOpen, user]);

  // ============================================================================
  // OUVRIR / FERMER / MINIMISER
  // ============================================================================

  const openTantie = useCallback(() => {
    // [P0-1] Bloquer si le rôle est désactivé dans la config BO
    if (configRef.current.enabledForRoles.length > 0) {
      const currentRole = (user?.role as any) || '';
      if (currentRole && !configRef.current.enabledForRoles.includes(currentRole)) {
        toast.error('Tantie Sagesse est désactivée pour votre profil.');
        return;
      }
    }

    setIsOpen(true);
    setIsMinimized(false);

    setMessages(prev => {
      if (prev.length === 0 && sessionRef.current) {
        // Passer la config au buildWelcomeMessage pour respecter suggestionsRapidesEnabled
        const welcome = buildWelcomeMessage(sessionRef.current.context, configRef.current);

        const updated = addMessagesToSession(sessionRef.current, [welcome]);
        setSession(updated);
        sessionRef.current = updated;
        saveCurrentSession(updated);

        if (configRef.current.voiceEnabled && ttsSupported) {
          setTimeout(() => {
            speak(
              welcome.content,
              {
                rate:   configRef.current.speechRate,
                pitch:  configRef.current.speechPitch,
                volume: configRef.current.speechVolume,
                lang:   configRef.current.voiceLanguage,
              },
              () => setIsSpeaking(false)
            );
            setIsSpeaking(true);
          }, 600);
        }

        return [welcome];
      }
      return prev;
    });
  }, [ttsSupported, user?.role]);

  const closeTantie = useCallback(() => {
    stopSpeaking();
    stopListening();
    setIsOpen(false);
    setIsListening(false);
    setIsSpeaking(false);
    setInterim('');

    if (sessionRef.current && sessionRef.current.totalMessages > 0) {
      archiveSession(sessionRef.current);
      recordSessionInStats(sessionRef.current);
    }
  }, []);

  const minimizeTantie = useCallback(() => {
    setIsMinimized(prev => !prev);
    stopSpeaking();
  }, []);

  // ============================================================================
  // ENVOI DE MESSAGE [P0-1 guard rôle] [P0-2 guard race condition]
  // ============================================================================

  const sendMessage = useCallback(async (
    text: string,
    mode: 'text' | 'voice' = 'text'
  ) => {
    if (!text.trim() || !sessionRef.current) return;

    // [P0-1] Bloquer sendMessage si le rôle est désactivé
    const currentRole = (user?.role as any) || '';
    if (currentRole && !configRef.current.enabledForRoles.includes(currentRole)) {
      toast.error('Tantie Sagesse est désactivée pour votre profil.');
      return;
    }

    // [P0-2] Guard race condition — rejeter si déjà en cours de traitement
    if (isProcessing.current) return;
    isProcessing.current = true;

    // Vérifier la limite de messages par session
    if (sessionRef.current.totalMessages >= configRef.current.maxMessagesParSession) {
      toast.warning(`Session limitée à ${configRef.current.maxMessagesParSession} messages.`);
      isProcessing.current = false;
      return;
    }

    try {
      // 1. Parser + préparer le message loading
      const loadingMsg = buildLoadingMessage();

      // 2. Appel UNIQUE à processMessage — extrait userMessage, assistantMessage et response
      //    [BUGFIX] était appelé 2x → double log AILogService + double intent parse
      const { userMessage, assistantMessage, response } = processMessage(
        text,
        sessionRef.current.context,
        mode,
        configRef.current
      );

      setMessages(prev => [...prev, userMessage, loadingMsg]);
      setIsTyping(true);
      if (mode === 'voice') playFeedbackSound('send');

      // 3. Délai de traitement naturel (300-800ms) — simule la "réflexion"
      const delay = 300 + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));

      // 4. Remplacer le placeholder par la vraie réponse
      setMessages(prev => [
        ...prev.filter(m => m.id !== loadingMsg.id),
        assistantMessage,
      ]);
      setIsTyping(false);

      // 5. Mettre à jour la session
      const updated = addMessagesToSession(
        sessionRef.current,
        [userMessage, assistantMessage]
      );
      setSession(updated);
      sessionRef.current = updated;
      saveCurrentSession(updated);

      // 6. Synthèse vocale si activée
      if (configRef.current.voiceEnabled && response.shouldSpeak && ttsSupported) {
        speak(
          assistantMessage.content,
          {
            rate:   configRef.current.speechRate,
            pitch:  configRef.current.speechPitch,
            volume: configRef.current.speechVolume,
            lang:   configRef.current.voiceLanguage,
          },
          () => setIsSpeaking(false)
        );
        setIsSpeaking(true);
      }
    } catch (err) {
      setIsTyping(false);
      toast.error('Une erreur est survenue. Réessayez.');
    } finally {
      // [P0-2] Toujours libérer le verrou, même en cas d'erreur
      isProcessing.current = false;
    }
  }, [ttsSupported, user?.role]);

  // ============================================================================
  // VIDER LA CONVERSATION
  // ============================================================================

  const clearConversation = useCallback(() => {
    stopSpeaking();
    if (!sessionRef.current) return;

    const fresh = createSession(user || {});
    setSession(fresh);
    sessionRef.current = fresh;
    setMessages([]);
    saveCurrentSession(fresh);
  }, [user]);

  // ============================================================================
  // VOIX — ENTRÉE STT [P0-4 feedback erreur]
  // ============================================================================

  const startVoiceInput = useCallback(() => {
    if (!sttSupported) {
      // [P0-4] Feedback explicite si STT non supporté
      toast.error('Microphone non disponible sur cet appareil.');
      return;
    }
    stopSpeaking();
    setInterim('');

    playFeedbackSound('start');

    const started = startListening(
      (result) => {
        setInterim(result.transcript);
        if (result.isFinal && result.transcript.trim()) {
          stopListening();
          setIsListening(false);
          setInterim('');
          sendMessage(result.transcript, 'voice');
        }
      },
      (errCode) => {
        // [P0-4] Feedback erreur STT visible à l'utilisateur
        setIsListening(false);
        setInterim('');

        const errorMessages: Record<string, string> = {
          'not-allowed':      'Autorisation microphone refusée. Vérifiez les paramètres de votre navigateur.',
          'no-speech':        'Aucune voix détectée. Parlez plus près du microphone.',
          'network':          'Erreur réseau pour la reconnaissance vocale.',
          'audio-capture':    'Impossible d\'accéder au microphone.',
          'service-not-allowed': 'Service vocal non autorisé sur cette page.',
        };

        const userMsg = errorMessages[errCode] ?? `Erreur microphone : ${errCode}. Vérifiez les autorisations.`;
        toast.error(userMsg, { duration: 5000 });
      },
      () => {
        setIsListening(false);
      },
      config.voiceLanguage
    );

    if (started) {
      setIsListening(true);
    } else {
      // [P0-4] STT n'a pas pu démarrer
      toast.error('Microphone non disponible. Vérifiez les autorisations.');
    }
  }, [sttSupported, config.voiceLanguage, sendMessage]);

  const stopVoiceInput = useCallback(() => {
    stopListening();
    playFeedbackSound('stop');
    setIsListening(false);
    setInterim('');
  }, []);

  // ============================================================================
  // VOIX — SORTIE TTS
  // ============================================================================

  const toggleSpeak = useCallback((text: string) => {
    if (isSpeakingState) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speak(
        text,
        {
          rate:   config.speechRate,
          pitch:  config.speechPitch,
          volume: config.speechVolume,
          lang:   config.voiceLanguage,
        },
        () => setIsSpeaking(false)
      );
      setIsSpeaking(true);
    }
  }, [isSpeakingState, config]);

  const stopCurrentSpeech = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // ============================================================================
  // CONFIG BO
  // ============================================================================

  const updateConfig = useCallback((updates: Partial<TantieConfig>) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveConfig(updated);
      return updated;
    });
  }, []);

  // ============================================================================
  // ACTIONS RAPIDES — navigation via NavigationService [P0-3]
  // ============================================================================

  const executeAction = useCallback((action: TantieAction) => {
    if (!action.route) return;

    const role = user?.role || 'marchand';

    // Map des routes Tantie → routes React Router par rôle
    const ROUTE_MAP: Record<string, Record<string, string>> = {
      marchand: {
        '/stock':              '/marchand/stock',
        '/caisse':             '/marchand/caisse',
        '/wallet':             '/marchand/wallet',
        '/commandes':          '/marchand/commandes',
        '/marche':             '/marchand/marche',
        '/score':              '/marchand/score',
        '/academy':            '/marchand/academy',
        '/alertes':            '/marchand/alertes',
        '/moi':                '/marchand/profil',
        '/support':            '/marchand/support',
        '/commandes/nouvelle': '/marchand/commandes',
      },
      producteur: {
        '/recoltes':           '/producteur/recoltes',
        '/marche':             '/producteur/marche',
        '/commandes':          '/producteur/commandes',
        '/score':              '/producteur/score',
        '/wallet':             '/producteur/wallet',
        '/academy':            '/producteur/academy',
        '/alertes':            '/producteur/alertes',
        '/moi':                '/producteur/profil',
        '/support':            '/producteur/support',
        '/commandes/nouvelle': '/producteur/commandes',
      },
      cooperative: {
        '/cooperative':        '/cooperative',
        '/commandes':          '/cooperative/marche',
        '/marche':             '/cooperative/marche',
        '/wallet':             '/cooperative/wallet',
        '/score':              '/cooperative/score',
        '/academy':            '/cooperative/academy',
        '/alertes':            '/cooperative/alertes',
        '/moi':                '/cooperative/profil',
        '/support':            '/cooperative/support',
      },
      institution: {
        '/marche':             '/institution',
        '/alertes':            '/institution/alertes',
        '/moi':                '/institution/profil',
        '/support':            '/institution/support',
      },
      identificateur: {
        '/moi':                '/identificateur/profil',
        '/alertes':            '/identificateur/alertes',
        '/academy':            '/identificateur/academy',
        '/support':            '/identificateur/support',
      },
    };

    const roleRoutes = ROUTE_MAP[role] ?? ROUTE_MAP.marchand;
    const resolvedRoute = roleRoutes[action.route] ?? action.route;

    // [P0-3] NavigationService — compatible BrowserRouter, indépendant du contexte React Router
    NavigationService.navigate(resolvedRoute);
    setIsMinimized(true);
  }, [user?.role]);

  // ============================================================================
  // STATS
  // ============================================================================

  const refreshStats = useCallback(() => {
    setStats(computeStats());
  }, []);

  // ============================================================================
  // VALEUR DU CONTEXTE
  // ============================================================================

  const value: TantieContextType = {
    isOpen,
    isMinimized,
    session,
    messages,
    isTyping,
    isSpeaking: isSpeakingState,
    isListening,
    interimTranscript,
    contextAlerts,
    config,
    ttsSupported,
    sttSupported,
    stats,
    isBlocked,

    openTantie,
    closeTantie,
    minimizeTantie,
    sendMessage,
    clearConversation,

    startVoiceInput,
    stopVoiceInput,
    toggleSpeak,
    stopCurrentSpeech,

    updateConfig,
    executeAction,
    refreshStats,
  };

  return (
    <TantieContext.Provider value={value}>
      {children}
    </TantieContext.Provider>
  );
}

// ============================================================================
// HOOK D'ACCÈS
// ============================================================================

export function useTantie(): TantieContextType {
  const ctx = useContext(TantieContext);
  if (!ctx) {
    throw new Error('useTantie doit être utilisé dans un TantieProvider');
  }
  return ctx;
}