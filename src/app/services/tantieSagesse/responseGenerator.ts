/**
 * TANTIE SAGESSE - Moteur de génération de réponses
 *
 * Prend l'intention parsée + le contexte utilisateur + la base de connaissances
 * et génère une réponse personnalisée, chaleureuse et actionnable.
 *
 * Fonctionne 100% hors-ligne. Pas d'appel API.
 *
 * v2 : Actions enrichies via ActionRegistry / AgentRouter
 */

import type {
  TantieIntent,
  TantieUserContext,
  TantieResponse,
  TantieAction,
  TantieEmotion,
  TantieIntentCategory,
  TantieConfig,
} from '../../types/tantie.types';

import {
  extractProduit,
  extractQuantite,
  extractPrix,
} from './intentParser';

import {
  getPrixProduit,
  getSaisonActuelle,
  getConseilsParRole,
  getProverbeAleatoire,
  CALENDRIER_AGRICOLE,
  REGLEMENTATIONS,
} from './knowledgeBase';

import { getActionsForResponse } from './AgentRouter';

// ============================================================================
// PRÉNOM RACCOURCI (pour personnaliser le message)
// ============================================================================

function prenom(ctx: TantieUserContext): string {
  return ctx.prenoms?.split(' ')[0] || ctx.nom || 'chère amie';
}

// ============================================================================
// ACTIONS RAPIDES PRÉDÉFINIES (routes génériques → résolues par executeAction)
// ============================================================================

const ACTIONS: Record<string, Omit<TantieAction, 'id'>> = {
  voir_stock:        { label: 'Voir mon stock',         icon: 'Package',      route: '/stock' },
  ajouter_vente:     { label: 'Enregistrer une vente',  icon: 'ShoppingCart', route: '/caisse' },
  voir_caisse:       { label: 'Ouvrir ma caisse',       icon: 'Calculator',   route: '/caisse' },
  voir_wallet:       { label: 'Mon Wallet',             icon: 'Wallet',       route: '/wallet' },
  voir_commandes:    { label: 'Mes commandes',          icon: 'ClipboardList',route: '/commandes' },
  voir_marche:       { label: 'Voir le marché',         icon: 'Store',        route: '/marche' },
  publier_recolte:   { label: 'Publier une récolte',    icon: 'Leaf',         route: '/recoltes' },
  voir_score:        { label: 'Mon score Jùlaba',       icon: 'Star',         route: '/score' },
  voir_academy:      { label: 'Jùlaba Academy',         icon: 'GraduationCap',route: '/academy' },
  voir_alertes:      { label: 'Mes alertes',            icon: 'Bell',         route: '/alertes' },
  voir_cooperative:  { label: 'Ma coopérative',         icon: 'Users',        route: '/cooperative' },
  voir_profil:       { label: 'Mon profil',             icon: 'User',         route: '/moi' },
  contacter_support: { label: 'Contacter le support',   icon: 'Headphones',   route: '/support' },
  nouvelle_commande: { label: 'Nouvelle commande',      icon: 'Plus',         route: '/commandes/nouvelle' },
};

function makeAction(key: keyof typeof ACTIONS): TantieAction {
  return { id: `action-${key}-${Date.now()}`, ...ACTIONS[key] };
}

/**
 * Enrichit une liste d'actions contextuelles avec des actions du registre
 * centralisé (ActionRegistry via AgentRouter).
 * Ne duplique pas les routes déjà présentes.
 */
function enrichActions(
  baseActions: TantieAction[],
  category: TantieIntentCategory,
  ctx: TantieUserContext,
  maxTotal = 3
): TantieAction[] {
  if (baseActions.length >= maxTotal) return baseActions.slice(0, maxTotal);

  const registryActions = getActionsForResponse(category, ctx.role);
  const existingRoutes = new Set(baseActions.map(a => a.route));

  const extras = registryActions
    .filter(a => a.route && !existingRoutes.has(a.route))
    .slice(0, maxTotal - baseActions.length);

  return [...baseActions, ...extras].slice(0, maxTotal);
}

