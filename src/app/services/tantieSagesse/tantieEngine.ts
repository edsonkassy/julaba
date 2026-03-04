/**
 * TANTIE SAGESSE - Moteur IA Central (Orchestrateur)
 *
 * Pipeline complet pour chaque message utilisateur :
 *   1. parseIntent()       — NLU offline
 *   2. checkPermission()   — PermissionGuard : intent autorisée pour ce rôle ?
 *   3. generateResponse()  — Génération avec config BO appliquée
 *   4. logAccepted/Refused — AILogService : trace structurée
 *
 * Fonctionne 100% hors-ligne, zéro dépendance externe.
 */

import { parseIntent } from './intentParser';
import { buildUserContext } from './contextCollector';
import {
  generateResponse,
  generateWelcomeMessage,
  getSuggestionsRapides,
} from './responseGenerator';
import { checkPermission, getRefusalMessage, type JulabaRole } from './PermissionGuard';
import { logAccepted, logRefused, logFailed } from './AILogService';
import { checkConfirmationRequired } from './ConfirmationManager';

import type {
  TantieMessage,
  TantieUserContext,
  TantieResponse,
  TantieSession,
  TantieAction,
  TantieConfig,
} from '../../types/tantie.types';

// ============================================================================
// GÉNÉRATEUR D'IDS
// ============================================================================

