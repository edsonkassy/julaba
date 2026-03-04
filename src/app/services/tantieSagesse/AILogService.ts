/**
 * TANTIE SAGESSE — AILogService
 *
 * Journalisation structurée de chaque action IA.
 * Chaque entrée est immuable une fois écrite (append-only).
 * Les logs sont préfixés par userId → isolation totale.
 * Accessibles uniquement via le BackOffice (BOTantie → onglet Historique).
 *
 * Structure de chaque entrée :
 * {
 *   id        : identifiant unique
 *   userId    : utilisateur auteur de la demande
 *   role      : rôle au moment de l'action
 *   action    : catégorie d'intent (ex: "STOCK", "VENTE")
 *   payload   : texte brut de la demande + entités extraites
 *   confirmed : null (non-applicable), true (confirmé), false (refusé/échoué)
 *   timestamp : ISO 8601
 *   result    : 'ACCEPTED' | 'REFUSED' | 'FAILED'
 *   reason    : explication si refusé/échoué
 * }
 */

import { getUserStorageKeys, safeReadStorage, safeWriteStorage } from './AIStorageKeys';
import type { TantieIntentCategory, TantieEntity } from '../../types/tantie.types';

// ============================================================================
// TYPES
// ============================================================================

export type AILogResult = 'ACCEPTED' | 'REFUSED' | 'FAILED';

export interface AILogEntry {
  id:         string;
  userId:     string;
  role:       string;
  action:     TantieIntentCategory;
  payload: {
    rawText:  string;
    entities: TantieEntity[];
  };
  confirmed:  boolean | null;   // null = non-applicable (actions lecture seule)
  timestamp:  string;           // ISO 8601
  result:     AILogResult;
  reason?:    string;           // Raison du refus ou de l'échec
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_LOG_ENTRIES = 500;  // Plafond par userId pour éviter de saturer localStorage

// ============================================================================
// GÉNÉRATION D'ID
// ============================================================================

let logCounter = 0;
function generateLogId(): string {
  logCounter += 1;
  return `ailog-${Date.now()}-${logCounter}`;
}

// ============================================================================
// LECTURE / ÉCRITURE
// ============================================================================

function readLog(userId: string): AILogEntry[] {
  const keys = getUserStorageKeys(userId);
  return safeReadStorage<AILogEntry[]>(keys.AI_LOG, []);
}

function writeLog(userId: string, entries: AILogEntry[]): void {
  const keys = getUserStorageKeys(userId);
  // Garder seulement les MAX_LOG_ENTRIES entrées les plus récentes
  const capped = entries.slice(0, MAX_LOG_ENTRIES);
  safeWriteStorage(keys.AI_LOG, capped);
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

/**
 * Enregistre une action IA acceptée (réponse fournie à l'utilisateur).
 */
export function logAccepted(params: {
  userId:   string;
  role:     string;
  action:   TantieIntentCategory;
  rawText:  string;
  entities: TantieEntity[];
}): void {
  const entry: AILogEntry = {
    id:        generateLogId(),
    userId:    params.userId,
    role:      params.role,
    action:    params.action,
    payload:   { rawText: params.rawText, entities: params.entities },
    confirmed: null,
    timestamp: new Date().toISOString(),
    result:    'ACCEPTED',
  };
  const current = readLog(params.userId);
  writeLog(params.userId, [entry, ...current]);
}

/**
 * Enregistre une action refusée par le PermissionGuard.
 */
export function logRefused(params: {
  userId:   string;
  role:     string;
  action:   TantieIntentCategory;
  rawText:  string;
  entities: TantieEntity[];
  reason:   string;
}): void {
  const entry: AILogEntry = {
    id:        generateLogId(),
    userId:    params.userId,
    role:      params.role,
    action:    params.action,
    payload:   { rawText: params.rawText, entities: params.entities },
    confirmed: false,
    timestamp: new Date().toISOString(),
    result:    'REFUSED',
    reason:    params.reason,
  };
  const current = readLog(params.userId);
  writeLog(params.userId, [entry, ...current]);
}

/**
 * Enregistre une action qui a échoué (erreur moteur, contexte manquant, etc.).
 */
export function logFailed(params: {
  userId:   string;
  role:     string;
  action:   TantieIntentCategory;
  rawText:  string;
  entities: TantieEntity[];
  reason:   string;
}): void {
  const entry: AILogEntry = {
    id:        generateLogId(),
    userId:    params.userId,
    role:      params.role,
    action:    params.action,
    payload:   { rawText: params.rawText, entities: params.entities },
    confirmed: false,
    timestamp: new Date().toISOString(),
    result:    'FAILED',
    reason:    params.reason,
  };
  const current = readLog(params.userId);
  writeLog(params.userId, [entry, ...current]);
}

/**
 * Enregistre une action critique après confirmation explicite de l'utilisateur.
 */
export function logConfirmed(params: {
  userId:   string;
  role:     string;
  action:   TantieIntentCategory;
  rawText:  string;
  entities: TantieEntity[];
}): void {
  const entry: AILogEntry = {
    id:        generateLogId(),
    userId:    params.userId,
    role:      params.role,
    action:    params.action,
    payload:   { rawText: params.rawText, entities: params.entities },
    confirmed: true,
    timestamp: new Date().toISOString(),
    result:    'ACCEPTED',
  };
  const current = readLog(params.userId);
  writeLog(params.userId, [entry, ...current]);
}

/**
 * Lit tous les logs pour un userId donné (usage BackOffice).
 */
export function getLogs(userId: string): AILogEntry[] {
  return readLog(userId);
}

/**
 * Lit les N derniers logs pour un userId donné.
 */
export function getRecentLogs(userId: string, limit = 50): AILogEntry[] {
  return readLog(userId).slice(0, limit);
}

/**
 * Calcule des statistiques de log pour le BackOffice.
 */
export function getLogStats(userId: string): {
  total: number;
  accepted: number;
  refused: number;
  failed: number;
  byAction: Record<string, number>;
} {
  const logs = readLog(userId);
  const byAction: Record<string, number> = {};

  for (const entry of logs) {
    byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;
  }

  return {
    total:    logs.length,
    accepted: logs.filter(l => l.result === 'ACCEPTED').length,
    refused:  logs.filter(l => l.result === 'REFUSED').length,
    failed:   logs.filter(l => l.result === 'FAILED').length,
    byAction,
  };
}

/**
 * Supprime tous les logs d'un userId (usage admin uniquement).
 */
export function clearLogs(userId: string): void {
  const keys = getUserStorageKeys(userId);
  try {
    localStorage.removeItem(keys.AI_LOG);
  } catch {}
}
