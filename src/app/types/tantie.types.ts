/**
 * TANTIE SAGESSE - Système de types complet
 * Agent IA conversationnel de Jùlaba
 *
 * Tantie Sagesse est l'assistante IA vocale et textuelle
 * qui accompagne tous les 6 profils utilisateurs de la plateforme.
 */

import { UserRole } from './julaba.types';

// ============================================================================
// INTENTIONS (ce que l'utilisateur veut faire)
// ============================================================================

export type TantieIntentCategory =
  | 'STOCK'          // Gestion du stock marchand
  | 'VENTE'          // Enregistrer une vente
  | 'PRIX'           // Consulter / comparer les prix marché
  | 'COMMANDE'       // Créer ou suivre une commande
  | 'CAISSE'         // Bilan journalier, fond de caisse
  | 'WALLET'         // Solde, rechargement, historique
  | 'RECOLTE'        // Publier ou gérer une récolte (producteur)
  | 'COOPERATIVE'    // Infos / actions coopérative
  | 'SCORE'          // Score Jùlaba, badges, progression
  | 'ACADEMY'        // Formations, leçons
  | 'MARCHE'         // Marketplace, annonces
  | 'SUPPORT'        // Aide, contact, ticket
  | 'PROFIL'         // Infos personnelles, carte
  | 'ALERTE'         // Alertes et notifications
  | 'METEO'          // Conseils météo / saisonnalité
  | 'CONSEIL'        // Conseils généraux business
  | 'SALUTATION'     // Bonjour, merci, au revoir
  | 'INCONNU';       // Intention non reconnue

export type TantieConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TantieIntent {
  category: TantieIntentCategory;
  confidence: TantieConfidence;
  entities: TantieEntity[];
  rawText: string;
  normalizedText: string;
}

// ============================================================================
// ENTITÉS (données extraites du message)
// ============================================================================

export type TantieEntityType =
  | 'PRODUIT'        // Tomate, riz, maïs…
  | 'QUANTITE'       // 10 kg, 5 sacs…
  | 'PRIX'           // 500 FCFA, 1200 par kilo…
  | 'DATE'           // aujourd'hui, demain, la semaine prochaine…
  | 'ZONE'           // Adjamé, Bouaké, Korhogo…
  | 'PERSONNE'       // Awa, Kofi, le client…
  | 'ACTION'         // vendre, acheter, publier…
  | 'NOMBRE';        // chiffres génériques

export interface TantieEntity {
  type: TantieEntityType;
  value: string;
  rawValue: string;
  confidence: TantieConfidence;
}

// ============================================================================
// CONTEXTE UTILISATEUR (enrichit les réponses)
// ============================================================================

export interface TantieUserContext {
  userId: string;
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  nom: string;
  prenoms: string;
  commune?: string;
  score: number;
  // Données métier selon le rôle
  stockItems?: TantieStockSummary[];
  recoltes?: TantieRecolteSummary[];
  dernierBilan?: TantieBilanSummary;
  walletSolde?: number;
  commandesEnCours?: number;
  alertesNonLues?: number;
}

export interface TantieStockSummary {
  nom: string;
  quantite: number;
  unite: string;
  seuilAlerte: number;
  estCritique: boolean;
}

export interface TantieRecolteSummary {
  produit: string;
  quantiteRestante: number;
  prixUnitaire: number;
  statut: string;
}

export interface TantieBilanSummary {
  date: string;
  totalVentes: number;
  totalDepenses: number;
  beneficeNet: number;
  nombreTransactions: number;
}

// ============================================================================
// MESSAGES CONVERSATION
// ============================================================================

export type TantieMessageRole = 'user' | 'assistant' | 'system';
export type TantieMessageMode = 'text' | 'voice';

export interface TantieMessage {
  id: string;
  role: TantieMessageRole;
  content: string;
  timestamp: string;
  mode: TantieMessageMode;
  intent?: TantieIntent;
  actions?: TantieAction[];
  isLoading?: boolean;
  emotion?: TantieEmotion;
}

