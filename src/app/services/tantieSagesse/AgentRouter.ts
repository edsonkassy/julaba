/**
 * TANTIE SAGESSE — AgentRouter
 *
 * Routeur d'intentions : à partir d'une intent parsée, détermine
 * quelle action exécuter et quelles actions rapides proposer.
 *
 * Pipeline complet (Phase 2) :
 *   Intent → AgentRouter → [ActionRegistry lookup] → TantieAction[]
 *
 * Phase 3 : l'AgentRouter appellera directement les services backend
 *   (StockService, OrderService, WalletService, etc.) pour les actions
 *   non-READ-ONLY, après passage par le ConfirmationManager.
 *
 * ARCHITECTURE :
 *   - Fonctionne 100% offline en Phase 2
 *   - Tous les services Phase 3 sont stubés (retournent null)
 *   - Le routeur est stateless et pur (pas de side effects)
 */

import type {
  TantieIntent,
  TantieAction,
  TantieIntentCategory,
  TantieUserContext,
} from '../../types/tantie.types';

import {
  getActionsByIntent,
  type JulabaRole,
} from './ActionRegistry';

// ============================================================================
// TYPES
// ============================================================================

export interface RouteResult {
  /** Actions rapides à proposer après la réponse */
  suggestedActions: TantieAction[];
  /** L'action principale recommandée (pour navigation auto) */
  primaryAction:    TantieAction | null;
  /** Si Phase 3 : service backend à appeler */
  backendService:   BackendServiceCall | null;
  /** Si l'action est en attente de confirmation */
  requiresConfirmation: boolean;
}

/**
 * Stub Phase 3 — sera remplacé par de vraies interfaces de service.
 */
export interface BackendServiceCall {
  service:  'StockService' | 'OrderService' | 'WalletService' | 'RecolteService';
  method:   string;
  params:   Record<string, unknown>;
  /** null en Phase 2 — résultat simulé en Phase 3 */
  result:   null;
}

// ============================================================================
// AGENT ROUTER PRINCIPAL
// ============================================================================

/**
 * Route une intent vers des actions et un service backend (Phase 3).
 * En Phase 2, retourne uniquement des suggestedActions READ-ONLY.
 */
export function routeIntent(
  intent:  TantieIntent,
  ctx:     TantieUserContext
): RouteResult {
  const role = ctx.role as JulabaRole;
  const category = intent.category;

  // Rechercher les actions disponibles pour ce rôle + cette intent
  const matchingActions = getActionsByIntent(role, category, false);

  // Convertir ActionDefinition → TantieAction (format UI)
  const suggestedActions: TantieAction[] = matchingActions
    .slice(0, 4)  // Max 4 suggestions
    .map(a => ({
      id:      a.id,
      label:   a.label,
      icon:    a.icon,
      route:   mapActionRoute(a.route ?? '', role),
    }));

  // Action principale = première action suggérée pour les navigations directes
  const primaryAction = suggestedActions[0] ?? null;

  // Phase 3 stub : détecter si l'intent nécessite un appel backend
  const backendService = resolveBackendService(category, intent, ctx);

  return {
    suggestedActions,
    primaryAction,
    backendService,
    requiresConfirmation: backendService !== null && matchingActions.some(a => a.requiresConfirmation),
  };
}

// ============================================================================
// MAPPING DE ROUTE (adapte la route générique au rôle utilisateur)
// ============================================================================

/**
 * Traduit une route générique ActionRegistry en route React Router réelle
 * en tenant compte du préfixe de rôle.
 * Ex: '/marchand/stock' reste '/marchand/stock' pour un marchand.
 * Ex: '/producteur/recoltes' reste '/producteur/recoltes' pour un producteur.
 */
function mapActionRoute(route: string, _role: JulabaRole): string {
  // En Phase 2, les routes sont déjà préfixées par rôle dans ActionRegistry
  return route;
}

// ============================================================================
// RÉSOLUTION SERVICE BACKEND (Phase 3 — stubs)
// ============================================================================

