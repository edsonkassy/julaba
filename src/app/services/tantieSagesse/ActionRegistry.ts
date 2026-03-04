/**
 * TANTIE SAGESSE — ActionRegistry
 *
 * Registre centralisé de toutes les actions exécutables par l'IA.
 * Chaque action est décrite par :
 *   - son identifiant unique
 *   - les rôles qui peuvent l'exécuter
 *   - si elle nécessite une confirmation explicite (ConfirmationManager)
 *   - la route de navigation cible
 *   - l'intent associée (pour le routing automatique)
 *
 * Phase 3 : ce registre sera connecté à des services backend réels
 * (UserService, OrderService, StockService, etc.).
 * En Phase 2, toutes les actions sont READ-ONLY (navigation uniquement).
 */

import type { TantieIntentCategory } from '../../types/tantie.types';

// ============================================================================
// TYPES
// ============================================================================

export type ActionId =
  // Navigation marchand
  | 'nav.marchand.stock'
  | 'nav.marchand.caisse'
  | 'nav.marchand.wallet'
  | 'nav.marchand.commandes'
  | 'nav.marchand.marche'
  | 'nav.marchand.academy'
  | 'nav.marchand.alertes'
  | 'nav.marchand.profil'
  | 'nav.marchand.support'
  // Navigation producteur
  | 'nav.producteur.recoltes'
  | 'nav.producteur.marche'
  | 'nav.producteur.commandes'
  | 'nav.producteur.wallet'
  | 'nav.producteur.academy'
  | 'nav.producteur.alertes'
  | 'nav.producteur.profil'
  | 'nav.producteur.support'
  // Navigation coopérative
  | 'nav.cooperative.home'
  | 'nav.cooperative.marche'
  | 'nav.cooperative.wallet'
  | 'nav.cooperative.academy'
  | 'nav.cooperative.alertes'
  | 'nav.cooperative.profil'
  | 'nav.cooperative.support'
  // Navigation institution
  | 'nav.institution.home'
  | 'nav.institution.alertes'
  | 'nav.institution.profil'
  | 'nav.institution.support'
  // Navigation identificateur
  | 'nav.identificateur.profil'
  | 'nav.identificateur.alertes'
  | 'nav.identificateur.academy'
  | 'nav.identificateur.support'
  // Actions futures (Phase 3 — connectées à des services backend)
  | 'action.stock.ajouter'
  | 'action.vente.enregistrer'
  | 'action.recolte.publier'
  | 'action.commande.creer'
  | 'action.wallet.recharger';

export type JulabaRole = 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';

export interface ActionDefinition {
  id:                  ActionId;
  label:               string;         // Libellé affiché dans l'UI
  icon:                string;         // Nom icône lucide-react
  allowedRoles:        JulabaRole[];   // Rôles autorisés
  requiresConfirmation: boolean;       // Nécessite ConfirmationManager ?
  route?:              string;         // Route React Router cible (navigation)
  intentCategories:    TantieIntentCategory[]; // Intents qui déclenchent cette action
  isReadOnly:          boolean;        // true = lecture seule (Phase 2), false = mutation (Phase 3)
  phase:               2 | 3;         // Phase d'implémentation
}

// ============================================================================
// REGISTRE DES ACTIONS
// ============================================================================