// ============================================================================
// GÉNÉRATEURS DE RÉPONSE PAR INTENTION
// ============================================================================

function respondeSalutation(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const heure = new Date().getHours();
  const salut = heure < 12 ? 'Bonne matinée' : heure < 18 ? 'Bon après-midi' : 'Bonne soirée';

  const stockCritique = ctx.stockItems?.filter(s => s.estCritique) ?? [];
  const alertes = ctx.alertesNonLues ?? 0;

  let text = `${salut} ${prenom(ctx)} ! Moi c'est Tantie Sagesse, votre guide sur Jùlaba.`;

  if (alertes > 0) {
    text += ` Vous avez ${alertes} alerte${alertes > 1 ? 's' : ''} non lue${alertes > 1 ? 's' : ''} qui m'inquiète${alertes > 1 ? 'nt' : ''}.`;
  }

  if (stockCritique.length > 0) {
    text += ` Aussi, votre stock de ${stockCritique[0].nom} est critique. Il faut s'en occuper rapidement !`;
  }

  text += ' Comment puis-je vous aider aujourd\'hui ?';

  const actions: TantieAction[] = [];
  if (alertes > 0) actions.push(makeAction('voir_alertes'));
  if (stockCritique.length > 0) actions.push(makeAction('voir_stock'));
  actions.push(makeAction('ajouter_vente'));
  actions.push(makeAction('voir_marche'));

  return { text, emotion: 'ENCOURAGE', actions: actions.slice(0, 3) };
}

function repondreStock(intent: TantieIntent, ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const produit = extractProduit(intent);
  const stockItems = ctx.stockItems ?? [];
  const critiques = stockItems.filter(s => s.estCritique);

  if (produit) {
    const item = stockItems.find(s =>
      s.nom.toLowerCase().includes(produit.toLowerCase())
    );
    if (item) {
      const statut = item.estCritique ? 'CRITIQUE - il faut réapprovisionner maintenant !' : 'correct.';
      return {
        text: `${prenom(ctx)}, votre stock de ${item.nom} est de ${item.quantite} ${item.unite}. C'est ${statut}`,
        emotion: item.estCritique ? 'ALERTE' : 'INFO',
        actions: [makeAction('voir_stock')],
      };
    } else {
      return {
        text: `Je ne vois pas de ${produit} dans votre stock. Voulez-vous l'ajouter ?`,
        emotion: 'QUESTION',
        actions: [makeAction('voir_stock')],
      };
    }
  }

  if (critiques.length === 0 && stockItems.length > 0) {
    return {
      text: `Bravo ${prenom(ctx)} ! Vos ${stockItems.length} produits sont bien stockés. Aucun produit en rupture aujourd'hui.`,
      emotion: 'ENCOURAGE',
      actions: [makeAction('voir_stock'), makeAction('ajouter_vente')],
    };
  }

  if (critiques.length > 0) {
    const noms = critiques.map(s => s.nom).join(', ');
    return {
      text: `Attention ${prenom(ctx)} ! Votre stock de ${noms} est au niveau critique. Pensez à réapprovisionner avant d'en manquer au marché.`,
      emotion: 'ALERTE',
      actions: [makeAction('voir_stock'), makeAction('voir_commandes')],
    };
  }

  return {
    text: `Vous pouvez voir et gérer tous vos produits en stock dans la section Stock, ${prenom(ctx)}.`,
    emotion: 'INFO',
    actions: [makeAction('voir_stock')],
  };
}