/**
 * En Phase 2 : retourne toujours null (aucun appel backend réel).
 * En Phase 3 : cette fonction sera complétée avec les paramètres extraits
 * des entities de l'intent.
 */
function resolveBackendService(
  category: TantieIntentCategory,
  intent:   TantieIntent,
  ctx:      TantieUserContext
): BackendServiceCall | null {
  // Phase 2 : READ-ONLY, aucun service backend
  switch (category) {
    case 'STOCK':
      // Phase 3 : return { service: 'StockService', method: 'getStock', params: { userId: ctx.userId }, result: null };
      return null;

    case 'VENTE':
      // Phase 3 : return { service: 'OrderService', method: 'createOrder', params: { ... }, result: null };
      return null;

    case 'RECOLTE':
      // Phase 3 : return { service: 'RecolteService', method: 'getRecoltes', params: { userId: ctx.userId }, result: null };
      return null;

    case 'WALLET':
      // Phase 3 : return { service: 'WalletService', method: 'getBalance', params: { userId: ctx.userId }, result: null };
      return null;

    case 'COMMANDE':
      // Phase 3 : return { service: 'OrderService', method: 'getOrders', params: { userId: ctx.userId }, result: null };
      return null;

    default:
      return null;
  }
}

// ============================================================================
// SUGGESTIONS CONTEXTUELLES (basées sur le contexte temps réel)
// ============================================================================

/**
 * Génère des suggestions proactives basées sur l'état du contexte utilisateur.
 * Utilisé par analyzeContextAlerts() dans tantieEngine pour les suggestions
 * d'actions rapides liées aux alertes.
 */
export function getProactiveSuggestions(ctx: TantieUserContext): TantieAction[] {
  const role = ctx.role as JulabaRole;
  const suggestions: TantieAction[] = [];

  // Stock critique → suggérer de voir le stock
  if (ctx.stockItems?.some(s => s.estCritique)) {
    const stockActions = getActionsByIntent(role, 'STOCK', false);
    if (stockActions[0]) {
      suggestions.push({
        id:    stockActions[0].id,
        label: 'Voir mon stock critique',
        icon:  stockActions[0].icon,
        route: stockActions[0].route,
      });
    }
  }

  // Wallet faible → suggérer de recharger
  if (ctx.walletSolde !== undefined && ctx.walletSolde < 5000) {
    const walletActions = getActionsByIntent(role, 'WALLET', false);
    if (walletActions[0]) {
      suggestions.push({
        id:    walletActions[0].id,
        label: 'Vérifier mon Wallet',
        icon:  walletActions[0].icon,
        route: walletActions[0].route,
      });
    }
  }

  // Commandes en attente → suggérer les commandes
  if (ctx.commandesEnCours && ctx.commandesEnCours >= 3) {
    const commandeActions = getActionsByIntent(role, 'COMMANDE', false);
    if (commandeActions[0]) {
      suggestions.push({
        id:    commandeActions[0].id,
        label: `${ctx.commandesEnCours} commandes en attente`,
        icon:  commandeActions[0].icon,
        route: commandeActions[0].route,
      });
    }
  }

  // Score faible → suggérer Academy
  if (ctx.score < 50) {
    const academyActions = getActionsByIntent(role, 'ACADEMY', false);
    if (academyActions[0]) {
      suggestions.push({
        id:    academyActions[0].id,
        label: 'Améliorer mon score',
        icon:  academyActions[0].icon,
        route: academyActions[0].route,
      });
    }
  }

  return suggestions.slice(0, 3);
}

// ============================================================================
// ROUTER D'INTENT SIMPLIFIÉ (pour generateResponse dans responseGenerator)
// ============================================================================

/**
 * Version simplifiée pour le responseGenerator — retourne directement
 * les TantieAction[] à injecter dans la réponse, sans context routing complet.
 */
export function getActionsForResponse(
  category: TantieIntentCategory,
  role: string
): TantieAction[] {
  const validRole = role as JulabaRole;
  const actions = getActionsByIntent(validRole, category, false);

  return actions.slice(0, 3).map(a => ({
    id:    a.id,
    label: a.label,
    icon:  a.icon,
    route: a.route,
  }));
}
