/**
 * TANTIE SAGESSE - Gestionnaire de sessions
 *
 * Persiste les conversations en localStorage.
 * ISOLATION TOTALE : toutes les clés sont préfixées par userId via AIStorageKeys.
 * Limite l'historique pour ne pas surcharger le stockage.
 * Fournit les stats d'usage agrégées pour le BackOffice.
 */

import type {
  TantieSession,
  TantieMessage,
  TantieStats,
  TantieIntentCategory,
} from '../../types/tantie.types';

import {
  getUserStorageKeys,
  safeReadStorage,
  safeWriteStorage,
} from './AIStorageKeys';

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_MESSAGES_IN_SESSION = 100;
const MAX_SESSIONS_HISTORY    = 30;

// ============================================================================
// GESTION DE LA SESSION COURANTE (préfixée par userId)
// ============================================================================

/** Sauvegarde la session courante sous la clé préfixée par userId */
export function saveCurrentSession(session: TantieSession): void {
  const keys = getUserStorageKeys(session.userId);
  const capped: TantieSession = {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES_IN_SESSION),
  };
  safeWriteStorage(keys.TANTIE_SESSION, capped);
}

/** Charge la session courante (vérification userId + timeout 2h) */
export function loadCurrentSession(userId: string): TantieSession | null {
  const keys = getUserStorageKeys(userId);
  const session = safeReadStorage<TantieSession | null>(keys.TANTIE_SESSION, null);
  if (!session) return null;

  // Double-vérification userId (sécurité additionnelle)
  if (session.userId !== userId) return null;

  // Timeout 2h
  const lastActivity = new Date(session.lastActivityAt).getTime();
  const twoHoursAgo  = Date.now() - 2 * 60 * 60 * 1000;
  if (lastActivity < twoHoursAgo) return null;

  return session;
}

/** Supprime la session courante d'un utilisateur */
export function clearCurrentSession(userId: string): void {
  const keys = getUserStorageKeys(userId);
  try { localStorage.removeItem(keys.TANTIE_SESSION); } catch {}
}

// ============================================================================
// HISTORIQUE DES SESSIONS (préfixé par userId)
// ============================================================================

export interface SessionSummary {
  id:              string;
  userId:          string;
  role:            string;
  startedAt:       string;
  totalMessages:   number;
  durationMinutes: number;
  topIntent?:      TantieIntentCategory;
}

