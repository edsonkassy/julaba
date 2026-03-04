/**
 * TANTIE SAGESSE - Analyseur d'intention
 *
 * Parse le texte brut de l'utilisateur (ou la transcription vocale)
 * pour identifier l'intention principale et extraire les entités clés.
 *
 * Fonctionne 100% hors-ligne sans API externe.
 * Conçu pour le français ivoirien avec dialecte inclus.
 */

import type {
  TantieIntent,
  TantieIntentCategory,
  TantieEntity,
  TantieEntityType,
  TantieConfidence,
} from '../../types/tantie.types';

// ============================================================================
// DICTIONNAIRES DE RECONNAISSANCE
// ============================================================================

/** Synonymes ivoiriens et français pour normaliser les mots clés */
const NORMALIZATIONS: Record<string, string> = {
  // Produits
  'tomate':     'tomate',
  'tomato':     'tomate',
  'gombo':      'gombo',
  'gumbo':      'gombo',
  'riz':        'riz',
  'mais':       'maïs',
  'maïs':       'maïs',
  'igname':     'igname',
  'attiéké':    'attiéké',
  'attieke':    'attiéké',
  'manioc':     'manioc',
  'plantain':   'plantain',
  'banane':     'banane plantain',
  'arachide':   'arachide',
  'piment':     'piment',
  'oignon':     'oignon',
  'onion':      'oignon',
  // Unités
  'kilo':       'kg',
  'kilogramme': 'kg',
  'sac':        'sac',
  'sacs':       'sac',
  'tonne':      'tonne',
  'tas':        'tas',
  'boite':      'boite',
  // Actions
  'vend':       'vendre',
  'vendu':      'vendre',
  'vendre':     'vendre',
  'acheté':     'acheter',
  'achete':     'acheter',
  'acheter':    'acheter',
  'publier':    'publier',
  'publié':     'publier',
  'vérif':      'vérifier',
  'donne':      'donner',
};

// ============================================================================
// PATTERNS D'INTENTION (ordre de priorité descendante)
// ============================================================================

