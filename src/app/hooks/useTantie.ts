/**
 * TANTIE SAGESSE - Hook utilitaire simplifié
 *
 * Re-exporte useTantie depuis TantieContext avec des helpers
 * supplémentaires pratiques pour les composants UI.
 */

export { useTantie } from '../contexts/TantieContext';

import { useMemo } from 'react';
import { useTantie } from '../contexts/TantieContext';
import type { TantieMessage, TantieEmotion } from '../types/tantie.types';

// ============================================================================
// HOOK ÉTENDU — pour les composants qui ont besoin de plus
// ============================================================================

export function useTantieExtended() {
  const tantie = useTantie();

  // Nombre de messages non vus (depuis la dernière ouverture)
  const unreadCount = useMemo(() => {
    if (tantie.isOpen) return 0;
    return tantie.messages.filter(m => m.role === 'assistant').length;
  }, [tantie.messages, tantie.isOpen]);

  // Dernier message assistant
  const lastAssistantMessage = useMemo((): TantieMessage | null => {
    const assistantMsgs = tantie.messages.filter(m => m.role === 'assistant' && !m.isLoading);
    return assistantMsgs[assistantMsgs.length - 1] ?? null;
  }, [tantie.messages]);

  // Couleur selon l'émotion de Tantie
  const emotionColor = useMemo((): string => {
    const emotion = lastAssistantMessage?.emotion;
    const colors: Record<TantieEmotion, string> = {
      ENCOURAGE:  '#10B981', // vert
      ALERTE:     '#EF4444', // rouge
      INFO:       '#3B82F6', // bleu
      QUESTION:   '#8B5CF6', // violet
      CELEBRE:    '#F59E0B', // or
      CONSOLIDE:  '#6B7280', // gris
      SAGE:       '#7C3AED', // violet foncé
    };
    return emotion ? colors[emotion] : '#7C3AED';
  }, [lastAssistantMessage]);

  // Vrai si Tantie a des alertes critiques pour l'utilisateur
  const hasCriticalAlerts = useMemo(() => {
    return tantie.contextAlerts.some(a => a.severity === 'critical');
  }, [tantie.contextAlerts]);

  // Nombre d'alertes critiques
  const criticalAlertsCount = useMemo(() => {
    return tantie.contextAlerts.filter(a => a.severity === 'critical').length;
  }, [tantie.contextAlerts]);

  return {
    ...tantie,
    unreadCount,
    lastAssistantMessage,
    emotionColor,
    hasCriticalAlerts,
    criticalAlertsCount,
  };
}

// ============================================================================
// HOOK VOIX SEUL — pour les composants qui n'ont besoin que de la voix
// ============================================================================

export function useTantieVoice() {
  const {
    isSpeaking,
    isListening,
    interimTranscript,
    ttsSupported,
    sttSupported,
    startVoiceInput,
    stopVoiceInput,
    toggleSpeak,
    stopCurrentSpeech,
    config,
  } = useTantie();

  return {
    isSpeaking,
    isListening,
    interimTranscript,
    ttsSupported,
    sttSupported,
    startVoiceInput,
    stopVoiceInput,
    toggleSpeak,
    stopCurrentSpeech,
    voiceEnabled: config.voiceEnabled,
  };
}

// ============================================================================
// HOOK CONFIG SEUL — pour le BackOffice
// ============================================================================

export function useTantieConfig() {
  const { config, updateConfig, stats, refreshStats } = useTantie();

  return {
    config,
    updateConfig,
    stats,
    refreshStats,
  };
}
