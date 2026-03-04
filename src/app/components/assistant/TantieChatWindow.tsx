/**
 * TANTIE SAGESSE - Fenêtre de chat principale
 *
 * Interface conversationnelle complète :
 * - Header avec avatar, état, options
 * - Zone de messages scrollable avec auto-scroll
 * - Alertes proactives en haut
 * - Barre de saisie en bas
 * - Animations fluides
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, Trash2, Volume2, VolumeX,
  AlertTriangle, ChevronRight, Wifi, WifiOff,
  Minimize2,
} from 'lucide-react';
import { useTantie } from '../../hooks/useTantie';
import { TantieMessageBubble } from './TantieMessageBubble';
import { TantieInputBar } from './TantieInputBar';
import tantieSagesseImg from 'figma:asset/c57c6b035a1cf2a547f2ddf8ab7ca6884bc3980e.png';

const TANTIE_GRADIENT = 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #A855F7 100%)';
const TANTIE_COLOR    = '#7C3AED';

// ============================================================================
// BADGE ÉTAT VOCAL
// ============================================================================

function VoiceBadge({ isSpeaking, isListening }: { isSpeaking: boolean; isListening: boolean }) {
  if (isListening) {
    return (
      <motion.div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500"
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
        <span className="text-white" style={{ fontSize: 10, fontWeight: 600 }}>ÉCOUTE</span>
      </motion.div>
    );
  }
  if (isSpeaking) {
    return (
      <motion.div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500"
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        <Volume2 className="w-3 h-3 text-white" />
        <span className="text-white" style={{ fontSize: 10, fontWeight: 600 }}>PARLE</span>
      </motion.div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      <span className="text-white/80" style={{ fontSize: 10, fontWeight: 600 }}>EN LIGNE</span>
    </div>
  );
}

// ============================================================================
// CARTE ALERTE PROACTIVE
// ============================================================================

function AlerteCard({ severity, message, actionRoute }: {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  actionRoute?: string;
}) {
  const { executeAction } = useTantie();
  const styles = {
    critical: { bg: '#FEF2F2', border: '#FCA5A5', text: '#DC2626', icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} /> },
    warning:  { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} /> },
    info:     { bg: '#EFF6FF', border: '#93C5FD', text: '#1E40AF', icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#3B82F6' }} /> },
  }[severity];

  const handleClick = () => {
    if (!actionRoute) return;
    // [P0-3] NavigationService via executeAction — plus window.location.hash
    executeAction({ id: 'alerte-nav', label: message, icon: 'AlertTriangle', route: actionRoute });
  };

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded-2xl border-2 cursor-pointer"
      style={{ background: styles.bg, borderColor: styles.border }}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {styles.icon}
      <p className="flex-1 text-xs font-semibold" style={{ color: styles.text }}>{message}</p>
      {actionRoute && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: styles.text }} />}
    </motion.div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function TantieChatWindow() {
  const {
    isOpen,
    isMinimized,
    messages,
    isTyping,
    isSpeaking,
    isListening,
    contextAlerts,
    config,
    closeTantie,
    minimizeTantie,
    clearConversation,
    stopCurrentSpeech,
    ttsSupported,
    updateConfig,
  } = useTantie();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  // Auto-scroll vers le bas quand nouveaux messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length, isTyping]);

  if (!isOpen) return null;

  const critiques = contextAlerts.filter(a => a.severity === 'critical');
  const warnings  = contextAlerts.filter(a => a.severity === 'warning');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="chat-window"
          className="fixed bottom-28 right-4 z-50"
          style={{ width: 'min(92vw, 420px)' }}
          initial={{ opacity: 0, y: 60, scale: 0.88 }}
          animate={isMinimized
            ? { opacity: 1, y: 0, scale: 1, height: 64 }
            : { opacity: 1, y: 0, scale: 1 }
          }
          exit={{ opacity: 0, y: 60, scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div
            className="flex flex-col rounded-3xl border-2 shadow-2xl overflow-hidden"
            style={{
              borderColor: '#DDD6FE',
              background: '#FFFFFF',
              maxHeight: isMinimized ? 64 : 'min(80vh, 620px)',
            }}
          >
            {/* ====== HEADER ====== */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0 relative overflow-hidden"
              style={{ background: TANTIE_GRADIENT }}
            >
              {/* Shimmer */}
              <motion.div
                className="absolute inset-0 bg-white/10"
                style={{ skewX: '-20deg', width: '30%' }}
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
              />

              {/* Avatar */}
              <motion.div
                className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-white/60 shadow-lg"
                animate={isSpeaking ? { scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <img src={tantieSagesseImg} alt="Tantie Sagesse" className="w-full h-full object-cover" />
              </motion.div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-none truncate">
                  {config.nom}
                </p>
                <div className="mt-1">
                  <VoiceBadge isSpeaking={isSpeaking} isListening={isListening} />
                </div>
              </div>

              {/* Actions header */}
              <div className="flex items-center gap-1 relative">
                {/* Options */}
                <motion.button
                  onClick={() => setShowOptions(s => !s)}
                  className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-4 h-4 text-white/80" />
                </motion.button>

                {/* Voix toggle */}
                {ttsSupported && (
                  <motion.button
                    onClick={() => {
                      if (isSpeaking) stopCurrentSpeech();
                      else updateConfig({ voiceEnabled: !config.voiceEnabled });
                    }}
                    className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
                    whileTap={{ scale: 0.9 }}
                  >
                    {config.voiceEnabled
                      ? <Volume2 className="w-4 h-4 text-white" />
                      : <VolumeX className="w-4 h-4 text-white/50" />
                    }
                  </motion.button>
                )}

                {/* Minimiser */}
                <motion.button
                  onClick={minimizeTantie}
                  className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <Minimize2 className="w-4 h-4 text-white/80" />
                </motion.button>

                {/* Fermer */}
                <motion.button
                  onClick={closeTantie}
                  className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronDown className="w-4 h-4 text-white" />
                </motion.button>

                {/* Menu options */}
                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      className="absolute top-10 right-0 bg-white rounded-2xl border-2 border-purple-100 shadow-xl p-2 z-10 w-44"
                      initial={{ opacity: 0, scale: 0.9, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6 }}
                    >
                      <button
                        onClick={() => { clearConversation(); setShowOptions(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Effacer la conversation
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ====== CORPS (masqué si minimisé) ====== */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  className="flex flex-col flex-1 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Alertes proactives */}
                  {(critiques.length > 0 || warnings.length > 0) && showAlerts && (
                    <div className="px-3 pt-3 flex flex-col gap-1.5 flex-shrink-0">
                      {critiques.map((a, i) => (
                        <AlerteCard key={i} {...a} />
                      ))}
                      {warnings.slice(0, 2).map((a, i) => (
                        <AlerteCard key={i} {...a} />
                      ))}
                      <button
                        onClick={() => setShowAlerts(false)}
                        className="text-xs text-gray-400 text-right pr-1"
                      >
                        Masquer les alertes
                      </button>
                    </div>
                  )}

                  {/* Zone messages */}
                  <div
                    className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
                    style={{ minHeight: 0 }}
                    onClick={() => setShowOptions(false)}
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((msg, idx) => (
                        <TantieMessageBubble
                          key={msg.id}
                          message={msg}
                          isLast={idx === messages.length - 1}
                        />
                      ))}
                    </AnimatePresence>

                    {/* Indicateur "Tantie tape..." */}
                    <AnimatePresence>
                      {isTyping && (
                        <motion.div
                          key="typing"
                          className="flex items-center gap-2 pl-10"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                        >
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-purple-300"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-purple-400 font-medium">
                            Tantie réfléchit...
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Séparateur */}
                  <div className="h-px bg-purple-100 flex-shrink-0 mx-3" />

                  {/* Barre de saisie */}
                  <div className="px-3 py-3 flex-shrink-0 bg-white">
                    <TantieInputBar disabled={false} />
                  </div>

                  {/* Footer */}
                  <div
                    className="flex items-center justify-center gap-1.5 py-1.5 flex-shrink-0"
                    style={{ background: '#F5F3FF' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <p className="text-purple-500" style={{ fontSize: 10, fontWeight: 600 }}>
                      Tantie Sagesse — Assistant IA Jùlaba
                    </p>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}