interface IntentPattern {
  category: TantieIntentCategory;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    category: 'SALUTATION',
    patterns: [
      /^(bonjour|bonsoir|salut|allo|hello|hi|hey|coucou)/i,
      /(merci|au revoir|bonne journée|bonne nuit|à bientôt|adieu)/i,
    ],
    keywords: ['bonjour', 'bonsoir', 'salut', 'merci', 'revoir', 'bientôt', 'tantie', 'sagesse'],
    weight: 10,
  },
  {
    category: 'STOCK',
    patterns: [
      /(stock|inventaire|produit|quantité|rupture|réapprovisionn)/i,
      /(combien.*en stock|qu.*est.*stock|état.*stock|niveau.*stock)/i,
      /(ajouter.*stock|retirer.*stock|modifier.*stock)/i,
    ],
    keywords: ['stock', 'inventaire', 'rupture', 'produit', 'quantité', 'réapprovisionner', 'stocker'],
    weight: 9,
  },
  {
    category: 'VENTE',
    patterns: [
      /(vend|vendu|vente|encaisser|client|transaction)/i,
      /(j.*ai vendu|enregistr.*vente|ajouter.*vente)/i,
      /(combien.*vendu|total.*ventes|recap.*ventes)/i,
    ],
    keywords: ['vente', 'vendre', 'vendu', 'client', 'encaisser', 'transaction', 'ventes'],
    weight: 9,
  },
  {
    category: 'CAISSE',
    patterns: [
      /(caisse|bilan|journée|fond|solde.*jour|clôture|ouverture)/i,
      /(combien.*fait|total.*jour|récap.*jour|journée.*terminé)/i,
      /(bénéfice|profit|perte|recette|dépense)/i,
    ],
    keywords: ['caisse', 'bilan', 'journée', 'fond', 'bénéfice', 'profit', 'dépense', 'recette', 'clôture'],
    weight: 8,
  },
  {
    category: 'PRIX',
    patterns: [
      /(prix|tarif|combien.*coûte|quel.*prix|cours|marché.*prix)/i,
      /(prix.*aujourd|prix.*semaine|évolution.*prix|hausse|baisse)/i,
    ],
    keywords: ['prix', 'tarif', 'coûte', 'coût', 'cours', 'marché', 'cher', 'moins cher', 'hausse', 'baisse'],
    weight: 8,
  },
  {
    category: 'COMMANDE',
    patterns: [
      /(commande|commander|passer.*commande|suivi.*commande)/i,
      /(livraison|livré|livrer|réception|confirmer)/i,
      /(producteur|fournisseur|acheter.*chez)/i,
    ],
    keywords: ['commande', 'commander', 'livraison', 'livré', 'producteur', 'fournisseur', 'confirmer'],
    weight: 8,
  },
  {
    category: 'RECOLTE',
    patterns: [
      /(récolte|récolté|publier.*récolte|mise.*en.*vente|récolter)/i,
      /(champ|parcelle|culture|production|récolter)/i,
    ],
    keywords: ['récolte', 'récolté', 'publier', 'champ', 'parcelle', 'culture', 'production', 'récolter'],
    weight: 8,
  },
  {
    category: 'WALLET',
    patterns: [
      /(wallet|solde|argent|compte|recharger|retirer|transférer)/i,
      /(mobile money|orange money|mtn|moov|wave)/i,
      /(combien.*argent|solde.*wallet|mon.*solde)/i,
    ],
    keywords: ['wallet', 'solde', 'argent', 'compte', 'recharger', 'retirer', 'transfert', 'orange', 'mtn', 'moov'],
    weight: 8,
  },
  {
    category: 'COOPERATIVE',
    patterns: [
      /(coopérative|coop|membres|cotisation|trésorerie|assemblée)/i,
      /(réunion.*coop|achat.*groupé|commande.*groupée)/i,
    ],
    keywords: ['coopérative', 'coop', 'membres', 'cotisation', 'trésorerie', 'groupé'],
    weight: 7,
  },
  {
    category: 'SCORE',
    patterns: [
      /(score|badge|niveau|points|réputation|notation)/i,
      /(bronze|argent|or|platine|améliorer.*score|mon.*niveau)/i,
    ],
    keywords: ['score', 'badge', 'niveau', 'points', 'réputation', 'bronze', 'argent', 'or', 'platine'],
    weight: 7,
  },
  {
    category: 'ACADEMY',
    patterns: [
      /(formation|apprendre|cours|leçon|academy|tutoriel|module)/i,
      /(comment.*faire|je.*veux.*apprendre|m.*expliquer)/i,
    ],
    keywords: ['formation', 'apprendre', 'cours', 'leçon', 'academy', 'tutoriel', 'module', 'apprends'],
    weight: 7,
  },
  {
    category: 'MARCHE',
    patterns: [
      /(marché|marketplace|annonce|offre|disponible.*marché)/i,
      /(acheter.*marché|vendre.*marché|trouver.*producteur)/i,
    ],
    keywords: ['marché', 'marketplace', 'annonce', 'offre', 'vente en ligne'],
    weight: 7,
  },
  {
    category: 'SUPPORT',
    patterns: [
      /(aide|problème|erreur|bug|contact|signaler|ticket)/i,
      /(ça.*marche.*pas|impossible|ne.*fonctionne|support)/i,
    ],
    keywords: ['aide', 'problème', 'erreur', 'bug', 'contact', 'signaler', 'ticket', 'support'],
    weight: 6,
  },
  {
    category: 'PROFIL',
    patterns: [
      /(profil|mon.*compte|mes.*infos|carte.*pro|modifier.*profil)/i,
      /(numéro.*julaba|mon.*numéro|coordonnées)/i,
    ],
    keywords: ['profil', 'compte', 'infos', 'carte', 'numéro', 'julaba', 'coordonnées'],
    weight: 6,
  },
  {
    category: 'ALERTE',
    patterns: [
      /(alerte|notification|avertissement|urgence|critique)/i,
      /(mes.*alertes|voir.*alertes|notifications.*non lues)/i,
    ],
    keywords: ['alerte', 'notification', 'avertissement', 'urgence', 'critique', 'non lue'],
    weight: 6,
  },
  {
    category: 'METEO',
    patterns: [
      /(météo|saison|pluie|sécheresse|chaleur|période.*récolte)/i,
      /(quand.*planter|meilleure.*saison|saison.*des pluies)/i,
    ],
    keywords: ['météo', 'saison', 'pluie', 'sécheresse', 'chaleur', 'planter', 'récolte', 'période'],
    weight: 5,
  },
  {
    category: 'CONSEIL',
    patterns: [
      /(conseil|recommande|que.*faire|comment|astuce|améliorer)/i,
      /(que.*penses|qu.*est-ce.*que.*tu|donne.*moi.*conseil)/i,
    ],
    keywords: ['conseil', 'recommande', 'astuce', 'améliorer', 'faire', 'comment', 'penses', 'avis'],
    weight: 4,
  },
];