/** Archive la session dans l'historique avant fermeture */
export function archiveSession(session: TantieSession): void {
  const keys    = getUserStorageKeys(session.userId);
  const history = safeReadStorage<SessionSummary[]>(keys.TANTIE_HISTORY, []);

  const start    = new Date(session.startedAt).getTime();
  const end      = new Date(session.lastActivityAt).getTime();
  const duration = Math.round((end - start) / 60000);

  const intentCounts: Partial<Record<TantieIntentCategory, number>> = {};
  session.messages.forEach(msg => {
    if (msg.intent?.category) {
      intentCounts[msg.intent.category] = (intentCounts[msg.intent.category] ?? 0) + 1;
    }
  });
  const topIntent = (
    Object.entries(intentCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
  ) as TantieIntentCategory | undefined;

  const summary: SessionSummary = {
    id:             session.id,
    userId:         session.userId,
    role:           session.role,
    startedAt:      session.startedAt,
    totalMessages:  session.totalMessages,
    durationMinutes: duration,
    topIntent,
  };

  const updated = [summary, ...history].slice(0, MAX_SESSIONS_HISTORY);
  safeWriteStorage(keys.TANTIE_HISTORY, updated);
}

/** Charge l'historique des sessions d'un utilisateur */
export function loadSessionHistory(userId: string): SessionSummary[] {
  const keys = getUserStorageKeys(userId);
  return safeReadStorage<SessionSummary[]>(keys.TANTIE_HISTORY, []);
}

// ============================================================================
// STATISTIQUES D'USAGE GLOBALES (agrégées — clé globale BackOffice)
//
// Note : les stats agrégées restent dans une clé GLOBALE (non préfixée) car
// le BackOffice lit les stats cross-users. Les données individuelles sont
// dans les clés préfixées. Les stats ne contiennent aucune donnée personnelle.
// ============================================================================

const STORAGE_KEY_STATS = 'julaba_tantie_stats_global';

interface RawStats {
  totalSessions:      number;
  totalMessages:      number;
  sessionDates:       string[];
  messageDates:       string[];
  intentCounts:       Partial<Record<TantieIntentCategory, number>>;
  roleCounts:         Record<string, number>;
  ratingsSum:         number;
  ratingsCount:       number;
  resolvedCount:      number;
  totalConversations: number;
}

function loadRawStats(): RawStats {
  return safeReadStorage<RawStats>(STORAGE_KEY_STATS, {
    totalSessions:      0,
    totalMessages:      0,
    sessionDates:       [],
    messageDates:       [],
    intentCounts:       {},
    roleCounts:         {},
    ratingsSum:         0,
    ratingsCount:       0,
    resolvedCount:      0,
    totalConversations: 0,
  });
}

/** Enregistre une session terminée dans les stats globales */
export function recordSessionInStats(session: TantieSession): void {
  const stats = loadRawStats();
  const today = new Date().toISOString().split('T')[0];

  stats.totalSessions      += 1;
  stats.totalMessages      += session.totalMessages;
  stats.sessionDates        = [today, ...stats.sessionDates].slice(0, 500);
  stats.totalConversations += 1;

  stats.roleCounts[session.role] = (stats.roleCounts[session.role] ?? 0) + 1;

  session.messages.forEach(msg => {
    stats.messageDates = [today, ...stats.messageDates].slice(0, 5000);
    if (msg.intent?.category) {
      stats.intentCounts[msg.intent.category] =
        (stats.intentCounts[msg.intent.category] ?? 0) + 1;
    }
  });

  safeWriteStorage(STORAGE_KEY_STATS, stats);
}

/** Enregistre une évaluation utilisateur (1-5) */
export function recordRating(rating: 1 | 2 | 3 | 4 | 5): void {
  const stats      = loadRawStats();
  stats.ratingsSum += rating;
  stats.ratingsCount += 1;
  safeWriteStorage(STORAGE_KEY_STATS, stats);
}

/** Enregistre une résolution (conversation utile) */
export function recordResolution(): void {
  const stats          = loadRawStats();
  stats.resolvedCount += 1;
  safeWriteStorage(STORAGE_KEY_STATS, stats);
}

/** Calcule les stats pour le BackOffice */
export function computeStats(): TantieStats {
  const raw   = loadRawStats();
  const today = new Date().toISOString().split('T')[0];

  const sessionsAujourdHui = raw.sessionDates.filter(d => d === today).length;
  const messagesAujourdHui = raw.messageDates.filter(d => d === today).length;

  const intentionsLesPlus = (
    Object.entries(raw.intentCounts) as [TantieIntentCategory, number][]
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  const tauxResolution = raw.totalConversations > 0
    ? Math.round((raw.resolvedCount / raw.totalConversations) * 100)
    : 0;

  const noteUtilisateurs = raw.ratingsCount > 0
    ? Math.round((raw.ratingsSum / raw.ratingsCount) * 10) / 10
    : 4.2;

  const rolesActifs = Object.entries(raw.roleCounts)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  const evolution7j: { date: string; sessions: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr  = d.toISOString().split('T')[0];
    const sessions = raw.sessionDates.filter(s => s === dateStr).length;
    evolution7j.push({ date: dateStr, sessions });
  }

  return {
    totalSessions:      raw.totalSessions,
    totalMessages:      raw.totalMessages,
    sessionsAujourdHui,
    messagesAujourdHui,
    intentionsLesPlus,
    tauxResolution,
    noteUtilisateurs,
    rolesActifs,
    evolutionSemaine:   evolution7j,
  };
}

/** Réinitialisation totale des stats globales (admin) */
export function resetAllTantieStats(): void {
  try { localStorage.removeItem(STORAGE_KEY_STATS); } catch {}
}

/** Messages récents de la session courante d'un utilisateur */
export function getRecentMessages(userId: string, limit = 20): TantieMessage[] {
  const session = loadCurrentSession(userId);
  if (!session) return [];
  return session.messages.slice(-limit);
}
