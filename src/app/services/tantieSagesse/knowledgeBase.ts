/**
 * TANTIE SAGESSE - Base de connaissances vivrier ivoirien
 *
 * Toutes les données métier que Tantie Sagesse connaît :
 * - Prix moyens des produits vivriers par saison
 * - Conseils agronomiques et commerciaux
 * - Réglementation ivoirienne (MINADER, CNPS, CNAM)
 * - Proverbes et sagesses locales
 * - Fiches produits
 */

// ============================================================================
// PRIX MOYENS PAR PRODUIT ET SAISON (FCFA/kg)
// ============================================================================

export type Saison = 'GRANDE_SAISON' | 'PETITE_SAISON' | 'SAISON_SECHE';

export interface PrixProduit {
  produit: string;
  categorie: 'LEGUME' | 'FRUIT' | 'CEREALE' | 'TUBERCULE' | 'EPICE';
  prixParSaison: Record<Saison, { min: number; max: number; moyen: number }>;
  unite: string;
  regions: string[];
  conseils: string[];
  periodeOptimale: Saison;
}

export const PRIX_MARCHE: PrixProduit[] = [
  {
    produit: 'Tomate',
    categorie: 'LEGUME',
    prixParSaison: {
      GRANDE_SAISON:  { min: 150, max: 350, moyen: 250 },
      PETITE_SAISON:  { min: 300, max: 600, moyen: 450 },
      SAISON_SECHE:   { min: 400, max: 800, moyen: 600 },
    },
    unite: 'kg',
    regions: ['Abidjan', 'Bouaké', 'Daloa', 'San-Pédro'],
    conseils: [
      'La tomate se vend mieux en saison sèche quand la production baisse.',
      'Stockez dans un endroit frais pour conserver 5 à 7 jours.',
      'Achetez en grande saison des pluies pour de meilleurs prix.',
    ],
    periodeOptimale: 'SAISON_SECHE',
  },
  {
    produit: 'Gombo',
    categorie: 'LEGUME',
    prixParSaison: {
      GRANDE_SAISON:  { min: 200, max: 400, moyen: 300 },
      PETITE_SAISON:  { min: 350, max: 650, moyen: 500 },
      SAISON_SECHE:   { min: 500, max: 900, moyen: 700 },
    },
    unite: 'kg',
    regions: ['Abidjan', 'Korhogo', 'Bouaké'],
    conseils: [
      'Le gombo est très prisé dans le nord. Achetez à Korhogo pour revendre à Abidjan.',
      'Évitez le stockage de plus de 2 jours - il se détériore vite.',
    ],
    periodeOptimale: 'PETITE_SAISON',
  },
  {
    produit: 'Maïs',
    categorie: 'CEREALE',
    prixParSaison: {
      GRANDE_SAISON:  { min: 120, max: 200, moyen: 160 },
      PETITE_SAISON:  { min: 180, max: 280, moyen: 230 },
      SAISON_SECHE:   { min: 250, max: 400, moyen: 320 },
    },
    unite: 'kg',
    regions: ['Bouaké', 'Korhogo', 'Daloa', 'Ferkessédougou'],
    conseils: [
      'Le maïs se stocke bien sec pendant 3 à 6 mois.',
      'Achetez en juillet-août (grande récolte) pour revendre en saison sèche.',
      'La région de Bouaké est le grenier à maïs de la Côte d\'Ivoire.',
    ],
    periodeOptimale: 'SAISON_SECHE',
  },
  {
    produit: 'Igname',
    categorie: 'TUBERCULE',
    prixParSaison: {
      GRANDE_SAISON:  { min: 150, max: 300, moyen: 225 },
      PETITE_SAISON:  { min: 200, max: 400, moyen: 300 },
      SAISON_SECHE:   { min: 300, max: 600, moyen: 450 },
    },
    unite: 'kg',
    regions: ['Bouaké', 'Bondoukou', 'Abengourou', 'Yamoussoukro'],
    conseils: [
      'L\'igname se stocke 2 à 3 mois dans un endroit ventilé et sombre.',
      'Le festival de l\'igname à Bondoukou crée une forte demande chaque année.',
      'Privilégiez les variétés Kponan et Florido pour le marché d\'Abidjan.',
    ],
    periodeOptimale: 'SAISON_SECHE',
  },
  {
    produit: 'Manioc',
    categorie: 'TUBERCULE',
    prixParSaison: {
      GRANDE_SAISON:  { min: 80, max: 150, moyen: 115 },
      PETITE_SAISON:  { min: 120, max: 220, moyen: 170 },
      SAISON_SECHE:   { min: 180, max: 300, moyen: 240 },
    },
    unite: 'kg',
    regions: ['Abidjan', 'Divo', 'Gagnoa', 'Guiglo'],
    conseils: [
      'Le manioc frais doit être vendu dans les 3 jours après récolte.',
      'Transformé en attiéké, il se conserve mieux et rapporte plus.',
      'Le marché d\'Adjamé est le plus grand pour le manioc à Abidjan.',
    ],
    periodeOptimale: 'PETITE_SAISON',
  },
  {
    produit: 'Plantain',
    categorie: 'FRUIT',
    prixParSaison: {
      GRANDE_SAISON:  { min: 100, max: 200, moyen: 150 },
      PETITE_SAISON:  { min: 150, max: 300, moyen: 225 },
      SAISON_SECHE:   { min: 250, max: 450, moyen: 350 },
    },
    unite: 'kg',
    regions: ['San-Pédro', 'Abidjan', 'Daloa', 'Gagnoa'],
    conseils: [
      'La zone de San-Pédro produit le meilleur plantain de Côte d\'Ivoire.',
      'Vendez mûr (jaune) pour les restaurants, vert pour les ménages.',
      'Le plantain vert peut se conserver une semaine sans réfrigération.',
    ],
    periodeOptimale: 'PETITE_SAISON',
  },
  {
    produit: 'Piment',
    categorie: 'EPICE',
    prixParSaison: {
      GRANDE_SAISON:  { min: 500, max: 1000, moyen: 750 },
      PETITE_SAISON:  { min: 800, max: 1500, moyen: 1150 },
      SAISON_SECHE:   { min: 1200, max: 2000, moyen: 1600 },
    },
    unite: 'kg',
    regions: ['Abidjan', 'Bouaké', 'Korhogo'],
    conseils: [
      'Le piment séché se vend jusqu\'à 3 fois plus cher que le frais.',
      'Très forte demande toute l\'année - produit sûr pour le stock.',
    ],
    periodeOptimale: 'SAISON_SECHE',
  },
  {
    produit: 'Oignon',
    categorie: 'LEGUME',
    prixParSaison: {
      GRANDE_SAISON:  { min: 200, max: 400, moyen: 300 },
      PETITE_SAISON:  { min: 300, max: 600, moyen: 450 },
      SAISON_SECHE:   { min: 400, max: 700, moyen: 550 },
    },
    unite: 'kg',
    regions: ['Korhogo', 'Ferkessédougou', 'Abidjan'],
    conseils: [
      'Les oignons du Burkina Faso inondent le marché en grande saison.',
      'L\'oignon local de Korhogo est de meilleure qualité.',
      'Se conserve 3 semaines dans un endroit frais et sec.',
    ],
    periodeOptimale: 'SAISON_SECHE',
  },
  {
    produit: 'Riz',
    categorie: 'CEREALE',
    prixParSaison: {
      GRANDE_SAISON:  { min: 400, max: 600, moyen: 500 },
      PETITE_SAISON:  { min: 500, max: 750, moyen: 625 },
      SAISON_SECHE:   { min: 600, max: 900, moyen: 750 },
    },
    unite: 'kg',
    regions: ['Abidjan', 'Bouaké', 'Korhogo', 'Yamoussoukro'],
    conseils: [
      'Le riz local est moins cher que le riz importé et de bonne qualité.',
      'La vallée du Kou (Burkina) et Man sont les grandes zones productrices.',
      'Stockez en sac hermétique pour éviter les insectes.',
    ],
    periodeOptimale: 'SAISON_SECHE',
  },
  {
    produit: 'Arachide',
    categorie: 'CEREALE',
    prixParSaison: {
      GRANDE_SAISON:  { min: 500, max: 900, moyen: 700 },
      PETITE_SAISON:  { min: 700, max: 1200, moyen: 950 },
      SAISON_SECHE:   { min: 900, max: 1500, moyen: 1200 },
    },
    unite: 'kg',
    regions: ['Korhogo', 'Ferkessédougou', 'Bouaké'],
    conseils: [
      'L\'arachide grillée se vend mieux en milieu urbain.',
      'Stockez dans un endroit sec pour éviter la moisissure (aflatoxines).',
      'La demande est forte pour les sauces - produit stable toute l\'année.',
    ],
    periodeOptimale: 'GRANDE_SAISON',
  },
];

