# oakDB — Plan de développement

> Vibe coding avec Claude Code
> Règle : chaque étape se termine par un test dans le navigateur

---

## Étape 01 — Bootstrap

Initialiser le projet complet et vérifier que tout communique.

**Backend** : structure FastAPI (`app/api`, `app/sql`, `app/models`, `app/slots`), dépendances installées (DuckDB, sqlglot, JWT, passlib), endpoint `GET /health`, CORS configuré.

**Frontend** : Vite + React 18 + TypeScript + Tailwind CSS + TanStack Query + Zustand, page d'accueil minimaliste qui appelle `/health`.

**Infra** : `docker-compose.dev.yml`, `.env.example`, `README.md`.

**Test** : `http://localhost:5173` affiche "oakDB — statut : ok"

---

## Étape 02 — Éditeur SQL fonctionnel

L'éditeur SQL tourne dans le navigateur et exécute des requêtes sur une vraie base de données.

**Backend** : `DuckDBService` charge une BDD SQL en mémoire, exécute une requête, retourne colonnes + lignes. Erreurs reformulées en français. Mini BDD `boutique` hardcodée (clients, commandes, produits). Endpoint `POST /sql/execute`.

**Frontend** : Monaco Editor avec coloration SQL et raccourci Ctrl+Entrée. Tableau de résultats (TanStack Table). Panneau schéma latéral (tables et colonnes). Bandeau d'erreur en français sous l'éditeur.

**Test** : écrire `SELECT * FROM clients` → tableau avec données ; écrire `SELECT * FROM nope` → message d'erreur clair ; panneau schéma liste les tables boutique

---

## Étape 03 — Visualisation : navigation et étapes de base

Le bouton "Visualiser pas-à-pas" existe et fonctionne pour les clauses fondamentales.

**Backend** : `StepDecomposer` (sqlglot → AST → requêtes partielles), `StepExecutor` (exécution de chaque partielle, calcul du diff). Endpoint `POST /sql/steps`. Clauses couvertes : FROM, WHERE, SELECT, DISTINCT, ORDER BY, LIMIT.

**Frontend** : bouton "Visualiser pas-à-pas" sous l'éditeur. Composant `StepVisualizer` : tableau de l'étape courante, explication en français, navigation Précédent/Suivant, surlignage de la clause dans l'éditeur. Pas encore d'animations — les données changent directement.

**Test** : `SELECT DISTINCT ville FROM clients WHERE age > 30 ORDER BY ville LIMIT 5` → cliquer "Visualiser" → 5 étapes navigables, explication différente à chaque étape, clause surlignée dans l'éditeur

---

## Étape 04 — Visualisation : toutes les clauses avancées

Compléter le moteur et la visualisation avec les clauses complexes.

**Backend** : étendre `StepDecomposer` avec JOIN (INNER, LEFT, RIGHT, FULL), GROUP BY, agrégations (COUNT/SUM/AVG/MIN/MAX), HAVING, fonctions scalaires (UPPER, LOWER, LENGTH, ROUND, COALESCE, CONCAT, SUBSTR, CASE WHEN, dates), sous-requêtes (WHERE IN/EXISTS, FROM dérivé, SELECT scalaire) avec `subquery_steps` imbriqués.

**Frontend** : visualiseur gère les nouvelles étapes. Panneau secondaire pour les sous-requêtes (s'exécute en premier, flèche d'injection). Lecture automatique avec vitesse réglable.

**Test** : `SELECT service, AVG(salaire) as moy FROM employes WHERE age > 25 GROUP BY service HAVING AVG(salaire) > 3000 ORDER BY moy DESC` → toutes les étapes s'affichent avec les bons résultats intermédiaires et explications ; requête avec sous-requête IN → panneau secondaire visible

---

## Étape 05 — Animations

Ajouter les animations Framer Motion sur toutes les étapes du visualiseur.

**FROM** : lignes apparaissent progressivement.
**WHERE / HAVING** : lignes/groupes filtrés surlignés en orange → disparaissent.
**JOIN** : deux tables côte à côte, lignes correspondantes fusionnent, lignes sans correspondance grisées selon le type.
**GROUP BY** : lignes de même valeur glissent pour se regrouper en accordéon.
**Agrégations** : valeurs source surlignées dans chaque groupe, résultat calculé apparaît.
**SELECT** : colonnes disparaissent, alias apparaissent dans les entêtes.
**ORDER BY** : lignes se déplacent vers leur nouvelle position.
**DISTINCT / LIMIT** : doublons surlignés puis retirés ; lignes exclues grisées.
**Fonctions scalaires** : valeurs source remplacées colonne par colonne.

**Test** : rejouer les requêtes des étapes 03 et 04 → toutes les transitions sont animées et fluides ; lecture automatique défile sans à-coups

---

## Étape 06 — Système de slots

Le système de chargement de BDD pédagogiques est opérationnel avec le slot boutique complet.

**Backend** : `SlotLoader` scanne `app/slots/` au démarrage, valide le format, charge chaque slot, pré-calcule les réponses attendues (exécution des `answer_query` → stockage SQLite). Endpoints `GET /slots`, `GET /slots/{id}/schema`.

**Slot `boutique`** : `database.sql` avec 5 tables (clients, commandes, produits, categories, lignes_commande, 30-50 lignes chacune) + `notebook.json` avec 3 chapitres et 15 exercices couvrant SELECT, WHERE, JOIN, GROUP BY, HAVING.

