/**
 * TANTIE SAGESSE - Bulle de message individuelle
 *
 * Affiche un message user ou assistant avec :
 * - Couleur et icône selon l'émotion
 * - Actions rapides cliquables
 * - Animation d'entrée
 * - Bouton lecture vocale
 * - Indicateur de chargement animé (dots)
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Volume2, VolumeX, ArrowRight,
  CheckCircle, AlertTriangle, Info,
  HelpCircle, Star, Heart, Lightbulb,
} from 'lucide-react';
import { useTantie } from '../../hooks/useTantie';
import tantieSagesseImg from '../../../assets/c57c6b035a1cf2a547f2ddf8ab7ca6884bc3980e.png';
import type { TantieMessage, TantieEmotion, TantieAction } from '../../types/tantie.types';

// ============================================================================
// CONFIGURATION ÉMOTIONS
// ============================================================================

interface EmotionStyle {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
  accent: string;
}

function getEmotionStyle(emotion?: TantieEmotion): EmotionStyle {
  switch (emotion) {
    case 'ALERTE':
      return {
        bg: '#FEF2F2', border: '#FCA5A5', text: '#DC2626',
        accent: '#EF4444',
        icon: <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />,
      };
    case 'ENCOURAGE':
      return {
        bg: '#F0FDF4', border: '#86EFAC', text: '#166534',
        accent: '#10B981',
        icon: <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />,
      };
    case 'CELEBRE':
      return {
        bg: '#FFFBEB', border: '#FCD34D', text: '#92400E',
        accent: '#F59E0B',
        icon: <Star className="w-4 h-4" style={{ color: '#F59E0B' }} />,
      };
    case 'QUESTION':
      return {
        bg: '#F5F3FF', border: '#C4B5FD', text: '#5B21B6',
        accent: '#8B5CF6',
        icon: <HelpCircle className="w-4 h-4" style={{ color: '#8B5CF6' }} />,
      };
    case 'CONSOLIDE':
      return {
        bg: '#F9FAFB', border: '#D1D5DB', text: '#374151',
        accent: '#6B7280',
        icon: <Heart className="w-4 h-4" style={{ color: '#6B7280' }} />,
      };
    case 'SAGE':
      return {
        bg: '#EEF2FF', border: '#A5B4FC', text: '#3730A3',
        accent: '#6366F1',
        icon: <Lightbulb className="w-4 h-4" style={{ color: '#6366F1' }} />,
      };
    case 'INFO':
    default:
      return {
        bg: '#EFF6FF', border: '#93C5FD', text: '#1E40AF',
        accent: '#3B82F6',
        icon: <Info className="w-4 h-4" style={{ color: '#3B82F6' }} />,
      };
  }
}

// ============================================================================
// DOTS DE CHARGEMENT
// ============================================================================

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-purple-400"
          animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// ACTION RAPIDE
// ============================================================================

function QuickAction({ action, onExecute }: { action: TantieAction; onExecute: (a: TantieAction) => void }) {
  return (
    <motion.button
      onClick={() => onExecute(action)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 text-xs font-semibold transition-all"
      style={{ borderColor: '#7C3AED', color: '#7C3AED', background: '#F5F3FF' }}
      whileHover={{ scale: 1.04, background: '#EDE9FE' }}
      whileTap={{ scale: 0.96 }}
    >
      <span>{action.label}</span>
      <ArrowRight className="w-3 h-3 flex-shrink-0" />
    </motion.button>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

interface TantieMessageBubbleProps {
  message: TantieMessage;
  isLast?: boolean;
}

export function TantieMessageBubble({ message, isLast }: TantieMessageBubbleProps) {
  const { toggleSpeak, isSpeaking, executeAction } = useTantie();
  const [speakingThis, setSpeakingThis] = useState(false);

  const isUser      = message.role === 'user';
  const isLoading   = message.isLoading;
  const emotion     = message.emotion;
  const emotionStyle = getEmotionStyle(emotion);

  const handleSpeak = () => {
    setSpeakingThis(s => !s);
    toggleSpeak(message.content);
  };

  return (
    <motion.div
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, y: 14, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      {/* Avatar Tantie (uniquement pour les messages assistant) */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm self-end">
          <img
            src={tantieSagesseImg}
            alt="Tantie Sagesse"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Bulle message */}
      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Icône émotion (assistant seulement) */}
        {!isUser && !isLoading && emotion && emotion !== 'INFO' && (
          <motion.div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold self-start"
            style={{ background: emotionStyle.bg, color: emotionStyle.text }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {emotionStyle.icon}
          </motion.div>
        )}

        {/* Contenu principal */}
        <div
          className="rounded-3xl px-4 py-3 shadow-sm"
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                  color: '#FFFFFF',
                  borderBottomRightRadius: 8,
                }
              : isLoading
              ? {
                  background: '#F5F3FF',
                  border: '2px solid #DDD6FE',
                  borderBottomLeftRadius: 8,
                }
              : {
                  background: emotionStyle.bg,
                  border: `2px solid ${emotionStyle.border}`,
                  color: '#111827',
                  borderBottomLeftRadius: 8,
                }
          }
        >
          {isLoading ? (
            <LoadingDots />
          ) : (
            <p className="text-sm leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Actions rapides (assistant seulement) */}
        {!isUser && !isLoading && message.actions && message.actions.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-1.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {message.actions.map(action => (
              <QuickAction
                key={action.id}
                action={action}
                onExecute={executeAction}
              />
            ))}
          </motion.div>
        )}

        {/* Bouton lecture + heure */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isUser && !isLoading && message.content && (
            <motion.button
              onClick={handleSpeak}
              className="flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all"
              style={{
                borderColor: isSpeaking && speakingThis ? '#7C3AED' : '#DDD6FE',
                background: isSpeaking && speakingThis ? '#7C3AED' : 'transparent',
              }}
              whileTap={{ scale: 0.88 }}
              title="Lire à voix haute"
            >
              {isSpeaking && speakingThis ? (
                <VolumeX className="w-3 h-3 text-white" />
              ) : (
                <Volume2 className="w-3 h-3 text-purple-400" />
              )}
            </motion.button>
          )}
          <span className="text-gray-400" style={{ fontSize: 10 }}>
            {new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