// ============================================================================
// ÉMOTIONS / TONALITÉ DES RÉPONSES
// ============================================================================

export type TantieEmotion =
  | 'ENCOURAGE'   // Bravo, continue !
  | 'ALERTE'      // Attention, risque
  | 'INFO'        // Information neutre
  | 'QUESTION'    // Demande de précision
  | 'CELEBRE'     // Grande réussite
  | 'CONSOLIDE'   // Encouragement après difficulté
  | 'SAGE';       // Conseil posé et réfléchi

// ============================================================================
// ACTIONS RAPIDES (boutons suggérés après une réponse)
// ============================================================================

export interface TantieAction {
  id: string;
  label: string;
  icon: string;          // Nom de l'icône lucide-react
  route?: string;        // Navigation directe
  payload?: Record<string, unknown>;
}

// ============================================================================
// CONVERSATION SESSION
// ============================================================================

export interface TantieSession {
  id: string;
  userId: string;
  role: TantieUserContext['role'];
  messages: TantieMessage[];
  context: TantieUserContext;
  startedAt: string;
  lastActivityAt: string;
  totalMessages: number;
}

// ============================================================================
// CONFIGURATION TANTIE (BackOffice)
// ============================================================================

export interface TantieConfig {
  // Activation par profil
  enabledForRoles: ('marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur')[];

  // Voix
  voiceEnabled: boolean;
  voiceLanguage: 'fr-CI' | 'fr-FR' | 'dioula' | 'baoule';
  speechRate: number;    // 0.5 - 2.0
  speechPitch: number;   // 0.5 - 2.0
  speechVolume: number;  // 0.0 - 1.0

  // Personnalité
  nom: string;           // "Tantie Sagesse" par défaut
  styleReponse: 'FORMEL' | 'CHALEUREUX' | 'DIRECT';
  longueurReponse: 'COURTE' | 'MOYENNE' | 'LONGUE';
  utiliseDioula: boolean;      // Quelques mots en dioula
  utiliseBaoule: boolean;      // Quelques mots en baoulé

  // Limites
  maxMessagesParSession: number;
  delaiTimeoutSession: number;   // minutes

  // Fonctionnalités
  suggestionsRapidesEnabled: boolean;
  actionsRapidesEnabled: boolean;
  analyseStockEnabled: boolean;
  alertesProactivesEnabled: boolean;
  conseilsPrixEnabled: boolean;

  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// TEMPLATES DE RÉPONSES
// ============================================================================

export interface TantieResponseTemplate {
  id: string;
  intentCategory: TantieIntentCategory;
  role?: TantieUserContext['role'];         // null = tous les rôles
  emotion: TantieEmotion;
  templates: string[];                       // Plusieurs variantes pour varier
  requiredEntities?: TantieEntityType[];
  followUpActions?: Omit<TantieAction, 'id'>[];
}

// ============================================================================
// RÉSULTAT DE GÉNÉRATION
// ============================================================================

export interface TantieResponse {
  text: string;
  emotion: TantieEmotion;
  actions: TantieAction[];
  intent: TantieIntent;
  confidence: TantieConfidence;
  shouldSpeak: boolean;
  processingTimeMs: number;
}

// ============================================================================
// STATISTIQUES D'USAGE (BackOffice)
// ============================================================================

export interface TantieStats {
  totalSessions: number;
  totalMessages: number;
  sessionsAujourdHui: number;
  messagesAujourdHui: number;
  intentionsLesPlus: { category: TantieIntentCategory; count: number }[];
  tauxResolution: number;       // % de questions résolues sans escalade
  noteUtilisateurs: number;     // Note moyenne 1-5
  rolesActifs: { role: string; count: number }[];
  evolutionSemaine: { date: string; sessions: number }[];
}
