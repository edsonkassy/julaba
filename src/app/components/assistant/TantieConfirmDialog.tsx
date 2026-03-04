/**
 * TANTIE SAGESSE — TantieConfirmDialog
 *
 * Modal de confirmation pour les actions critiques déclenchées par l'IA.
 * Consomme ConfirmationManager en Phase 3 (TRANSFER, DELETE, VALIDATE, etc.)
 *
 * En Phase 2 : utilisé seulement manuellement si besoin.
 * En Phase 3 : déclenché automatiquement quand checkConfirmationRequired() = true.
 *
 * Design : rounded-3xl, border-2, gradient, animations Motion — conforme UI Jùlaba.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, CheckCircle, X, ShieldAlert,
  Trash2, CreditCard, UserCog, CheckSquare, Ban,
} from 'lucide-react';
import type { CriticalActionType } from '../../services/tantieSagesse/ConfirmationManager';

// ============================================================================
// CONFIGURATION PAR TYPE D'ACTION CRITIQUE
// ============================================================================

interface ActionConfig {
  label:     string;
  icon:      React.ReactNode;
  color:     string;       // couleur principale
  gradient:  string;       // gradient du bouton de confirmation
  confirmLabel: string;    // texte bouton OUI
  cancelLabel:  string;    // texte bouton NON
}

const ACTION_CONFIG: Record<CriticalActionType, ActionConfig> = {
  DELETE: {
    label:        'Suppression définitive',
    icon:         <Trash2 className="w-6 h-6" />,
    color:        '#EF4444',
    gradient:     'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
    confirmLabel: 'Oui, supprimer',
    cancelLabel:  'Annuler',
  },
  SUSPEND: {
    label:        'Suspension de compte',
    icon:         <Ban className="w-6 h-6" />,
    color:        '#F97316',
    gradient:     'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
    confirmLabel: 'Oui, suspendre',
    cancelLabel:  'Annuler',
  },
  MODIFY_USER: {
    label:        'Modification de données',
    icon:         <UserCog className="w-6 h-6" />,
    color:        '#3B82F6',
    gradient:     'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
    confirmLabel: 'Confirmer',
    cancelLabel:  'Annuler',
  },
  TRANSFER: {
    label:        'Virement Wallet',
    icon:         <CreditCard className="w-6 h-6" />,
    color:        '#8B5CF6',
    gradient:     'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
    confirmLabel: 'Confirmer le virement',
    cancelLabel:  'Annuler',
  },
  VALIDATE: {
    label:        'Validation définitive',
    icon:         <CheckSquare className="w-6 h-6" />,
    color:        '#10B981',
    gradient:     'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    confirmLabel: 'Valider définitivement',
    cancelLabel:  'Annuler',
  },
};

// ============================================================================
// PROPS
// ============================================================================

export interface TantieConfirmDialogProps {
  /** Visible ou non */
  isOpen:         boolean;
  /** Type d'action critique */
  actionType:     CriticalActionType;
  /** Message d'avertissement spécifique (depuis ConfirmationManager) */
  warningMessage: string;
  /** Libellé optionnel de l'objet concerné (ex: "stock de tomates") */
  targetLabel?:   string;
  /** Callback si l'utilisateur confirme */
  onConfirm:      () => void;
  /** Callback si l'utilisateur refuse */
  onCancel:       () => void;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function TantieConfirmDialog({
  isOpen,
  actionType,
  warningMessage,
  targetLabel,
  onConfirm,
  onCancel,
}: TantieConfirmDialogProps) {
  const cfg = ACTION_CONFIG[actionType];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm bg-white rounded-3xl border-2 shadow-2xl overflow-hidden"
              style={{ borderColor: cfg.color }}
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header coloré */}
              <div
                className="px-6 py-5 flex items-center gap-4"
                style={{ background: `${cfg.color}14` }}
              >
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.gradient }}
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <span style={{ color: '#fff' }}>{cfg.icon}</span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-base leading-tight">
                    {cfg.label}
                  </p>
                  {targetLabel && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      Cible : {targetLabel}
                    </p>
                  )}
                </div>
                <motion.button
                  onClick={onCancel}
                  className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 hover:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4 text-gray-400" />
                </motion.button>
              </div>

              {/* Corps */}
              <div className="px-6 py-5 space-y-4">
                {/* Icône alerte + message */}
                <div className="flex items-start gap-3 p-4 rounded-2xl border-2"
                  style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}08` }}>
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                  <p className="text-sm text-gray-700 font-semibold leading-relaxed">
                    {warningMessage}
                  </p>
                </div>

                {/* Note "Tantie Sagesse" */}
                <p className="text-xs text-gray-400 text-center px-2">
                  Tantie Sagesse vous demande de confirmer avant de continuer.
                  Cette action a été initiée par votre conversation.
                </p>
              </div>

              {/* Boutons */}
              <div className="px-6 pb-6 flex flex-col gap-3">
                {/* Confirmer */}
                <motion.button
                  onClick={onConfirm}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: cfg.gradient }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <CheckCircle className="w-4 h-4" />
                  {cfg.confirmLabel}
                </motion.button>

                {/* Annuler */}
                <motion.button
                  onClick={onCancel}
                  className="w-full py-3 rounded-2xl border-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#E5E7EB' }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {cfg.cancelLabel}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// HOOK UTILITAIRE (gestion de l'état du dialog)
// ============================================================================

import { useState, useCallback } from 'react';

interface ConfirmDialogState {
  isOpen:         boolean;
  actionType:     CriticalActionType | null;
  warningMessage: string;
  targetLabel?:   string;
  onConfirm:      (() => void) | null;
}

const EMPTY_STATE: ConfirmDialogState = {
  isOpen:         false,
  actionType:     null,
  warningMessage: '',
  targetLabel:    undefined,
  onConfirm:      null,
};

/**
 * Hook pour ouvrir facilement TantieConfirmDialog depuis n'importe quel composant.
 *
 * Usage :
 *   const { dialogProps, openConfirmDialog } = useConfirmDialog();
 *   openConfirmDialog('DELETE', 'Supprimer le stock de tomates ?', 'Stock tomates', () => doDelete());
 *   return <TantieConfirmDialog {...dialogProps} />;
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>(EMPTY_STATE);

  const openConfirmDialog = useCallback((
    actionType:     CriticalActionType,
    warningMessage: string,
    targetLabel?:   string,
    onConfirm?:     () => void
  ) => {
    setState({
      isOpen:         true,
      actionType,
      warningMessage,
      targetLabel,
      onConfirm:      onConfirm ?? null,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const handleConfirm = useCallback(() => {
    if (state.onConfirm) state.onConfirm();
    closeDialog();
  }, [state.onConfirm, closeDialog]);

  const dialogProps: TantieConfirmDialogProps = {
    isOpen:         state.isOpen,
    actionType:     state.actionType ?? 'DELETE',
    warningMessage: state.warningMessage,
    targetLabel:    state.targetLabel,
    onConfirm:      handleConfirm,
    onCancel:       closeDialog,
  };

  return { dialogProps, openConfirmDialog, closeDialog };
}
