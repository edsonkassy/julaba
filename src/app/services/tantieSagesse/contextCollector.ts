/**
 * TANTIE SAGESSE - Collecteur de contexte utilisateur
 *
 * Ce service collecte et normalise toutes les données métier
 * disponibles pour enrichir les réponses de Tantie Sagesse.
 *
 * ISOLATION TOTALE : toutes les lectures localStorage utilisent des clés
 * préfixées par userId via AIStorageKeys.getUserStorageKeys(userId).
 * Aucune clé globale partagée n'est lue ici.
 */

import type {
  TantieUserContext,
  TantieStockSummary,
  TantieRecolteSummary,
  TantieBilanSummary,
} from '../../types/tantie.types';

import { getUserStorageKeys, safeReadStorage } from './AIStorageKeys';

// ============================================================================
// COLLECTE STOCK MARCHAND — préfixée par userId
// ============================================================================

export function collectStockContext(userId: string): TantieStockSummary[] {
  const keys = getUserStorageKeys(userId);
  const products = safeReadStorage<any[]>(keys.STOCK, []);

  return products.map((p: any) => ({
    nom:          p.name || p.nom || 'Produit inconnu',
    quantite:     Number(p.quantity ?? p.stock ?? 0),
    unite:        p.unit || p.unite || 'kg',
    seuilAlerte:  Number(p.alertThreshold ?? p.seuil ?? 5),
    estCritique:  Number(p.quantity ?? p.stock ?? 0) <= Number(p.alertThreshold ?? p.seuil ?? 5),
  }));
}

// ============================================================================
// COLLECTE RÉCOLTES PRODUCTEUR — préfixée par userId
// ============================================================================

export function collectRecolteContext(userId: string): TantieRecolteSummary[] {
  const keys = getUserStorageKeys(userId);
  const recoltes = safeReadStorage<any[]>(keys.RECOLTES, []);

  return recoltes
    .filter((r: any) => r.status !== 'SOLD_OUT' && r.status !== 'RETIREE')
    .map((r: any) => ({
      produit:          r.produit || r.product || 'Récolte',
      quantiteRestante: Number(r.stockRestant ?? r.quantiteRecoltee ?? 0),
      prixUnitaire:     Number(r.prixUnitaire ?? r.price ?? 0),
      statut:           r.status || 'EN_LIGNE',
    }));
}

// ============================================================================
// COLLECTE BILAN JOURNALIER — préfixée par userId
// ============================================================================

export function collectBilanContext(userId: string): TantieBilanSummary | undefined {
  const keys = getUserStorageKeys(userId);
  const transactions = safeReadStorage<any[]>(keys.TRANSACTIONS, []);
  if (!transactions.length) return undefined;

  const today = new Date().toISOString().split('T')[0];
  const todayTx = transactions.filter((t: any) => {
    const txDate = (t.date || t.createdAt || '').split('T')[0];
    return txDate === today;
  });

  if (!todayTx.length) return undefined;

  const totalVentes = todayTx
    .filter((t: any) => t.type === 'vente')
    .reduce((sum: number, t: any) => sum + Number(t.price ?? t.montant ?? 0), 0);

  const totalDepenses = todayTx
    .filter((t: any) => t.type === 'depense' || t.type === 'achat')
    .reduce((sum: number, t: any) => sum + Number(t.price ?? t.montant ?? 0), 0);

  return {
    date:                today,
    totalVentes,
    totalDepenses,
    beneficeNet:         totalVentes - totalDepenses,
    nombreTransactions:  todayTx.length,
  };
}

// ============================================================================
// COLLECTE WALLET — préfixée par userId
// ============================================================================

export function collectWalletSolde(userId: string): number | undefined {
  const keys = getUserStorageKeys(userId);
  const wallet = safeReadStorage<any>(keys.WALLET, null);
  if (!wallet) return undefined;
  return Number(wallet.balance ?? wallet.solde ?? 0);
}

// ============================================================================
// COLLECTE COMMANDES EN COURS — préfixée par userId
// ============================================================================