// ============================================================================
// CONSEILS COMMERCIAUX PAR PROFIL
// ============================================================================

export interface ConseilMetier {
  id: string;
  titre: string;
  contenu: string;
  roles: ('marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur')[];
  tags: string[];
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
}

export const CONSEILS_METIER: ConseilMetier[] = [
  {
    id: 'CM-001',
    titre: 'Diversifiez vos produits',
    contenu: 'Ne dépendez pas d\'un seul produit. Si le prix du maïs chute, vous avez le riz pour compenser. Visez 3 à 5 produits complémentaires.',
    roles: ['marchand', 'producteur'],
    tags: ['diversification', 'risque', 'stratégie'],
    priorite: 'HAUTE',
  },
  {
    id: 'CM-002',
    titre: 'Achetez en grande saison',
    contenu: 'Les prix sont au plus bas en grande saison des pluies (avril-juillet). C\'est le meilleur moment pour constituer vos stocks si vous avez de la place.',
    roles: ['marchand'],
    tags: ['prix', 'saison', 'stock'],
    priorite: 'HAUTE',
  },
  {
    id: 'CM-003',
    titre: 'Fixez votre prix minimum',
    contenu: 'Calculez toujours votre prix de revient (achat + transport + pertes) avant de fixer votre prix de vente. Ne vendez jamais en dessous de votre coût.',
    roles: ['marchand', 'producteur'],
    tags: ['prix', 'marge', 'rentabilité'],
    priorite: 'HAUTE',
  },
  {
    id: 'CM-004',
    titre: 'Rejoignez une coopérative',
    contenu: 'Ensemble on est plus forts. La coopérative permet d\'acheter en gros (moins cher), de vendre en gros (meilleur prix) et de se protéger contre les pertes.',
    roles: ['producteur', 'marchand'],
    tags: ['coopérative', 'groupement', 'force'],
    priorite: 'MOYENNE',
  },
  {
    id: 'CM-005',
    titre: 'Enregistrez chaque transaction',
    contenu: 'Notez chaque vente et chaque achat dans Jùlaba. Votre score augmente et vous pouvez accéder au crédit. Un bon historique vaut de l\'or.',
    roles: ['marchand', 'producteur'],
    tags: ['score', 'crédit', 'historique'],
    priorite: 'HAUTE',
  },
  {
    id: 'CM-006',
    titre: 'Publiez vos récoltes tôt',
    contenu: 'Mettez vos produits sur le marché Jùlaba au moins 2 semaines avant la récolte. Les marchands planifient leurs achats à l\'avance.',
    roles: ['producteur'],
    tags: ['récolte', 'marketplace', 'anticipation'],
    priorite: 'HAUTE',
  },
  {
    id: 'CM-007',
    titre: 'Utilisez l\'escrow pour les grosses commandes',
    contenu: 'Pour les commandes supérieures à 50 000 FCFA, utilisez le paiement sécurisé Jùlaba (escrow). Votre argent est protégé jusqu\'à la livraison confirmée.',
    roles: ['marchand', 'producteur'],
    tags: ['paiement', 'sécurité', 'escrow'],
    priorite: 'HAUTE',
  },
  {
    id: 'CM-008',
    titre: 'Réduisez les pertes post-récolte',
    contenu: 'En Côte d\'Ivoire, 30 à 40% des produits vivriers sont perdus après récolte. Vendez rapidement ou transformez (séchage, attiéké). Les pertes, c\'est de l\'argent jeté.',
    roles: ['producteur'],
    tags: ['pertes', 'transformation', 'qualité'],
    priorite: 'HAUTE',
  },
  {
    id: 'CM-009',
    titre: 'Votre score Jùlaba ouvre des portes',
    contenu: 'Un score au-dessus de 75/100 vous permet d\'accéder aux partenaires financiers et d\'avoir plus de visibilité sur le marché. Maintenez votre activité régulièrement.',
    roles: ['marchand', 'producteur', 'cooperative'],
    tags: ['score', 'crédit', 'visibilité'],
    priorite: 'MOYENNE',
  },
  {
    id: 'CM-010',
    titre: 'Formez-vous sur Jùlaba Academy',
    contenu: 'Chaque formation complétée vous rapporte des points et améliore votre score. 10 minutes par jour suffisent pour progresser rapidement.',
    roles: ['marchand', 'producteur', 'cooperative', 'identificateur'],
    tags: ['formation', 'academy', 'score'],
    priorite: 'BASSE',
  },
];

