/**
 * TANTIE SAGESSE — ConfirmationManager
 *
 * Définit la liste des actions critiques nécessitant une confirmation explicite
 * avant exécution. Dans l'état actuel (frontend-only), l'IA n'exécute pas
 * d'actions destructives — ce module prépare l'architecture pour la Phase 3
 * (UserService, OrderService, etc.) et bloque toute tentative anticipée.
 *
 * RÈGLE : si une intent est dans CRITICAL_ACTIONS, elle ne peut jamais
 * être exécutée directement. Un modal de confirmation doit être affiché.
 *
 * Flow :
 *   Intent détecté → isCriticalAction(intent) ?
 *     OUI → retourner { requiresConfirmation: true, confirmationKey }
 *           → UI affiche modal → user confirme/refuse
 *           → si confirmé : logConfirmed() + exécuter
 *           → si refusé   : logRefused()
 *     NON → exécution directe + logAccepted()
 */

import type { TantieIntentCategory } from '../../types/tantie.types';

// ============================================================================
// LISTE DES ACTIONS CRITIQUES (nécessitent confirmation)
// ============================================================================

/**
 * Ces constantes ne correspondent pas à des catégories d'intent actuelles
 * (l'IA ne peut pas encore déclencher DELETE/SUSPEND/MODIFY_USER).
 * Elles sont définies ici pour la Phase 3, et leur vérification est intégrée
 * dans le pipeline dès maintenant.
 */
export const CRITICAL_ACTIONS = [
  'DELETE',        // Suppression d'une entité (stock, récolte, commande)
  'SUSPEND',       // Suspension d'un acteur ou d'une commande
  'MODIFY_USER',   // Modification de données utilisateur critiques
  'TRANSFER',      // Virement wallet
  'VALIDATE',      // Validation définitive d'un dossier
] as const;

export type CriticalActionType = typeof CRITICAL_ACTIONS[number];

// ============================================================================
// INTERFACE RÉSULTAT
// ============================================================================

export interface ConfirmationCheckResult {
  requiresConfirmation: boolean;
  confirmationKey?: CriticalActionType;
  warningMessage?: string;
}

export interface PendingConfirmation {
  confirmationKey: CriticalActionType;
  intentCategory:  TantieIntentCategory;
  rawText:         string;
  userId:          string;
  role:            string;
  createdAt:       string;
}

// ============================================================================
// MESSAGES D'AVERTISSEMENT PAR ACTION CRITIQUE
// ============================================================================

const WARNING_MESSAGES: Record<CriticalActionType, string> = {
  DELETE:      'Cette action supprimera définitivement les données. Confirmez-vous ?',
  SUSPEND:     'Cette action suspendra l\'accès. L\'utilisateur ne pourra plus se connecter. Confirmez-vous ?',
  MODIFY_USER: 'Vous allez modifier des informations sensibles d\'un utilisateur. Confirmez-vous ?',
  TRANSFER:    'Ce virement est irréversible une fois validé. Confirmez-vous ?',
  VALIDATE:    'La validation est définitive et ne peut pas être annulée. Confirmez-vous ?',
};

// ============================================================================
// VÉRIFICATION
// ============================================================================

/**
 * Vérifie si une intent déclenchée par l'IA nécessite une confirmation.
 * Dans la Phase 2 actuelle, aucune intent standard n'est critique.
 * Cette fonction est prête pour la Phase 3 (UserService, OrderService).
 */
export function checkConfirmationRequired(
  intentCategory: TantieIntentCategory,
  _actionRequested?: string
): ConfirmationCheckResult {
  // Phase 2 : aucune intent standard n'est dans CRITICAL_ACTIONS
  // (STOCK, VENTE, PRIX, etc. sont des actions lecture/navigation uniquement)
  // Ce check sera pertinent en Phase 3 quand l'IA pourra muter des données.
  return { requiresConfirmation: false };
}

/**
 * Crée un objet PendingConfirmation à stocker temporairement en mémoire
 * (jamais en localStorage — durée de vie = session courante uniquement).
 */
export function createPendingConfirmation(params: {
  confirmationKey: CriticalActionType;
  intentCategory:  TantieIntentCategory;
  rawText:         string;
  userId:          string;
  role:            string;
}): PendingConfirmation {
  return {
    ...params,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Retourne le message d'avertissement pour une action critique.
 */
export function getWarningMessage(key: CriticalActionType): string {
  return WARNING_MESSAGES[key];
}

/**
 * Vérifie si une chaîne est une action critique connue.
 */
export function isCriticalAction(action: string): action is CriticalActionType {
  return (CRITICAL_ACTIONS as readonly string[]).includes(action);
}