// ============================================================================
// EXTRACTION D'ENTITÉS
// ============================================================================

const PRODUITS_VIVRIERS = [
  'tomate', 'gombo', 'riz', 'maïs', 'mais', 'igname', 'attiéké', 'attieke',
  'manioc', 'plantain', 'banane', 'arachide', 'piment', 'oignon', 'aubergine',
  'chou', 'carotte', 'épinard', 'épinards', 'haricot', 'haricots', 'poivron',
  'patate', 'gingembre', 'curcuma', 'fonio', 'sorgho', 'mil', 'niébé',
  'papaye', 'ananas', 'mangue', 'orange', 'citron', 'noix de coco', 'noix',
];

const ZONES_COTE_IVOIRE = [
  "abidjan", "adjamé", "yopougon", "abobo", "koumassi", "marcory",
  "treichville", "cocody", "plateau", "bouaké", "korhogo", "daloa",
  "san-pedro", "yamoussoukro", "man", "gagnoa", "abengourou", "bondoukou",
  "divo", "guiglo", "odienné", "séguéla", "touba", "ferkessédougou",
];

function extractEntities(text: string): TantieEntity[] {
  const entities: TantieEntity[] = [];
  const lower = text.toLowerCase();

  // Produits vivriers
  for (const produit of PRODUITS_VIVRIERS) {
    if (lower.includes(produit)) {
      entities.push({
        type: 'PRODUIT',
        value: NORMALIZATIONS[produit] || produit,
        rawValue: produit,
        confidence: 'HIGH',
      });
    }
  }

  // Quantités (nombre + unité)
  const quantityRegex = /(\d+[\.,]?\d*)\s*(kg|kilo|kilogramme|g|tonne|sac|sacs|boite|tas|unité|unités|pièce|pièces)/gi;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = quantityRegex.exec(text)) !== null) {
    entities.push({
      type: 'QUANTITE',
      value: `${qMatch[1]} ${NORMALIZATIONS[qMatch[2].toLowerCase()] || qMatch[2]}`,
      rawValue: qMatch[0],
      confidence: 'HIGH',
    });
  }

  // Prix (nombre + FCFA ou franc)
  const prixRegex = /(\d[\d\s]*)\s*(fcfa|franc|francs|cfa|f\.?cfa)/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = prixRegex.exec(text)) !== null) {
    entities.push({
      type: 'PRIX',
      value: pMatch[1].replace(/\s/g, '') + ' FCFA',
      rawValue: pMatch[0],
      confidence: 'HIGH',
    });
  }

  // Nombres isolés (potentiellement un prix ou quantité)
  const numberRegex = /\b(\d{3,})\b/g;
  let nMatch: RegExpExecArray | null;
  while ((nMatch = numberRegex.exec(text)) !== null) {
    const val = parseInt(nMatch[1]);
    if (val >= 100) {
      entities.push({
        type: 'NOMBRE',
        value: String(val),
        rawValue: nMatch[0],
        confidence: 'MEDIUM',
      });
    }
  }

  // Dates
  const dateKeywords: Record<string, string> = {
    "aujourd'hui": 'aujourd_hui',
    "aujourd'hui": 'aujourd_hui',
    "maintenant": 'maintenant',
    "demain": 'demain',
    "hier": 'hier',
    "cette semaine": 'cette_semaine',
    "ce mois": 'ce_mois',
    "semaine dernière": 'semaine_derniere',
  };
  for (const [keyword, normalized] of Object.entries(dateKeywords)) {
    if (lower.includes(keyword)) {
      entities.push({
        type: 'DATE',
        value: normalized,
        rawValue: keyword,
        confidence: 'HIGH',
      });
    }
  }

  // Zones géographiques
  for (const zone of ZONES_COTE_IVOIRE) {
    if (lower.includes(zone)) {
      entities.push({
        type: 'ZONE',
        value: zone.charAt(0).toUpperCase() + zone.slice(1),
        rawValue: zone,
        confidence: 'HIGH',
      });
    }
  }

  return entities;
}

