/**
 * TANTIE SAGESSE — PermissionGuard
 *
 * Mapping rôle utilisateur → catégories d'intent autorisées.
 * Toute intent non listée pour le rôle courant est BLOQUÉE avant generateResponse().
 *
 * Design : liste blanche (allowlist). Si une catégorie n'est pas dans la liste
 * du rôle, la réponse est remplacée par un message de refus explicite.
 *
 * Les catégories génériques (SALUTATION, CONSEIL, METEO, SUPPORT, PROFIL,
 * ALERTE, ACADEMY, SCORE) sont autorisées pour TOUS les rôles.
 */

import type { TantieIntentCategory } from '../../types/tantie.types';

// ============================================================================
// CATÉGORIES UNIVERSELLES (tous les rôles)
// ============================================================================

const UNIVERSAL_CATEGORIES: TantieIntentCategory[] = [
  'SALUTATION',
  'CONSEIL',
  'METEO',
  'SUPPORT',
  'PROFIL',
  'ALERTE',
  'ACADEMY',
  'SCORE',
  'INCONNU',
];

// ============================================================================
// PERMISSIONS PAR RÔLE
// ============================================================================

export type JulabaRole = 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';

const ROLE_PERMISSIONS: Record<JulabaRole, TantieIntentCategory[]> = {
  marchand: [
    ...UNIVERSAL_CATEGORIES,
    'STOCK',
    'VENTE',
    'CAISSE',
    'WALLET',
    'COMMANDE',
    'PRIX',
    'MARCHE',
  ],
  producteur: [
    ...UNIVERSAL_CATEGORIES,
    'RECOLTE',
    'COMMANDE',
    'PRIX',
    'MARCHE',
    'WALLET',
  ],
  cooperative: [
    ...UNIVERSAL_CATEGORIES,
    'COMMANDE',
    'PRIX',
    'MARCHE',
    'WALLET',
    'COOPERATIVE',
  ],
  institution: [
    ...UNIVERSAL_CATEGORIES,
    // Institutions : accès supervision uniquement — pas de transactions directes
  ],
  identificateur: [
    ...UNIVERSAL_CATEGORIES,
    'PROFIL',
  ],
};

// ============================================================================
// INTERFACE RÉSULTAT GUARD
// ============================================================================

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  blockedCategory?: TantieIntentCategory;
}

// ============================================================================
// VÉRIFICATION
// ============================================================================

/**
 * Vérifie si l'intent est autorisée pour le rôle donné.
 * @param role - Rôle de l'utilisateur courant
 * @param category - Catégorie d'intent détectée
 * @returns { allowed: boolean, reason?: string }
 */
export function checkPermission(
  role: JulabaRole,
  category: TantieIntentCategory
): PermissionCheckResult {
  const allowed = ROLE_PERMISSIONS[role]?.includes(category) ?? false;

  if (allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    blockedCategory: category,
    reason: `La catégorie "${category}" n'est pas autorisée pour le rôle "${role}".`,
  };
}

/**
 * Retourne le message de refus à afficher à l'utilisateur en cas de blocage.
 */
export function getRefusalMessage(role: JulabaRole, category: TantieIntentCategory): string {
  const roleLabels: Record<JulabaRole, string> = {
    marchand:        'Marchand',
    producteur:      'Producteur',
    cooperative:     'Coopérative',
    institution:     'Institution',
    identificateur:  'Identificateur',
  };

  const contextMessages: Partial<Record<TantieIntentCategory, string>> = {
    STOCK:   'La gestion du stock est réservée aux Marchands.',
    VENTE:   'L\'enregistrement des ventes est réservé aux Marchands.',
    CAISSE:  'La caisse est réservée aux Marchands.',
    RECOLTE: 'La gestion des récoltes est réservée aux Producteurs.',
    COOPERATIVE: 'Les fonctions coopérative sont réservées aux membres de Coopérative.',
  };

  const specific = contextMessages[category];
  if (specific) {
    return `Je suis désolée, ${specific} En tant que ${roleLabels[role]}, je peux vous aider avec d'autres sujets. Que puis-je faire pour vous ?`;
  }

  return `Je suis désolée, cette action n'est pas disponible pour votre profil ${roleLabels[role]}. Comment puis-je vous aider autrement ?`;
}

/**
 * Retourne la liste des catégories autorisées pour un rôle.
 */
export function getAllowedCategories(role: JulabaRole): TantieIntentCategory[] {
  return ROLE_PERMISSIONS[role] ?? UNIVERSAL_CATEGORIES;
}