export function collectCommandesEnCours(userId: string): number {
  const keys = getUserStorageKeys(userId);
  const commandes = safeReadStorage<any[]>(keys.COMMANDES, []);
  const activeStatuses = ['EN_ATTENTE', 'EN_NEGOCIATION', 'ACCEPTEE', 'PAYEE', 'EN_LIVRAISON'];
  return commandes.filter((c: any) => activeStatuses.includes(c.status)).length;
}

// ============================================================================
// COLLECTE ALERTES NON LUES — préfixée par userId
// ============================================================================

export function collectAlertesNonLues(userId: string): number {
  const keys = getUserStorageKeys(userId);
  const notifs = safeReadStorage<any[]>(keys.NOTIFICATIONS, []);
  return notifs.filter((n: any) => !n.read && !n.lue).length;
}

// ============================================================================
// COLLECTE SCORE — préfixée par userId
// ============================================================================

export function collectScore(userId: string, userScore?: number): number {
  const keys = getUserStorageKeys(userId);
  const scoreData = safeReadStorage<any>(keys.SCORE, null);
  return Number(scoreData?.scoreTotal ?? userScore ?? 75);
}

// ============================================================================
// COLLECTEUR PRINCIPAL — assemble tout le contexte (ISOLATION TOTALE)
// ============================================================================

export function buildUserContext(userData: any): TantieUserContext {
  const role   = userData?.role || 'marchand';
  const userId = userData?.id   || 'user-001';

  const context: TantieUserContext = {
    userId,
    role,
    nom:              userData?.nom      || userData?.lastName  || 'Utilisateur',
    prenoms:          userData?.prenoms  || userData?.firstName || '',
    commune:          userData?.commune  || userData?.localisation || '',
    score:            collectScore(userId, userData?.scoreCredit ?? userData?.score),
    alertesNonLues:   collectAlertesNonLues(userId),
    commandesEnCours: collectCommandesEnCours(userId),
  };

  // Enrichissement selon le rôle — chaque rôle n'accède qu'à ses propres données
  if (role === 'marchand') {
    context.stockItems   = collectStockContext(userId);
    context.dernierBilan = collectBilanContext(userId);
    context.walletSolde  = collectWalletSolde(userId);
  }

  if (role === 'producteur') {
    context.recoltes    = collectRecolteContext(userId);
    context.walletSolde = collectWalletSolde(userId);
  }

  if (role === 'cooperative') {
    context.walletSolde      = collectWalletSolde(userId);
    context.commandesEnCours = collectCommandesEnCours(userId);
  }

  // institution et identificateur : uniquement les données communes (score, alertes)

  return context;
}

// ============================================================================
// RÉSUMÉ TEXTUEL DU CONTEXTE (pour enrichir le prompt IA)
// ============================================================================

export function summarizeContextForPrompt(ctx: TantieUserContext): string {
  const lines: string[] = [];

  lines.push(`Utilisateur : ${ctx.prenoms} ${ctx.nom} (${ctx.role})`);
  if (ctx.commune) lines.push(`Zone : ${ctx.commune}`);
  lines.push(`Score Jùlaba : ${ctx.score}/100`);

  if (ctx.alertesNonLues && ctx.alertesNonLues > 0) {
    lines.push(`Alertes non lues : ${ctx.alertesNonLues}`);
  }

  if (ctx.commandesEnCours && ctx.commandesEnCours > 0) {
    lines.push(`Commandes en cours : ${ctx.commandesEnCours}`);
  }

  if (ctx.walletSolde !== undefined) {
    lines.push(`Solde Wallet : ${ctx.walletSolde.toLocaleString('fr-FR')} FCFA`);
  }

  if (ctx.stockItems && ctx.stockItems.length > 0) {
    const critiques = ctx.stockItems.filter(s => s.estCritique);
    lines.push(`Stock : ${ctx.stockItems.length} produits`);
    if (critiques.length > 0) {
      lines.push(`Stock critique : ${critiques.map(s => s.nom).join(', ')}`);
    }
  }

  if (ctx.recoltes && ctx.recoltes.length > 0) {
    lines.push(`Récoltes en ligne : ${ctx.recoltes.length}`);
  }

  if (ctx.dernierBilan) {
    lines.push(`Bilan du jour : ${ctx.dernierBilan.totalVentes.toLocaleString('fr-FR')} FCFA de ventes`);
  }

  return lines.join('\n');
}