// ============================================================================
// PROVERBES IVOIRIENS (sagesses de Tantie)
// ============================================================================

export const PROVERBES: { texte: string; signification: string; langue: string }[] = [
  {
    texte: 'La main qui donne ne se fatigue pas.',
    signification: 'La générosité et le partage apportent toujours des bénéfices en retour.',
    langue: 'Proverbe ivoirien',
  },
  {
    texte: 'L\'eau ne reste pas sur les feuilles de taro.',
    signification: 'Certaines choses ne durent pas. Profitez des opportunités quand elles se présentent.',
    langue: 'Proverbe akan',
  },
  {
    texte: 'Ce que l\'on plante avec soin, on le récolte avec joie.',
    signification: 'Le travail bien fait est toujours récompensé.',
    langue: 'Proverbe ivoirien',
  },
  {
    texte: 'Un seul doigt ne peut pas soulever une pierre.',
    signification: 'L\'union fait la force. Travailler ensemble en coopérative est plus puissant.',
    langue: 'Proverbe dioula',
  },
  {
    texte: 'Le marché du matin n\'attend pas le paresseux.',
    signification: 'Les meilleures affaires se font tôt. Ne tardez pas à agir.',
    langue: 'Proverbe de Bouaké',
  },
  {
    texte: 'On n\'apprend pas à un vieux singe à faire des grimaces.',
    signification: 'L\'expérience a de la valeur. Partagez votre savoir avec les plus jeunes.',
    langue: 'Proverbe universel',
  },
  {
    texte: 'Petit à petit, l\'oiseau fait son nid.',
    signification: 'La régularité et la persévérance sont la clé du succès en affaires.',
    langue: 'Proverbe universel',
  },
];