function repondrePrix(intent: TantieIntent, ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const produit = extractProduit(intent);
  const saison = getSaisonActuelle();
  const nomSaison: Record<typeof saison, string> = {
    GRANDE_SAISON: 'grande saison des pluies',
    PETITE_SAISON: 'petite saison',
    SAISON_SECHE: 'saison sèche',
  };

  if (produit) {
    const prixData = getPrixProduit(produit);
    if (prixData) {
      const prix = prixData.prixParSaison[saison];
      const conseil = prixData.conseils[0];
      return {
        text: `${prenom(ctx)}, en cette ${nomSaison[saison]}, le prix du ${prixData.produit} est généralement entre ${prix.min.toLocaleString('fr-FR')} et ${prix.max.toLocaleString('fr-FR')} FCFA/kg. Prix moyen : ${prix.moyen.toLocaleString('fr-FR')} FCFA/kg. Mon conseil : ${conseil}`,
        emotion: 'INFO',
        actions: [makeAction('voir_marche'), makeAction('nouvelle_commande')],
      };
    }
  }

  const calendrier = saison === 'GRANDE_SAISON'
    ? CALENDRIER_AGRICOLE.grandes_saisons_pluies
    : saison === 'PETITE_SAISON'
    ? CALENDRIER_AGRICOLE.petite_saison_pluies
    : CALENDRIER_AGRICOLE.saison_seche;

  return {
    text: `${prenom(ctx)}, nous sommes en ${nomSaison[saison]}. ${calendrier.conseils} Les produits les plus disponibles en ce moment : ${('produits_abondants' in calendrier ? calendrier.produits_abondants : calendrier.produits_rares ?? []).join(', ')}.`,
    emotion: 'INFO',
    actions: [makeAction('voir_marche')],
  };
}

function repondreVente(intent: TantieIntent, ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const produit = extractProduit(intent);
  const quantite = extractQuantite(intent);
  const prix = extractPrix(intent);
  const bilan = ctx.dernierBilan;

  let text = '';

  if (produit && quantite && prix) {
    text = `Super ${prenom(ctx)} ! Allez dans votre Caisse pour enregistrer la vente de ${quantite} de ${produit} à ${prix}. Je vous prépare tout !`;
  } else if (bilan) {
    text = `Aujourd'hui, vous avez déjà enregistré ${bilan.nombreTransactions} transaction${bilan.nombreTransactions > 1 ? 's' : ''} pour ${bilan.totalVentes.toLocaleString('fr-FR')} FCFA de ventes. Continuez comme ça !`;
  } else {
    text = `Pour enregistrer une vente, allez dans votre Caisse journalière, ${prenom(ctx)}. C'est là que se passe la magie !`;
  }

  return {
    text,
    emotion: 'ENCOURAGE',
    actions: [makeAction('ajouter_vente'), makeAction('voir_caisse')],
  };
}

function repondreCaisse(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const bilan = ctx.dernierBilan;

  if (!bilan) {
    return {
      text: `${prenom(ctx)}, vous n'avez pas encore ouvert votre caisse aujourd'hui. Commencez par y entrer votre fond de départ, et on suit tout ensemble !`,
      emotion: 'CONSEIL',
      actions: [makeAction('voir_caisse')],
    };
  }

  const beneficeFormate = bilan.beneficeNet.toLocaleString('fr-FR');
  const emotion: TantieEmotion = bilan.beneficeNet > 0 ? 'ENCOURAGE' : bilan.beneficeNet === 0 ? 'INFO' : 'ALERTE';

  let text = `Bilan de votre journée, ${prenom(ctx)} : ${bilan.totalVentes.toLocaleString('fr-FR')} FCFA de ventes, ${bilan.totalDepenses.toLocaleString('fr-FR')} FCFA de dépenses.`;

  if (bilan.beneficeNet > 0) {
    text += ` Votre bénéfice net est de ${beneficeFormate} FCFA. Belle journée !`;
  } else if (bilan.beneficeNet === 0) {
    text += ` Vous êtes à l'équilibre aujourd'hui. Pas de perte, mais pas de bénéfice non plus.`;
  } else {
    text += ` Attention, vous êtes en déficit de ${Math.abs(bilan.beneficeNet).toLocaleString('fr-FR')} FCFA. Revoyez vos dépenses.`;
  }

  return {
    text,
    emotion,
    actions: [makeAction('voir_caisse'), makeAction('ajouter_vente')],
  };
}