**Frontend** : dropdown de sélection de la BDD active dans l'interface. Changement de BDD recharge le schéma et l'auto-complétion Monaco.

**Test** : sélectionner le slot boutique → schéma des 5 tables dans le panneau ; écrire une jointure entre commandes et clients → résultat correct ; logs backend indiquent "15 réponses pré-calculées"

---

## Étape 07 — Cahier d'exercices

L'apprenant navigue dans les exercices, soumet des réponses et voit sa progression.

**Backend** : `GET /slots/{id}/notebook` (sans les answer_query). `POST /exercises/{id}/validate` : exécute la requête, compare avec la référence stockée, retourne succès/échec + feedback précis ("Votre requête retourne 12 lignes, 8 attendues"). Statuts persistés en SQLite (`non_commencé`, `en_cours`, `réussi`, `réussi_avec_indices`).

**Frontend** :
- Page `Notebook` : sidebar avec chapitres/leçons/exercices, statuts visuels, barre de progression par chapitre
- Page `Exercise` : énoncé, schéma latéral, éditeur SQL, bouton Vérifier → feedback vert/orange, bouton Visualiser sur la requête soumise, indices progressifs (1 clic = 1 indice, du plus vague au plus précis)

**Test** : ouvrir le cahier boutique → faire l'exercice 1 avec la bonne requête → bandeau vert, statut réussi dans la sidebar ; mauvaise requête → feedback précis ; cliquer Visualiser → visualiseur s'ouvre ; fermer et rouvrir → statuts conservés

---

## Étape 08 — Authentification et sessions

Formateur avec compte, apprenants avec code de session.

**Backend** : modèles SQLite `formateurs`, `sessions`, `apprenants`. `POST /auth/login` → JWT. `POST /sessions` (formateur) → session + code `OAK-XXX`. `POST /sessions/join` → `{ code, pseudo }` → JWT apprenant (crée ou retrouve). Middleware JWT. Script de création du compte formateur par défaut au premier démarrage.

**Frontend** :
- Page `/login` : formulaire formateur
- Page `/join` : formulaire code + pseudo
- Dashboard formateur : créer une session (nom + slot), code OAK-XXX affiché en grand, liste des sessions
- Guards de routes : redirect automatique si non authentifié
- Header : info utilisateur + déconnexion

**Test** : formateur se connecte → crée session OAK-4F2 sur slot boutique → ouvrir un onglet privé → rejoindre avec `OAK-4F2` + pseudo `Marie` → accède au cahier boutique ; fermer et rouvrir → Marie retrouve son compte et ses statuts

---

## Étape 09 — Suivi de progression

Historique complet des tentatives, dashboards formateur et apprenant.

**Backend** : enregistrement de chaque tentative (requête, succès/échec, timestamp). `GET /progress/me` (apprenant). `GET /sessions/{id}/progress` (formateur). `GET /apprenants/{id}/attempts/{exercise_id}` (formateur).

**Frontend** :
- Dashboard apprenant : % progression global, statut par chapitre
- Vue formateur session : tableau de tous les apprenants avec %, rafraîchissement toutes les 30s, exercices bloquants mis en rouge (taux d'échec élevé)
- Vue formateur détail apprenant : statut de chaque exercice + historique de toutes les requêtes soumises avec timestamps

**Test** : 2 apprenants (onglets différents) font des exercices → formateur voit leurs progressions distinctes en temps réel ; cliquer un apprenant → voir tout son historique ; exercice raté plusieurs fois → apparaît en rouge dans la vue session

---

## Étape 10 — Slots embarqués + bac à sable + déploiement

Finaliser le contenu, ajouter l'exploration libre et mettre en ligne.

**Slot `mediatheque`** : livres, auteurs, emprunts, adhérents — 12 exercices niveau intermédiaire.
**Slot `rh`** : employés, services, postes, salaires — 12 exercices niveau intermédiaire.
**Slot `cinema`** : films, acteurs, réalisateurs, séances — 15 exercices niveau avancé avec sous-requêtes.

**Bac à sable** : page `/sandbox` — sélecteur de BDD, éditeur complet, visualisation, mode DML activé sur copie in-memory (éphémère).

**Déploiement** : `npm run build` servi par FastAPI. `docker-compose.yml` prod avec service `caddy` (HTTPS automatique). `Caddyfile`. Volume persistant SQLite.

**Test** : 4 slots disponibles et jouables ; bac à sable → `UPDATE clients SET ville = 'Bordeaux' WHERE id = 1` → données modifiées ; rafraîchir → revenues à l'état initial ; déployer sur VPS → `https://ton-domaine.fr` fonctionne avec HTTPS depuis un smartphone

---

## Récapitulatif

| Étape | Ce qu'on construit | Test |
|-------|-------------------|------|
| 01 | Bootstrap | Page "statut ok" dans le navigateur |
| 02 | Éditeur SQL + exécution | Requête → tableau de résultats |
| 03 | Visualisation : clauses de base | 5 étapes navigables sans animations |
| 04 | Visualisation : clauses avancées | GROUP BY, sous-requêtes, fonctions |
| 05 | Animations | Toutes les transitions animées |
| 06 | Système de slots | Slot boutique chargé, schéma visible |
| 07 | Cahier d'exercices | 15 exercices validables |
| 08 | Auth & sessions | Formateur + apprenant sur codes |
| **09** | **Progression** | **← MVP complet** |
| 10 | Contenu + bac à sable + déploiement | En ligne sur le VPS |

---

*Plan rédigé le 27/09/2026*
