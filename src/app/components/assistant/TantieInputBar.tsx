/**
 * TANTIE SAGESSE - Barre de saisie
 *
 * Gère l'entrée texte ET vocale :
 * - Champ texte avec envoi sur Entrée
 * - Bouton microphone avec animation d'écoute
 * - Affichage du transcript intermédiaire (STT)
 * - Suggestions de questions rapides
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MicOff, Sparkles } from 'lucide-react';
import { useTantie } from '../../hooks/useTantie';

const TANTIE_COLOR = '#7C3AED';

// ============================================================================
// SUGGESTIONS SELON LE RÔLE
// ============================================================================

const SUGGESTIONS_PAR_ROLE: Record<string, string[]> = {
  marchand:      ['Quel est mon stock ?', 'Bilan du jour ?', 'Prix du marché ?', 'Mon wallet ?'],
  producteur:    ['Mes récoltes ?', 'Publier une récolte', 'Prix du maïs ?', 'Mon score ?'],
  cooperative:   ['Ma trésorerie ?', 'Membres actifs ?', 'Commandes groupées ?'],
  institution:   ['KPIs du mois ?', 'Alertes actives ?', 'Stats utilisateurs ?'],
  identificateur:['Mes fiches ?', 'Géolocalisation ?', 'Procédure KYC ?'],
};

// ============================================================================
// ONDES SONORES (animation micro actif)
// ============================================================================

function SoundWaves() {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-red-400"
          animate={{ height: [4, 18, 4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

interface TantieInputBarProps {
  disabled?: boolean;
}

export function TantieInputBar({ disabled }: TantieInputBarProps) {
  const {
    sendMessage,
    startVoiceInput,
    stopVoiceInput,
    isListening,
    isTyping,
    interimTranscript,
    sttSupported,
    session,
  } = useTantie();

  const [text, setText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role = session?.role ?? 'marchand';
  const suggestions = SUGGESTIONS_PAR_ROLE[role] ?? SUGGESTIONS_PAR_ROLE.marchand;

  // Auto-focus à l'ouverture
  useEffect(() => {
    if (!disabled) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [disabled]);

  // Remplir le champ avec le transcript intermédiaire
  useEffect(() => {
    if (interimTranscript) {
      setText(interimTranscript);
    }
  }, [interimTranscript]);

  const handleSend = () => {
    const msg = text.trim();
    if (!msg || disabled || isTyping) return;
    setText('');
    setShowSuggestions(false);
    sendMessage(msg, 'text');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (s: string) => {
    setShowSuggestions(false);
    sendMessage(s, 'text');
  };

  const handleMic = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      setText('');
      startVoiceInput();
    }
  };

  const canSend = text.trim().length > 0 && !isTyping && !disabled;

  return (
    <div className="flex flex-col gap-2">

      {/* Suggestions rapides */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => setShowSuggestions(false)}
              className="flex-shrink-0 p-1"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
            </button>
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="flex-shrink-0 px-3 py-1.5 rounded-2xl border-2 text-xs font-semibold whitespace-nowrap transition-all"
                style={{ borderColor: '#DDD6FE', color: '#7C3AED', background: '#F5F3FF' }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.95 }}
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicateur d'écoute intermédiaire */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            className="flex items-center gap-3 px-4 py-2 rounded-2xl border-2 border-red-200 bg-red-50"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <SoundWaves />
            <p className="text-xs text-red-600 font-semibold flex-1 truncate">
              {interimTranscript || "J'écoute... Parlez maintenant"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de saisie principale */}
      <div
        className="flex items-end gap-2 rounded-3xl border-2 px-3 py-2 transition-all"
        style={{
          borderColor: isListening ? '#FCA5A5' : text.length > 0 ? TANTIE_COLOR : '#E5E7EB',
          background: '#FFFFFF',
          boxShadow: text.length > 0 ? `0 0 0 3px ${TANTIE_COLOR}18` : undefined,
        }}
      >
        {/* Textarea auto-resize */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => {
            setText(e.target.value);
            if (e.target.value.length > 0) setShowSuggestions(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'En écoute...' : 'Posez votre question à Tantie...'}
          disabled={disabled || isListening}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed"
          style={{ maxHeight: 120 }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />

        {/* Bouton microphone */}
        {sttSupported && (
          <motion.button
            onClick={handleMic}
            disabled={disabled}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-2xl transition-all"
            style={{
              background: isListening
                ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
                : '#F3F4F6',
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            animate={isListening ? { scale: [1, 1.08, 1] } : {}}
            transition={isListening ? { duration: 1, repeat: Infinity } : {}}
            title={isListening ? 'Arrêter' : 'Parler'}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-gray-500" />
            )}
          </motion.button>
        )}

        {/* Bouton envoyer */}
        <motion.button
          onClick={handleSend}
          disabled={!canSend}
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-2xl transition-all"
          style={{
            background: canSend
              ? 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)'
              : '#F3F4F6',
          }}
          whileHover={canSend ? { scale: 1.08 } : {}}
          whileTap={canSend ? { scale: 0.92 } : {}}
          title="Envoyer"
        >
          <Send className={`w-4 h-4 ${canSend ? 'text-white' : 'text-gray-400'}`} />
        </motion.button>
      </div>

      {/* Tip clavier */}
      {!isListening && text.length === 0 && (
        <p className="text-center text-gray-400" style={{ fontSize: 10 }}>
          Entrée pour envoyer — Maj+Entrée pour sauter une ligne
        </p>
      )}
    </div>
  );
}