// ============================================================================
// INFORMATIONS RÉGLEMENTAIRES
// ============================================================================

export const REGLEMENTATIONS = {
  cnps: {
    nom: 'Caisse Nationale de Prévoyance Sociale',
    description: 'Protection sociale des travailleurs du secteur informel.',
    cotisation: '5,75% du salaire minimum',
    avantages: ['Retraite', 'Accident du travail', 'Maternité'],
    inscription: 'Mairie de votre commune ou agence CNPS',
    contact: '20 20 06 30',
  },
  cnam: {
    nom: 'Couverture Maladie Universelle',
    description: 'Accès aux soins de santé à tarif réduit pour tous les ivoiriens.',
    cotisation: '1 000 FCFA par mois pour les acteurs du secteur informel',
    avantages: ['Consultation médicale', 'Hospitalisation', 'Médicaments'],
    inscription: 'Centre de santé le plus proche ou cnam-ci.org',
    contact: '3131',
  },
  minader: {
    nom: 'Ministère de l\'Agriculture et du Développement Rural',
    description: 'Régule le secteur agricole et vivrier en Côte d\'Ivoire.',
    programmes: ['Subventions semences', 'Formation agriculteurs', 'Prêts agricoles'],
    contact: 'minader.ci',
  },
};

// ============================================================================
// SAISONS AGRICOLES EN CÔTE D'IVOIRE
// ============================================================================

export const CALENDRIER_AGRICOLE = {
  grandes_saisons_pluies: {
    periodes: ['Avril - Juillet', 'Octobre - Novembre (au Sud)'],
    conseils: 'Excellente période pour acheter. Les prix sont bas.',
    produits_abondants: ['Tomate', 'Plantain', 'Manioc', 'Igname'],
  },
  petite_saison_pluies: {
    periodes: ['Septembre - Novembre (au Centre et Nord)'],
    conseils: 'Période de transition. Surveillez les prix.',
    produits_abondants: ['Maïs', 'Arachide', 'Gombo'],
  },
  saison_seche: {
    periodes: ['Décembre - Mars (harmattan au Nord)', 'Août - Septembre (au Sud)'],
    conseils: 'Les prix montent. Bon moment pour vendre vos stocks.',
    produits_rares: ['Tomate', 'Légumes verts', 'Manioc frais'],
  },
};

// ============================================================================
// FONCTIONS D'ACCÈS À LA BASE DE CONNAISSANCES
// ============================================================================

/** Retourne les infos prix d'un produit donné */
export function getPrixProduit(produitName: string): PrixProduit | undefined {
  const name = produitName.toLowerCase();
  return PRIX_MARCHE.find(p => p.produit.toLowerCase() === name);
}

/** Retourne la saison actuelle (approximation basée sur le mois) */
export function getSaisonActuelle(): Saison {
  const month = new Date().getMonth() + 1;
  // Nord et Centre : grande saison avril-juillet, petite sept-oct, sèche déc-mars
  if (month >= 4 && month <= 7) return 'GRANDE_SAISON';
  if (month >= 9 && month <= 11) return 'PETITE_SAISON';
  return 'SAISON_SECHE';
}

/** Retourne les conseils pour un rôle donné */
export function getConseilsParRole(role: ConseilMetier['roles'][number]): ConseilMetier[] {
  return CONSEILS_METIER
    .filter(c => c.roles.includes(role))
    .sort((a, b) => {
      const order = { HAUTE: 0, MOYENNE: 1, BASSE: 2 };
      return order[a.priorite] - order[b.priorite];
    });
}

/** Retourne un proverbe aléatoire */
export function getProverbeAleatoire(): typeof PROVERBES[number] {
  return PROVERBES[Math.floor(Math.random() * PROVERBES.length)];
}

/** Retourne les conseils liés à des tags */
export function getConseilsParTags(tags: string[]): ConseilMetier[] {
  return CONSEILS_METIER.filter(c =>
    c.tags.some(tag => tags.some(t => t.toLowerCase().includes(tag.toLowerCase())))
  );
}