export const ACTION_REGISTRY: ActionDefinition[] = [

  // ── MARCHAND — Navigation ─────────────────────────────────────────────────

  {
    id: 'nav.marchand.stock',
    label: 'Voir mon stock',
    icon: 'Package',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/stock',
    intentCategories: ['STOCK'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.caisse',
    label: 'Ouvrir ma caisse',
    icon: 'Calculator',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/caisse',
    intentCategories: ['CAISSE', 'VENTE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.wallet',
    label: 'Mon Wallet',
    icon: 'Wallet',
    allowedRoles: ['marchand', 'producteur', 'cooperative'],
    requiresConfirmation: false,
    route: '/marchand/wallet',
    intentCategories: ['WALLET'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.commandes',
    label: 'Mes commandes',
    icon: 'ClipboardList',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/commandes',
    intentCategories: ['COMMANDE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.marche',
    label: 'Voir le marché',
    icon: 'Store',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/marche',
    intentCategories: ['MARCHE', 'PRIX'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.academy',
    label: 'Jùlaba Academy',
    icon: 'GraduationCap',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/academy',
    intentCategories: ['ACADEMY'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.alertes',
    label: 'Mes alertes',
    icon: 'Bell',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/alertes',
    intentCategories: ['ALERTE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.profil',
    label: 'Mon profil',
    icon: 'User',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/profil',
    intentCategories: ['PROFIL', 'SCORE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.marchand.support',
    label: 'Contacter le support',
    icon: 'Headphones',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/support',
    intentCategories: ['SUPPORT'],
    isReadOnly: true,
    phase: 2,
  },

  // ── PRODUCTEUR — Navigation ───────────────────────────────────────────────

  {
    id: 'nav.producteur.recoltes',
    label: 'Mes récoltes',
    icon: 'Leaf',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/recoltes',
    intentCategories: ['RECOLTE', 'STOCK'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.producteur.marche',
    label: 'Voir le marché',
    icon: 'Store',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/marche',
    intentCategories: ['MARCHE', 'PRIX'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.producteur.commandes',
    label: 'Mes commandes',
    icon: 'ClipboardList',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/commandes',
    intentCategories: ['COMMANDE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.producteur.wallet',
    label: 'Mon Wallet',
    icon: 'Wallet',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/wallet',
    intentCategories: ['WALLET'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.producteur.academy',
    label: 'Jùlaba Academy',
    icon: 'GraduationCap',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/academy',
    intentCategories: ['ACADEMY'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.producteur.alertes',
    label: 'Mes alertes',
    icon: 'Bell',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/alertes',
    intentCategories: ['ALERTE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.producteur.profil',
    label: 'Mon profil',
    icon: 'User',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/profil',
    intentCategories: ['PROFIL', 'SCORE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.producteur.support',
    label: 'Contacter le support',
    icon: 'Headphones',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/support',
    intentCategories: ['SUPPORT'],
    isReadOnly: true,
    phase: 2,
  },

  // ── COOPERATIVE — Navigation ──────────────────────────────────────────────

  {
    id: 'nav.cooperative.home',
    label: 'Tableau de bord',
    icon: 'LayoutDashboard',
    allowedRoles: ['cooperative'],
    requiresConfirmation: false,
    route: '/cooperative',
    intentCategories: ['COOPERATIVE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.cooperative.marche',
    label: 'Marché coopérative',
    icon: 'Store',
    allowedRoles: ['cooperative'],
    requiresConfirmation: false,
    route: '/cooperative/marche',
    intentCategories: ['MARCHE', 'COMMANDE', 'PRIX'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.cooperative.wallet',
    label: 'Finances',
    icon: 'Wallet',
    allowedRoles: ['cooperative'],
    requiresConfirmation: false,
    route: '/cooperative/wallet',
    intentCategories: ['WALLET'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.cooperative.academy',
    label: 'Jùlaba Academy',
    icon: 'GraduationCap',
    allowedRoles: ['cooperative'],
    requiresConfirmation: false,
    route: '/cooperative/academy',
    intentCategories: ['ACADEMY'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.cooperative.alertes',
    label: 'Alertes coopérative',
    icon: 'Bell',
    allowedRoles: ['cooperative'],
    requiresConfirmation: false,
    route: '/cooperative/alertes',
    intentCategories: ['ALERTE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.cooperative.profil',
    label: 'Mon profil',
    icon: 'User',
    allowedRoles: ['cooperative'],
    requiresConfirmation: false,
    route: '/cooperative/profil',
    intentCategories: ['PROFIL', 'SCORE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.cooperative.support',
    label: 'Support',
    icon: 'Headphones',
    allowedRoles: ['cooperative'],
    requiresConfirmation: false,
    route: '/cooperative/support',
    intentCategories: ['SUPPORT'],
    isReadOnly: true,
    phase: 2,
  },

  // ── INSTITUTION — Navigation ──────────────────────────────────────────────

  {
    id: 'nav.institution.home',
    label: 'Tableau de bord',
    icon: 'LayoutDashboard',
    allowedRoles: ['institution'],
    requiresConfirmation: false,
    route: '/institution',
    intentCategories: ['MARCHE', 'CONSEIL'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.institution.alertes',
    label: 'Alertes institution',
    icon: 'Bell',
    allowedRoles: ['institution'],
    requiresConfirmation: false,
    route: '/institution/alertes',
    intentCategories: ['ALERTE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.institution.profil',
    label: 'Mon profil',
    icon: 'User',
    allowedRoles: ['institution'],
    requiresConfirmation: false,
    route: '/institution/profil',
    intentCategories: ['PROFIL'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.institution.support',
    label: 'Support',
    icon: 'Headphones',
    allowedRoles: ['institution'],
    requiresConfirmation: false,
    route: '/institution/support',
    intentCategories: ['SUPPORT'],
    isReadOnly: true,
    phase: 2,
  },

  // ── IDENTIFICATEUR — Navigation ───────────────────────────────────────────

  {
    id: 'nav.identificateur.profil',
    label: 'Mon profil',
    icon: 'User',
    allowedRoles: ['identificateur'],
    requiresConfirmation: false,
    route: '/identificateur/profil',
    intentCategories: ['PROFIL'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.identificateur.alertes',
    label: 'Mes alertes',
    icon: 'Bell',
    allowedRoles: ['identificateur'],
    requiresConfirmation: false,
    route: '/identificateur/alertes',
    intentCategories: ['ALERTE'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.identificateur.academy',
    label: 'Jùlaba Academy',
    icon: 'GraduationCap',
    allowedRoles: ['identificateur'],
    requiresConfirmation: false,
    route: '/identificateur/academy',
    intentCategories: ['ACADEMY'],
    isReadOnly: true,
    phase: 2,
  },
  {
    id: 'nav.identificateur.support',
    label: 'Support',
    icon: 'Headphones',
    allowedRoles: ['identificateur'],
    requiresConfirmation: false,
    route: '/identificateur/support',
    intentCategories: ['SUPPORT'],
    isReadOnly: true,
    phase: 2,
  },

  // ── ACTIONS FUTURES (Phase 3 — désactivées en Phase 2) ───────────────────

  {
    id: 'action.stock.ajouter',
    label: 'Ajouter au stock',
    icon: 'PlusCircle',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/stock',
    intentCategories: ['STOCK'],
    isReadOnly: false,
    phase: 3,
  },
  {
    id: 'action.vente.enregistrer',
    label: 'Enregistrer une vente',
    icon: 'ShoppingCart',
    allowedRoles: ['marchand'],
    requiresConfirmation: false,
    route: '/marchand/caisse',
    intentCategories: ['VENTE'],
    isReadOnly: false,
    phase: 3,
  },
  {
    id: 'action.recolte.publier',
    label: 'Publier une récolte',
    icon: 'Upload',
    allowedRoles: ['producteur'],
    requiresConfirmation: false,
    route: '/producteur/recoltes',
    intentCategories: ['RECOLTE'],
    isReadOnly: false,
    phase: 3,
  },
  {
    id: 'action.commande.creer',
    label: 'Créer une commande',
    icon: 'Plus',
    allowedRoles: ['marchand', 'cooperative'],
    requiresConfirmation: true,
    route: '/marchand/commandes',
    intentCategories: ['COMMANDE'],
    isReadOnly: false,
    phase: 3,
  },
  {
    id: 'action.wallet.recharger',
    label: 'Recharger le wallet',
    icon: 'ArrowUpCircle',
    allowedRoles: ['marchand', 'producteur', 'cooperative'],
    requiresConfirmation: true,
    route: '/marchand/wallet',
    intentCategories: ['WALLET'],
    isReadOnly: false,
    phase: 3,
  },
];

// ============================================================================
// HELPERS DE LOOKUP
// ============================================================================

/**
 * Retourne les actions disponibles pour un rôle donné.
 * En Phase 2, filtre uniquement les actions isReadOnly=true.
 */
export function getActionsForRole(
  role: JulabaRole,
  includePhase3 = false
): ActionDefinition[] {
  return ACTION_REGISTRY.filter(a =>
    a.allowedRoles.includes(role) &&
    (includePhase3 || a.phase === 2)
  );
}

/**
 * Retourne les actions liées à une intent, pour un rôle donné.
 */
export function getActionsByIntent(
  role: JulabaRole,
  intentCategory: TantieIntentCategory,
  includePhase3 = false
): ActionDefinition[] {
  return ACTION_REGISTRY.filter(a =>
    a.allowedRoles.includes(role) &&
    a.intentCategories.includes(intentCategory) &&
    (includePhase3 || a.phase === 2)
  );
}

/**
 * Retourne une action par son ID.
 */
export function getActionById(id: ActionId): ActionDefinition | undefined {
  return ACTION_REGISTRY.find(a => a.id === id);
}

/**
 * Vérifie si une action est disponible pour un rôle.
 */
export function canExecuteAction(id: ActionId, role: JulabaRole): boolean {
  const action = getActionById(id);
  if (!action) return false;
  return action.allowedRoles.includes(role) && action.phase === 2;
}
