/**
 * TANTIE SAGESSE - Point d'entrée principal (v2 — branché sur TantieContext)
 *
 * Ce composant assemble la bulle flottante + la fenêtre de chat.
 * Il doit être placé UNE SEULE FOIS dans le layout global (AppLayout).
 *
 * Les anciennes props (isOpen, onClose, isVisible, isSpeaking) sont acceptées
 * mais ignorées pour la rétrocompatibilité — tout l'état est dans TantieContext.
 */

import React from 'react';
import { TantieBubble } from './TantieBubble';
import { TantieChatWindow } from './TantieChatWindow';

interface TantieSagesseProps {
  /** Mode flottant (défaut true) : FAB + fenêtre overlay */
  floating?: boolean;
  /** Callback optionnel pour actions navigables (rétrocompat v1) */
  onAction?: (action: string, data?: unknown) => void;
  /** @deprecated Ignoré — utiliser TantieContext.openTantie() */
  isOpen?: boolean;
  /** @deprecated Ignoré — utiliser TantieContext.closeTantie() */
  onClose?: () => void;
  /** @deprecated Ignoré */
  isVisible?: boolean;
  /** @deprecated Ignoré */
  isSpeaking?: boolean;
}

export function TantieSagesse({ floating = true }: TantieSagesseProps) {
  if (!floating) {
    return <TantieChatWindow />;
  }

  return (
    <>
      <TantieChatWindow />
      <TantieBubble />
    </>
  );
}