function repondreWallet(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  if (ctx.walletSolde !== undefined) {
    const bas = ctx.walletSolde < 5000;
    return {
      text: `Votre Wallet Jùlaba, ${prenom(ctx)} : ${ctx.walletSolde.toLocaleString('fr-FR')} FCFA disponibles.${bas ? ' C\'est un peu bas. Pensez à recharger !' : ' Vous êtes bien équipée pour vos achats !'}`,
      emotion: bas ? 'ALERTE' : 'INFO',
      actions: [makeAction('voir_wallet')],
    };
  }
  return {
    text: `Votre Wallet Jùlaba vous permet de payer et de recevoir de l'argent en toute sécurité, ${prenom(ctx)}. Consultez votre solde dans la section Wallet.`,
    emotion: 'INFO',
    actions: [makeAction('voir_wallet')],
  };
}

function repondreRecolte(intent: TantieIntent, ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const produit = extractProduit(intent);
  const recoltes = ctx.recoltes ?? [];

  if (recoltes.length === 0) {
    return {
      text: `${prenom(ctx)}, vous n'avez pas encore de récolte publiée sur le marché. Publiez vos produits maintenant pour trouver des acheteurs directement !`,
      emotion: 'CONSEIL',
      actions: [makeAction('publier_recolte'), makeAction('voir_marche')],
    };
  }

  const recolteProduit = produit
    ? recoltes.find(r => r.produit.toLowerCase().includes(produit.toLowerCase()))
    : null;

  if (recolteProduit) {
    return {
      text: `Votre récolte de ${recolteProduit.produit} : ${recolteProduit.quantiteRestante} kg restants à ${recolteProduit.prixUnitaire.toLocaleString('fr-FR')} FCFA/kg. Statut : ${recolteProduit.statut}.`,
      emotion: 'INFO',
      actions: [makeAction('publier_recolte'), makeAction('voir_marche')],
    };
  }

  return {
    text: `Vous avez ${recoltes.length} récolte${recoltes.length > 1 ? 's' : ''} active${recoltes.length > 1 ? 's' : ''} sur le marché, ${prenom(ctx)}. Gérez-les pour maximiser vos ventes !`,
    emotion: 'ENCOURAGE',
    actions: [makeAction('publier_recolte'), makeAction('voir_marche')],
  };
}

function repondreCommande(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const nb = ctx.commandesEnCours ?? 0;
  if (nb === 0) {
    return {
      text: `Vous n'avez aucune commande en cours, ${prenom(ctx)}. C'est le bon moment pour passer une nouvelle commande sur le marché Jùlaba !`,
      emotion: 'INFO',
      actions: [makeAction('voir_marche'), makeAction('voir_commandes')],
    };
  }
  return {
    text: `Vous avez ${nb} commande${nb > 1 ? 's' : ''} en cours, ${prenom(ctx)}. Vérifiez leur statut et confirmez les livraisons reçues pour libérer vos paiements.`,
    emotion: nb > 3 ? 'ALERTE' : 'INFO',
    actions: [makeAction('voir_commandes')],
  };
}

function repondreScore(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const score = ctx.score;
  let niveau = score >= 90 ? 'PLATINE' : score >= 75 ? 'OR' : score >= 50 ? 'ARGENT' : 'BRONZE';
  let emotion: TantieEmotion = score >= 75 ? 'CELEBRE' : score >= 50 ? 'ENCOURAGE' : 'CONSOLIDE';

  let text = `Votre score Jùlaba est de ${score}/100, niveau ${niveau}, ${prenom(ctx)}. `;

  if (score >= 90) {
    text += 'Incroyable ! Vous êtes une référence sur la plateforme. Continuez à être régulière !';
  } else if (score >= 75) {
    text += 'Excellent score ! Vous avez accès aux meilleurs partenaires. Quelques transactions de plus et vous serez PLATINE !';
  } else if (score >= 50) {
    text += 'Bon score. Pour passer en OR, enregistrez vos transactions chaque jour et complétez vos documents.';
  } else {
    text += 'Votre score peut s\'améliorer vite ! Enregistrez vos ventes chaque jour, complétez une formation, et votre score montera.';
  }

  return {
    text,
    emotion,
    actions: [makeAction('voir_score'), makeAction('voir_academy')],
  };
}