// ============================================================================
// CALCUL DU SCORE D'INTENTION
// ============================================================================

function scoreIntent(text: string, pattern: IntentPattern): number {
  const lower = text.toLowerCase();
  let score = 0;

  // Match par regex (score élevé)
  for (const regex of pattern.patterns) {
    if (regex.test(text)) {
      score += 10 * pattern.weight;
    }
  }

  // Match par mots-clés (score moyen)
  for (const kw of pattern.keywords) {
    if (lower.includes(kw)) {
      score += 4 * pattern.weight;
    }
  }

  return score;
}

// ============================================================================
// NORMALISATION DU TEXTE IVOIRIEN
// ============================================================================

function normalizeText(text: string): string {
  let normalized = text.trim().toLowerCase();

  // Corrections orthographiques communes
  normalized = normalized
    .replace(/j'ai/g, "j'ai")
    .replace(/qu'est/g, "qu'est")
    .replace(/c'est/g, "c'est")
    .replace(/\bsvp\b/g, "s'il vous plaît")
    .replace(/\bstp\b/g, "s'il te plaît")
    .replace(/\bttq\b/g, "tout de suite")
    .replace(/\bpck\b/g, "parce que")
    .replace(/\blol\b/g, '')
    .replace(/\!+/g, '!')
    .replace(/\?+/g, '?');

  // Mots en dioula / baoulé courants traduits
  normalized = normalized
    .replace(/\bin sha allah\b/gi, '')
    .replace(/\bawa\b/gi, 'oui')
    .replace(/\bkoman\b/gi, 'comment ça va')
    .replace(/\bi ni ce\b/gi, 'merci')
    .replace(/\bi ni sogoma\b/gi, 'bonjour')
    .replace(/\bako\b/gi, 'ok')
    .replace(/\bworo woro\b/gi, 'transport');

  return normalized;
}

// ============================================================================
// CALCUL DE LA CONFIANCE
// ============================================================================

function computeConfidence(maxScore: number, totalScores: number): TantieConfidence {
  if (maxScore === 0) return 'LOW';
  const ratio = maxScore / Math.max(totalScores, 1);
  if (maxScore >= 80 && ratio >= 0.5) return 'HIGH';
  if (maxScore >= 30 && ratio >= 0.3) return 'MEDIUM';
  return 'LOW';
}

// ============================================================================
// PARSEUR PRINCIPAL
// ============================================================================

export function parseIntent(rawText: string): TantieIntent {
  const normalizedText = normalizeText(rawText);
  const entities = extractEntities(rawText);

  // Calculer le score pour chaque intention
  const scores: { pattern: IntentPattern; score: number }[] = INTENT_PATTERNS.map(p => ({
    pattern: p,
    score: scoreIntent(normalizedText, p),
  }));

  // Trier par score décroissant
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const totalScore = scores.reduce((s, p) => s + p.score, 0);

  const category: TantieIntentCategory = best.score > 0 ? best.pattern.category : 'INCONNU';
  const confidence = computeConfidence(best.score, totalScore);

  return {
    category,
    confidence,
    entities,
    rawText,
    normalizedText,
  };
}

// ============================================================================
// HELPERS D'EXTRACTION D'ENTITÉS SPÉCIFIQUES
// ============================================================================

export function extractProduit(intent: TantieIntent): string | undefined {
  return intent.entities.find(e => e.type === 'PRODUIT')?.value;
}

export function extractQuantite(intent: TantieIntent): string | undefined {
  return intent.entities.find(e => e.type === 'QUANTITE')?.value;
}

export function extractPrix(intent: TantieIntent): string | undefined {
  return intent.entities.find(e => e.type === 'PRIX')?.value;
}

export function extractZone(intent: TantieIntent): string | undefined {
  return intent.entities.find(e => e.type === 'ZONE')?.value;
}

export function extractDate(intent: TantieIntent): string | undefined {
  return intent.entities.find(e => e.type === 'DATE')?.value;
}
