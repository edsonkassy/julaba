/**
 * TANTIE SAGESSE — Gestionnaire centralisé des clés localStorage
 *
 * RÈGLE ABSOLUE : Toute clé localStorage liée à Jùlaba doit être préfixée
 * par l'userId pour garantir l'isolation totale entre utilisateurs
 * sur un même appareil (téléphone partagé, famille, etc.).
 *
 * Avant correction : clés globales partagées → fuite inter-utilisateurs possible
 * Après correction  : clés préfixées par userId → isolation totale
 */

// ============================================================================
// CLÉS GLOBALES (non liées à un user : config IA, tantie session BO)
// ============================================================================

export const GLOBAL_KEYS = {
  TANTIE_CONFIG: 'julaba_tantie_config',
} as const;

// ============================================================================
// CLÉS PRÉFIXÉES PAR USER — génération dynamique
// ============================================================================

export function getUserStorageKeys(userId: string) {
  const p = `julaba_${userId}`;
  return {
    // Données métier
    STOCK:          `${p}_stock_products`,
    TRANSACTIONS:   `${p}_transactions`,
    CAISSE:         `${p}_caisse_session`,
    RECOLTES:       `${p}_recoltes`,
    WALLET:         `${p}_wallet`,
    COMMANDES:      `${p}_commandes`,
    NOTIFICATIONS:  `${p}_notifications`,
    SCORE:          `${p}_score`,
    // Sessions Tantie
    TANTIE_SESSION: `${p}_tantie_session`,
    TANTIE_HISTORY: `${p}_tantie_history`,
    TANTIE_STATS:   `${p}_tantie_stats`,
    // Logs IA
    AI_LOG:         `${p}_ai_actions_log`,
  } as const;
}

// ============================================================================
// CLÉS ANCIENNES (globales sans userId) — pour la migration
// ============================================================================

const LEGACY_KEYS = {
  STOCK:               'julaba_stock_products',
  TRANSACTIONS:        'julaba_transactions',
  CAISSE:              'julaba_caisse_session',
  RECOLTES:            'julaba_recoltes',
  WALLET:              'julaba_wallet',
  COMMANDES:           'julaba_commandes',
  NOTIFICATIONS:       'julaba_notifications',
  SCORE:               'julaba_score',
  TANTIE_SESSION:      'julaba_tantie_session_current',
  TANTIE_HISTORY:      'julaba_tantie_sessions_history',
  TANTIE_STATS:        'julaba_tantie_stats',
} as const;

// ============================================================================
// MIGRATION : anciennes clés globales → clés préfixées par userId
//
// À appeler UNE FOIS au login de l'utilisateur, si les données anciennes
// existent encore en localStorage.
// ============================================================================

export function migrateUserStorageKeys(userId: string): void {
  const newKeys = getUserStorageKeys(userId);
  const migrations: Array<{ legacy: string; current: string }> = [
    { legacy: LEGACY_KEYS.STOCK,         current: newKeys.STOCK },
    { legacy: LEGACY_KEYS.TRANSACTIONS,  current: newKeys.TRANSACTIONS },
    { legacy: LEGACY_KEYS.CAISSE,        current: newKeys.CAISSE },
    { legacy: LEGACY_KEYS.RECOLTES,      current: newKeys.RECOLTES },
    { legacy: LEGACY_KEYS.WALLET,        current: newKeys.WALLET },
    { legacy: LEGACY_KEYS.COMMANDES,     current: newKeys.COMMANDES },
    { legacy: LEGACY_KEYS.NOTIFICATIONS, current: newKeys.NOTIFICATIONS },
    { legacy: LEGACY_KEYS.SCORE,         current: newKeys.SCORE },
    { legacy: LEGACY_KEYS.TANTIE_SESSION,current: newKeys.TANTIE_SESSION },
    { legacy: LEGACY_KEYS.TANTIE_HISTORY,current: newKeys.TANTIE_HISTORY },
    { legacy: LEGACY_KEYS.TANTIE_STATS,  current: newKeys.TANTIE_STATS },
  ];

  const migrationFlagKey = `julaba_${userId}_migrated_v2`;

  // Vérifier si la migration a déjà été effectuée pour cet userId
  if (localStorage.getItem(migrationFlagKey) === '1') return;

  let migratedCount = 0;

  for (const { legacy, current } of migrations) {
    const existingNew = localStorage.getItem(current);
    const existingOld = localStorage.getItem(legacy);

    // Migrer uniquement si : données anciennes présentes ET destination vide
    if (existingOld && !existingNew) {
      try {
        localStorage.setItem(current, existingOld);
        migratedCount++;
      } catch {
        // localStorage plein — ignorer silencieusement
      }
      // Ne pas supprimer l'ancienne clé — d'autres utilisateurs pourraient en dépendre
    }
  }

  // Marquer la migration comme effectuée pour cet userId
  try {
    localStorage.setItem(migrationFlagKey, '1');
  } catch {}

  if (migratedCount > 0) {
    console.info(`[AIStorageKeys] Migration: ${migratedCount} clés migrées pour userId=${userId}`);
  }
}

// ============================================================================
// HELPER LECTURE SÉCURISÉE
// ============================================================================

export function safeReadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeWriteStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage plein ou bloqué
  }
}
