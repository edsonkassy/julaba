PLAN DE CORRECTION IMMÉDIAT — IA TANTIE SAGESSE (PHASE 2)

Ton audit est clair.
Nous passons maintenant en phase de mise en conformité complète avec l’architecture cible.

Objectif : passer de 60% à 95% de conformité.

Aucune modification UI.
Uniquement structure, sécurité, robustesse.

🔴 PRIORITÉ P0 — CORRECTIONS CRITIQUES IMMÉDIATES
1️⃣ Isolation totale par userId (OBLIGATOIRE)

Toutes les clés localStorage doivent être préfixées :

julaba_${userId}_stock_products
julaba_${userId}_wallet
julaba_${userId}_recoltes
julaba_${userId}_transactions
julaba_${userId}_notifications
julaba_${userId}_tantie_session

Interdiction absolue de clé globale partagée.

Fournis :

Liste complète des clés avant/après

Script de migration si données existantes

2️⃣ Enforcement strict enabledForRoles

Créer un vrai guard dans TantieProvider :

if (!config.enabledForRoles.includes(user.role)) {
  return null; // bloque ouverture IA
}

Masquer FAB si rôle non autorisé

Bloquer sendMessage si désactivé

Tester désactivation live depuis BO

3️⃣ Corriger executeAction()

Remplacer :

window.location.hash

Par :

useNavigate()

Compatible BrowserRouter.

Tester navigation sur :

Marchand

Coopérative

BackOffice

4️⃣ Éliminer race condition

Ajouter :

const isProcessing = useRef(false);

Bloquer sendMessage si déjà en cours.

Tester double clic micro rapide.

🟠 PRIORITÉ P1 — CONFORMITÉ ARCHITECTURE CIBLE
5️⃣ Créer PermissionGuard.ts

Structure :

rolePermissions = {
  marchand: ['STOCK', 'VENTE', 'WALLET'],
  producteur: ['RECOLTE', 'COMMANDE'],
  cooperative: ['MEMBRE', 'COMMANDE_GROUPEE'],
  institution: ['ANALYTICS', 'SUPERVISION'],
  identificateur: ['DOSSIER']
}

Avant generateResponse :

Vérifier si intent.category autorisé

Sinon → réponse claire “Tu n’as pas le droit de faire ça.”

6️⃣ Créer AILogService.ts

Structure obligatoire :

{
  id,
  userId,
  role,
  action,
  payload,
  confirmed,
  timestamp,
  result
}

Stockage temporaire localStorage préfixé par userId.

Accessible uniquement via BackOffice.

Loguer :

Action acceptée

Action refusée

Action échouée

7️⃣ Créer ConfirmationManager.ts

Liste :

CRITICAL_ACTIONS = ['DELETE', 'SUSPEND', 'MODIFY_USER']

Flow :

Intent détecté
→ Si critique
→ Modal confirmation
→ Si confirmé → Service
→ Log
→ Sinon → Log refus

8️⃣ Nettoyer les composants IA v1

Supprimer définitivement :

TantieSagesseModal.tsx

CommandesVocales.tsx

/components/voice/TantieSagesse.tsx

Aucune duplication moteur.

🟡 PRIORITÉ P2 — QUALITÉ & ROBUSTESSE
9️⃣ Feedback erreur STT

Si micro erreur :

Afficher toast :
“Micro non disponible. Vérifie les autorisations.”

🔟 Rafraîchissement contexte dynamique

Pendant session active :

Refresh context toutes les 60 secondes
OU

Subscription via événement Context change

Objectif : KPI toujours à jour.

1️⃣1️⃣ Consommer réellement la config BO

Implémenter :

styleReponse

longueurReponse

utiliseDioula

utiliseBaoule

suggestionsRapidesEnabled

actionsRapidesEnabled

Ces paramètres ne doivent plus être décoratifs.

🧠 PHASE 3 — EXTENSION CAPACITÉ ACTIONS (APRÈS CORRECTIONS)

Une fois tout sécurisé :

Créer réellement :

UserService.ts
OrderService.ts
CooperativeService.ts
AnalyticsService.ts

Puis créer :

AgentRouter.ts

ActionRegistry.ts

Mais uniquement après mise en conformité P0 + P1.

📊 NOUVEAU SCORE ATTENDU

Après corrections :

Domaine	Score cible
Isolation données	100%
Guard rôles	100%
Logs structurés	100%
Confirmation critique	100%
Race condition	100%
Config BO consommée	100%

Objectif global : ≥ 90% conformité

LIVRABLES ATTENDUS

Diagramme architecture V2

Liste fichiers créés

Liste fichiers supprimés

% logique métier encore dans composants

Score préparation backend /10 (réévalué)

Nouveau % conformité global