let msgCounter = 0;
export function generateMsgId(): string {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// RÉSULTAT DE TRAITEMENT
// ============================================================================

export interface EngineProcessResult {
  userMessage:      TantieMessage;
  assistantMessage: TantieMessage;
  response:         TantieResponse;
  wasBlocked:       boolean;   // true si PermissionGuard a bloqué l'intent
}

// ============================================================================
// TRAITEMENT D'UN MESSAGE UTILISATEUR
// Pipeline : Intent → Guard → Response → Log
// ============================================================================

export function processMessage(
  rawText:  string,
  ctx:      TantieUserContext,
  mode:     'text' | 'voice' = 'text',
  config?:  Partial<TantieConfig>
): EngineProcessResult {
  const startTime = Date.now();

  // 1. Parse l'intention
  const intent = parseIntent(rawText);

  // 2. PermissionGuard — vérifier si l'intent est autorisée pour ce rôle
  const permCheck = checkPermission(ctx.role as JulabaRole, intent.category);

  // 3. ConfirmationManager — vérifier si action critique (Phase 3 readiness)
  const confirmCheck = checkConfirmationRequired(intent.category);

  let responseText: string;
  let wasBlocked = false;

  if (!permCheck.allowed) {
    // Intent bloquée par le PermissionGuard
    wasBlocked = true;
    responseText = getRefusalMessage(ctx.role as JulabaRole, intent.category);

    // Log du refus
    logRefused({
      userId:   ctx.userId,
      role:     ctx.role,
      action:   intent.category,
      rawText,
      entities: intent.entities,
      reason:   permCheck.reason ?? 'Intent non autorisée pour ce rôle',
    });
  } else {
    // Intent autorisée → générer la réponse avec config BO appliquée
    const response = generateResponse(intent, ctx, startTime, config);
    responseText = response.text;

    // Log de l'acceptation
    logAccepted({
      userId:   ctx.userId,
      role:     ctx.role,
      action:   intent.category,
      rawText,
      entities: intent.entities,
    });
  }

  // 4. Générer la réponse finale (avec ou sans blocage)
  const finalResponse: TantieResponse = wasBlocked
    ? {
        text:             responseText,
        emotion:          'INFO',
        actions:          [],
        intent,
        confidence:       'HIGH',
        shouldSpeak:      config?.voiceEnabled !== false,
        processingTimeMs: Date.now() - startTime,
      }
    : generateResponse(intent, ctx, startTime, config);

  // 5. Construire le message utilisateur
  const userMessage: TantieMessage = {
    id:        generateMsgId(),
    role:      'user',
    content:   rawText,
    timestamp: new Date().toISOString(),
    mode,
    intent,
  };

  // 6. Construire le message assistant
  const assistantMessage: TantieMessage = {
    id:        generateMsgId(),
    role:      'assistant',
    content:   wasBlocked ? responseText : finalResponse.text,
    timestamp: new Date().toISOString(),
    mode,
    intent,
    actions:   wasBlocked ? [] : finalResponse.actions,
    emotion:   wasBlocked ? 'INFO' : finalResponse.emotion,
  };

  return { userMessage, assistantMessage, response: finalResponse, wasBlocked };
}

// ============================================================================
// CRÉATION D'UNE NOUVELLE SESSION
// ============================================================================

export function createSession(userData: any): TantieSession {
  const ctx = buildUserContext(userData);

  return {
    id:              generateSessionId(),
    userId:          ctx.userId,
    role:            ctx.role,
    messages:        [],
    context:         ctx,
    startedAt:       new Date().toISOString(),
    lastActivityAt:  new Date().toISOString(),
    totalMessages:   0,
  };
}

// ============================================================================
// MISE À JOUR DU CONTEXTE (changement de données en session)
// ============================================================================

export function refreshContext(session: TantieSession, userData: any): TantieSession {
  return {
    ...session,
    context:        buildUserContext(userData),
    lastActivityAt: new Date().toISOString(),
  };
}

// ============================================================================
// AJOUT DE MESSAGES À LA SESSION
// ============================================================================

export function addMessagesToSession(
  session:  TantieSession,
  messages: TantieMessage[]
): TantieSession {
  return {
    ...session,
    messages:       [...session.messages, ...messages],
    totalMessages:  session.totalMessages + messages.length,
    lastActivityAt: new Date().toISOString(),
  };
}

// ============================================================================
// MESSAGE D'ACCUEIL INITIAL
// ============================================================================

export function buildWelcomeMessage(
  ctx:     TantieUserContext,
  config?: Partial<TantieConfig>
): TantieMessage {
  const welcomeText  = generateWelcomeMessage(ctx);
  const suggestions  = getSuggestionsRapides(ctx.role, config);

  return {
    id:        generateMsgId(),
    role:      'assistant',
    content:   welcomeText,
    timestamp: new Date().toISOString(),
    mode:      'text',
    emotion:   'ENCOURAGE',
    actions:   suggestions.slice(0, 4),
  };
}

// ============================================================================
// MESSAGE DE CHARGEMENT (placeholder pendant le traitement)
// ============================================================================

export function buildLoadingMessage(): TantieMessage {
  return {
    id:        generateMsgId(),
    role:      'assistant',
    content:   '',
    timestamp: new Date().toISOString(),
    mode:      'text',
    isLoading: true,
  };
}

// ============================================================================
// SUGGESTIONS RAPIDES D'ACCUEIL
// ============================================================================

export function getWelcomeSuggestions(
  ctx:     TantieUserContext,
  config?: Partial<TantieConfig>
): TantieAction[] {
  return getSuggestionsRapides(ctx.role, config);
}

// ============================================================================
// ANALYSE DE SANTÉ DU CONTEXTE (alertes proactives)
// ============================================================================

export interface ContextAlert {
  severity:     'critical' | 'warning' | 'info';
  message:      string;
  actionRoute?: string;
}

export function analyzeContextAlerts(ctx: TantieUserContext): ContextAlert[] {
  const alerts: ContextAlert[] = [];

  // Stock critique
  const stockCritiques = ctx.stockItems?.filter(s => s.estCritique) ?? [];
  if (stockCritiques.length > 0) {
    alerts.push({
      severity:    'critical',
      message:     `Stock critique : ${stockCritiques.map(s => s.nom).join(', ')}`,
      actionRoute: '/stock',
    });
  }

  // Wallet bas (< 5 000 FCFA)
  if (ctx.walletSolde !== undefined && ctx.walletSolde < 5000) {
    alerts.push({
      severity:    'warning',
      message:     `Solde Wallet faible : ${ctx.walletSolde.toLocaleString('fr-FR')} FCFA`,
      actionRoute: '/wallet',
    });
  }

  // Beaucoup de commandes en attente
  if (ctx.commandesEnCours && ctx.commandesEnCours >= 5) {
    alerts.push({
      severity:    'warning',
      message:     `${ctx.commandesEnCours} commandes en attente de traitement`,
      actionRoute: '/commandes',
    });
  }

  // Alertes non lues
  if (ctx.alertesNonLues && ctx.alertesNonLues >= 3) {
    alerts.push({
      severity:    'info',
      message:     `${ctx.alertesNonLues} alertes non lues`,
      actionRoute: '/alertes',
    });
  }

  // Score faible
  if (ctx.score < 50) {
    alerts.push({
      severity:    'info',
      message:     `Score Jùlaba faible (${ctx.score}/100) — Complétez des formations`,
      actionRoute: '/academy',
    });
  }

  return alerts;
}