function repondreAcademy(): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  return {
    text: 'Jùlaba Academy vous attend ! Chaque leçon terminée vous rapporte des points et améliore votre score. 10 minutes par jour suffisent pour progresser rapidement. Vous commencez par quoi ?',
    emotion: 'ENCOURAGE',
    actions: [makeAction('voir_academy')],
  };
}

function repondreMarche(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  return {
    text: `Le marché Jùlaba, ${prenom(ctx)}, c'est là où producteurs et marchands se rencontrent directement. Vous trouvez les meilleurs prix et vous traitez en toute sécurité.`,
    emotion: 'INFO',
    actions: [makeAction('voir_marche'), makeAction('nouvelle_commande')],
  };
}

function repondreSupport(): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  return {
    text: 'Si vous avez un problème, notre équipe support est disponible pour vous aider. Décrivez votre problème et un ticket sera créé. Nous répondons en moins de 24 heures.',
    emotion: 'INFO',
    actions: [makeAction('contacter_support')],
  };
}

function repondreCooperative(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  if (ctx.role !== 'cooperative') {
    return {
      text: `${prenom(ctx)}, rejoindre une coopérative vous permettrait d'acheter en gros à meilleur prix et de vendre en plus grande quantité. C'est la force du groupement !`,
      emotion: 'CONSEIL',
      actions: [makeAction('voir_marche')],
    };
  }
  return {
    text: `Gérez votre coopérative depuis l'espace dédié : membres, trésorerie, commandes groupées. La force du collectif est votre atout, ${prenom(ctx)} !`,
    emotion: 'ENCOURAGE',
    actions: [makeAction('voir_cooperative')],
  };
}

function repondreMeteo(): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const saison = getSaisonActuelle();
  const info = saison === 'GRANDE_SAISON'
    ? { desc: 'grande saison des pluies', conseil: CALENDRIER_AGRICOLE.grandes_saisons_pluies.conseils }
    : saison === 'PETITE_SAISON'
    ? { desc: 'petite saison des pluies', conseil: CALENDRIER_AGRICOLE.petite_saison_pluies.conseils }
    : { desc: 'saison sèche', conseil: CALENDRIER_AGRICOLE.saison_seche.conseils };

  return {
    text: `Nous sommes en ${info.desc} en Côte d'Ivoire. ${info.conseil} Adaptez vos achats et vos ventes à la saison pour faire les meilleures affaires !`,
    emotion: 'SAGE',
    actions: [makeAction('voir_marche')],
  };
}

function repondreConseil(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const conseils = getConseilsParRole(ctx.role as any);
  const conseil = conseils[Math.floor(Math.random() * Math.min(3, conseils.length))];
  const proverbe = getProverbeAleatoire();

  const text = conseil
    ? `Mon conseil pour vous, ${prenom(ctx)} : ${conseil.contenu} Et comme on dit : "${proverbe.texte}"`
    : `${proverbe.texte} — ${proverbe.signification}`;

  return {
    text,
    emotion: 'SAGE',
    actions: [makeAction('voir_academy'), makeAction('voir_score')],
  };
}

function repondreAlertes(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const nb = ctx.alertesNonLues ?? 0;
  if (nb === 0) {
    return {
      text: `Aucune alerte non lue, ${prenom(ctx)}. Tout est calme, c'est rassurant !`,
      emotion: 'ENCOURAGE',
      actions: [makeAction('voir_alertes')],
    };
  }
  return {
    text: `Vous avez ${nb} alerte${nb > 1 ? 's' : ''} non lue${nb > 1 ? 's' : ''}. Allez les consulter rapidement, certaines peuvent être urgentes !`,
    emotion: 'ALERTE',
    actions: [makeAction('voir_alertes')],
  };
}

