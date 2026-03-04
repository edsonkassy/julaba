/**
 * TANTIE SAGESSE - Service de synthèse et reconnaissance vocale
 *
 * Gère deux directions :
 *   STT (Speech-to-Text) : microphone → texte (via Web Speech API)
 *   TTS (Text-to-Speech) : texte → voix Tantie (via SpeechSynthesis API)
 *
 * Conçu pour Android WebView et Chrome mobile.
 * Langue principale : fr-FR (le plus supporté, sonne naturel en ivoirien).
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SpeechConfig {
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voiceName?: string;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export type STTCallback = (result: STTResult) => void;
export type STTErrorCallback = (error: string) => void;

// ============================================================================
// CONFIG PAR DÉFAUT
// ============================================================================

export const DEFAULT_SPEECH_CONFIG: SpeechConfig = {
  lang: 'fr-FR',
  rate: 0.92,      // Légèrement ralenti pour accessibilité
  pitch: 1.05,     // Voix légèrement plus chaleureuse
  volume: 1.0,
};

// ============================================================================
// DÉTECTION DE SUPPORT
// ============================================================================

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSTTSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

// ============================================================================
// TEXT-TO-SPEECH (Tantie parle)
// ============================================================================

let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

/** Sélectionne la meilleure voix française disponible */
function selectBestVoice(lang: string): SpeechSynthesisVoice | null {
  if (!isTTSSupported()) return null;

  useEffect(() => {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    console.log(voices);
  }
}, []);

  // Priorité : voix française locale, puis voix française en ligne
  const priorities = [
    (v: SpeechSynthesisVoice) => v.lang === 'fr-FR' && v.localService,
    (v: SpeechSynthesisVoice) => v.lang === 'fr-FR',
    (v: SpeechSynthesisVoice) => v.lang.startsWith('fr'),
    (v: SpeechSynthesisVoice) => v.lang.startsWith(lang.split('-')[0]),
  ];

  for (const check of priorities) {
    const found = voices.find(check);
    if (found) return found;
  }

  return voices[0] || null;
}

/** Prépare les voix (nécessaire sur Chrome — chargement asynchrone) */
export function preloadVoices(): Promise<void> {
  return new Promise(resolve => {
    if (!isTTSSupported()) { resolve(); return; }

    useEffect(() => {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    console.log(voices);
  }
}, []);
    if (voices.length > 0) { resolve(); return; }

    window.speechSynthesis.onvoiceschanged = () => resolve();
    // Timeout de sécurité
    setTimeout(resolve, 1500);
  });
}

/** Fait parler Tantie Sagesse */
export function speak(
  text: string,
  config: Partial<SpeechConfig> = {},
  onEnd?: () => void,
  onError?: (err: string) => void
): void {
  if (!isTTSSupported() || !text.trim()) {
    onEnd?.();
    return;
  }

  // Arrêter toute parole en cours
  stopSpeaking();

  const cfg = { ...DEFAULT_SPEECH_CONFIG, ...config };

  // Nettoyer le texte (supprimer les emojis potentiels, balises)
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang   = cfg.lang;
  utterance.rate   = cfg.rate;
  utterance.pitch  = cfg.pitch;
  utterance.volume = cfg.volume;

  const voice = selectBestVoice(cfg.lang);
  if (voice) utterance.voice = voice;

  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = (event) => {
    isSpeaking = false;
    currentUtterance = null;
    // 'interrupted' n'est pas une vraie erreur
    if (event.error !== 'interrupted' && event.error !== 'canceled') {
      onError?.(`Erreur TTS : ${event.error}`);
    } else {
      onEnd?.();
    }
  };

  currentUtterance = utterance;
  isSpeaking = true;
  window.speechSynthesis.speak(utterance);
}

/** Arrête la parole en cours */
export function stopSpeaking(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    currentUtterance = null;
  }
}

/** Pause la parole */
export function pauseSpeaking(): void {
  if (isTTSSupported() && isSpeaking) {
    window.speechSynthesis.pause();
  }
}

/** Reprend la parole */
export function resumeSpeaking(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.resume();
  }
}

export function getIsSpeaking(): boolean {
  return isSpeaking;
}

// ============================================================================
// SPEECH-TO-TEXT (l'utilisateur parle à Tantie)
// ============================================================================

type SpeechRecognitionInstance = any;

let recognitionInstance: SpeechRecognitionInstance = null;
let isRecognizing = false;

function getSpeechRecognitionClass(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/** Démarre l'écoute microphone */
export function startListening(
  onResult: STTCallback,
  onError: STTErrorCallback,
  onEnd: () => void,
  lang = 'fr-FR'
): boolean {
  const SpeechRecognition = getSpeechRecognitionClass();
  if (!SpeechRecognition) {
    onError('Reconnaissance vocale non supportée sur cet appareil.');
    return false;
  }

  // Arrêter l'instance précédente
  stopListening();

  try {
    recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = lang;
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      onResult({ transcript, confidence, isFinal });
    };

    recognitionInstance.onerror = (event: any) => {
      isRecognizing = false;
      const msgs: Record<string, string> = {
        'no-speech':       'Aucune parole détectée. Parlez plus fort.',
        'audio-capture':   'Microphone inaccessible. Vérifiez les permissions.',
        'not-allowed':     'Accès au microphone refusé.',
        'network':         'Erreur réseau lors de la reconnaissance.',
        'aborted':         '',
      };
      const msg = msgs[event.error] ?? `Erreur : ${event.error}`;
      if (msg) onError(msg);
    };

    recognitionInstance.onend = () => {
      isRecognizing = false;
      onEnd();
    };

    recognitionInstance.start();
    isRecognizing = true;
    return true;

  } catch (err) {
    isRecognizing = false;
    onError('Impossible de démarrer le microphone.');
    return false;
  }
}

/** Arrête l'écoute microphone */
export function stopListening(): void {
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (_) {}
    recognitionInstance = null;
    isRecognizing = false;
  }
}

export function getIsRecognizing(): boolean {
  return isRecognizing;
}

// ============================================================================
// PHRASES D'ATTENTE (feedback visuel pendant le traitement)
// ============================================================================

const PHRASES_ATTENTE = [
  'Je réfléchis...',
  'Un instant...',
  'Je cherche la meilleure réponse...',
  'Laissez-moi vérifier...',
  'Je consulte mes informations...',
];

export function getPhraseAttente(): string {
  return PHRASES_ATTENTE[Math.floor(Math.random() * PHRASES_ATTENTE.length)];
}

// ============================================================================
// SONS DE FEEDBACK (courts beeps via AudioContext)
// ============================================================================

export function playFeedbackSound(type: 'start' | 'stop' | 'send'): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const configs = {
      start: { freq: 660, duration: 0.12, gain: 0.15 },
      stop:  { freq: 440, duration: 0.10, gain: 0.10 },
      send:  { freq: 880, duration: 0.08, gain: 0.12 },
    };

    const cfg = configs[type];
    oscillator.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(cfg.gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + cfg.duration);

    setTimeout(() => ctx.close(), 500);
  } catch (_) {
    // Silencieux si AudioContext non disponible
  }
}
