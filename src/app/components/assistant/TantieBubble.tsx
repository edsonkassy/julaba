/**
 * TANTIE SAGESSE - Bulle flottante (FAB)
 *
 * Le bouton flottant qui ouvre/ferme Tantie Sagesse.
 * Affiché en permanence en bas à droite de l'écran sur tous les profils.
 * Badge rouge si alertes critiques.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, MessageCircle } from 'lucide-react';
import { useTantieExtended } from '../../hooks/useTantie';
import tantieSagesseImg from '../../../assets/c57c6b035a1cf2a547f2ddf8ab7ca6884bc3980e.png';

// Couleur signature de Tantie Sagesse
const TANTIE_COLOR = '#7C3AED';

export function TantieBubble() {
  const {
    isOpen,
    isMinimized,
    openTantie,
    closeTantie,
    hasCriticalAlerts,
    criticalAlertsCount,
    isSpeaking,
    isListening,
    isBlocked,
  } = useTantieExtended();

  const isActive = isOpen && !isMinimized;

  // [P0-1] Masquer la FAB si le rôle est désactivé dans la config BO
  if (isBlocked) return null;

  return (
    <div className="fixed bottom-28 right-4 z-50 flex flex-col items-end gap-2">

      {/* Bulle principale */}
      <motion.button
        onClick={isActive ? closeTantie : openTantie}
        className="relative flex items-center justify-center rounded-full shadow-2xl overflow-visible"
        style={{
          width: 64,
          height: 64,
          background: isActive
            ? 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)'
            : 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        aria-label={isActive ? 'Fermer Tantie Sagesse' : 'Ouvrir Tantie Sagesse'}
      >
        {/* Avatar ou icône X */}
        <AnimatePresence mode="wait">
          {isActive ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-7 h-7 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="avatar"
              className="w-full h-full rounded-full overflow-hidden"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src={tantieSagesseImg}
                alt="Tantie Sagesse"
                className="w-full h-full object-cover"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anneau d'écoute (STT actif) */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-red-400"
            animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0, 0.9] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Anneau de parole (TTS actif) */}
        {isSpeaking && !isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-purple-300"
            animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Anneau d'invitation (inactif) */}
        {!isActive && !isSpeaking && !isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-3 border-purple-400"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Badge alertes critiques */}
        <AnimatePresence>
          {hasCriticalAlerts && !isActive && (
            <motion.div
              key="badge"
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 border-2 border-white flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <span className="text-white text-xs leading-none" style={{ fontSize: 10 }}>
                {criticalAlertsCount > 9 ? '9+' : criticalAlertsCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicateur "Sparkle" quand fermé et calme */}
        {!isActive && !hasCriticalAlerts && (
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </motion.div>
        )}
      </motion.button>

      {/* Label contextuel au premier survol */}
      {!isActive && (
        <motion.div
          className="absolute right-16 bottom-4 pointer-events-none"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2, duration: 0.4 }}
        >
          <div
            className="px-3 py-1.5 rounded-2xl text-white shadow-lg whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-3 h-3" />
              <span>Tantie Sagesse</span>
            </div>
          </div>
          {/* Flèche pointant vers le bouton */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-0 h-0"
            style={{
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '6px solid #A855F7',
            }}
          />
        </motion.div>
      )}
    </div>
  );
}