function repondreProfil(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  return {
    text: `Votre profil Jùlaba, ${prenom(ctx)} : vous êtes ${ctx.role} à ${ctx.commune || 'votre ville'}. Score : ${ctx.score}/100. Consultez votre carte professionnelle dans la section MOI.`,
    emotion: 'INFO',
    actions: [makeAction('voir_profil'), makeAction('voir_score')],
  };
}

function repondreInconnu(ctx: TantieUserContext): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const suggestions: TantieAction[] = [
    makeAction('voir_stock'),
    makeAction('ajouter_vente'),
    makeAction('voir_marche'),
  ];

  return {
    text: `Je n'ai pas bien compris votre demande, ${prenom(ctx)}. Vous pouvez me demander des infos sur votre stock, les prix du marché, vos ventes, ou votre score Jùlaba. Comment puis-je vous aider ?`,
    emotion: 'QUESTION',
    actions: suggestions,
  };
}

// ============================================================================
// ROUTEUR PRINCIPAL
// ============================================================================

function routeIntent(
  intent: TantieIntent,
  ctx: TantieUserContext
): Pick<TantieResponse, 'text' | 'emotion' | 'actions'> {
  const result = (() => {
    switch (intent.category as TantieIntentCategory) {
      case 'SALUTATION':   return respondeSalutation(ctx);
      case 'STOCK':        return repondreStock(intent, ctx);
      case 'PRIX':         return repondrePrix(intent, ctx);
      case 'VENTE':        return repondreVente(intent, ctx);
      case 'CAISSE':       return repondreCaisse(ctx);
      case 'WALLET':       return repondreWallet(ctx);
      case 'RECOLTE':      return repondreRecolte(intent, ctx);
      case 'COMMANDE':     return repondreCommande(ctx);
      case 'SCORE':        return repondreScore(ctx);
      case 'ACADEMY':      return repondreAcademy();
      case 'MARCHE':       return repondreMarche(ctx);
      case 'SUPPORT':      return repondreSupport();
      case 'COOPERATIVE':  return repondreCooperative(ctx);
      case 'METEO':        return repondreMeteo();
      case 'CONSEIL':      return repondreConseil(ctx);
      case 'ALERTE':       return repondreAlertes(ctx);
      case 'PROFIL':       return repondreProfil(ctx);
      default:             return repondreInconnu(ctx);
    }
  })();

  // Enrichir les actions avec l'ActionRegistry si besoin
  return {
    ...result,
    actions: enrichActions(result.actions, intent.category, ctx),
  };
}

// ============================================================================
// GÉNÉRATEUR FINAL — consomme réellement la config BO
// ============================================================================

/**
 * Applique styleReponse, longueurReponse, utiliseDioula, utiliseBaoule sur le texte.
 */
function applyConfigToText(text: string, config?: Partial<TantieConfig>): string {
  if (!config) return text;

  let result = text;

  // longueurReponse
  if (config.longueurReponse === 'COURTE') {
    // Couper au premier point ou à 120 chars max
    const firstSentence = result.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 20) {
      result = firstSentence.trim() + '.';
    }
  } else if (config.longueurReponse === 'LONGUE') {
    // Rien à faire ici — la réponse longue est la réponse naturelle complète
  }
  // MOYENNE = défaut, pas de transformation

  // styleReponse
  if (config.styleReponse === 'DIRECT') {
    // Supprimer les formules de politesse d'ouverture
    result = result
      .replace(/^Bien sûr[,!]\s*/i, '')
      .replace(/^Avec plaisir[,!]\s*/i, '')
      .replace(/^Voilà[,!]\s*/i, '');
  } else if (config.styleReponse === 'FORMEL') {
    // Remplacer le ton familier par du formel
    result = result
      .replace(/\btu\b/g, 'vous')
      .replace(/\bton\b/g, 'votre')
      .replace(/\bta\b/g, 'votre')
      .replace(/\btes\b/g, 'vos');
  }
  // CHALEUREUX = défaut, pas de transformation

  // utiliseDioula
  if (config.utiliseDioula) {
    // Ajouter quelques mots en dioula selon le contexte
    if (result.includes('Bonjour') || result.includes('Bonsoir')) {
      result = result.replace(/^Bonjour/, 'I ni sogoma — Bonjour')
                     .replace(/^Bonsoir/, 'I ni wula — Bonsoir');
    }
    if (result.includes('Merci')) {
      result = result.replace(/Merci/g, 'I ni ce (Merci)');
    }
  }

  // utiliseBaoule
  if (config.utiliseBaoule) {
    if (result.includes('Bravo')) {
      result = result.replace(/Bravo/g, 'Mo guè ! Bravo');
    }
    if (result.includes('d\'accord') || result.includes('Oui')) {
      result = result.replace(/\bOui\b/g, 'Aowe (Oui)');
    }
  }

  return result;
}

export function generateResponse(
  intent: TantieIntent,
  ctx: TantieUserContext,
  startTime: number = Date.now(),
  config?: Partial<TantieConfig>
): TantieResponse {
  const { text, emotion, actions } = routeIntent(intent, ctx);

  // Appliquer les transformations de config (styleReponse, longueurReponse, dioula, baoulé)
  const finalText = applyConfigToText(text, config);

  // shouldSpeak : désactivé si voiceEnabled est false dans la config
  const shouldSpeak = config?.voiceEnabled !== false;

  // actionsRapidesEnabled : si désactivé, ne pas retourner les actions
  const finalActions = config?.actionsRapidesEnabled === false ? [] : actions;

  return {
    text:             finalText,
    emotion,
    actions:          finalActions,
    intent,
    confidence:       intent.confidence,
    shouldSpeak,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// GÉNÉRATION D'UN MESSAGE D'ACCUEIL PROACTIF
// ============================================================================

export function generateWelcomeMessage(ctx: TantieUserContext): string {
  const heure = new Date().getHours();
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
  const p = prenom(ctx);

  const stockCritique = ctx.stockItems?.filter(s => s.estCritique) ?? [];
  const alertes = ctx.alertesNonLues ?? 0;

  if (stockCritique.length > 0) {
    return `${salut} ${p} ! Votre stock de ${stockCritique[0].nom} est critique. Il faut agir vite !`;
  }
  if (alertes > 0) {
    return `${salut} ${p} ! Vous avez ${alertes} alerte${alertes > 1 ? 's' : ''} non lue${alertes > 1 ? 's' : ''}. Allons voir ça !`;
  }

  const messages = [
    `${salut} ${p} ! Je suis là pour vous aider. Dites-moi ce dont vous avez besoin.`,
    `${salut} ${p} ! Tout va bien aujourd'hui ? Posez-moi n'importe quelle question sur votre activité.`,
    `${salut} ${p} ! Que puis-je faire pour vous aujourd'hui ?`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// SUGGESTIONS RAPIDES PAR RÔLE (boutons d'accueil)
// ============================================================================

export function getSuggestionsRapides(
  role: TantieUserContext['role'],
  config?: Partial<TantieConfig>
): TantieAction[] {
  // Si suggestions désactivées dans la config BO → retourner tableau vide
  if (config?.suggestionsRapidesEnabled === false) return [];

  const map: Record<typeof role, (keyof typeof ACTIONS)[]> = {
    marchand:       ['voir_stock', 'ajouter_vente', 'voir_marche', 'voir_caisse'],
    producteur:     ['publier_recolte', 'voir_marche', 'voir_commandes', 'voir_score'],
    cooperative:    ['voir_cooperative', 'voir_commandes', 'voir_marche', 'voir_score'],
    institution:    ['voir_marche', 'voir_score', 'contacter_support', 'voir_alertes'],
    identificateur: ['voir_profil', 'voir_alertes', 'voir_academy', 'contacter_support'],
  };

  return (map[role] || map.marchand).map(makeAction);
}