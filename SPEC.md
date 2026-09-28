# oakDB — Spécification fonctionnelle et technique

> Outil web pédagogique d'apprentissage SQL pour non-informaticiens
> Version 1.0 — Septembre 2026

---

## 1. Vision

oakDB est un outil web sans installation permettant à des apprenants non-informaticiens d'apprendre SQL de façon visuelle et progressive. Son différenciateur central est la **visualisation pas-à-pas de l'exécution logique d'une requête SQL** : l'apprenant ne voit pas seulement le résultat, il voit comment SQL *pense*.

**Problèmes résolus :**
- Zéro installation (navigateur uniquement)
- Interface pensée pour des non-informaticiens
- Compréhension de la logique SQL, pas seulement des résultats
- Progression autonome avec suivi formateur

---

## 2. Public cible

| Rôle | Description |
|------|-------------|
| **Apprenant** | Non-informaticien, découvre SQL. Accède via un code de session. |
| **Formateur** | Crée les sessions, assigne les cahiers, suit la progression. |

Contextes d'usage : présentiel, distanciel, hybride.

---

## 3. Fonctionnalités

### 3.1 Éditeur SQL

- Coloration syntaxique SQL
- Auto-complétion : noms de tables et colonnes de la BDD active
- Affichage du schéma de la BDD active (panneau latéral, rétractable)
- Bouton **Exécuter** → résultat direct
- Bouton **Visualiser pas-à-pas** → active le moteur de visualisation
- Messages d'erreur clairs, en français, non techniques

---

### 3.2 Moteur de visualisation pas-à-pas *(fonctionnalité centrale)*

#### Principe général

La requête est analysée et décomposée en **étapes correspondant à l'ordre logique d'exécution SQL**. Pour chaque étape :

1. La clause concernée est **surlignée** dans l'éditeur
2. Le **résultat intermédiaire** s'affiche sous forme de tableau animé
3. Une **explication en français** décrit l'opération en langage naturel
4. Une **transition animée** montre la transformation depuis l'état précédent

Navigation : boutons **Précédent / Suivant**, lecture automatique avec vitesse réglable.

#### Ordre des étapes et comportement visuel

| # | Clause | Comportement visuel |
|---|--------|---------------------|
| 1 | `FROM` | La/les table(s) s'affichent intégralement. Si plusieurs tables, elles apparaissent côte à côte. |
| 2 | `JOIN` | Animation de liaison : les lignes des deux tables qui partagent la même valeur de clé s'animent pour se rapprocher et fusionner en une ligne du résultat. Les lignes sans correspondance sont grisées (pour illustrer INNER vs LEFT/RIGHT/FULL). |
| 3 | `WHERE` | Les lignes qui ne satisfont pas la condition sont surlignées en rouge/orange, puis retirées avec une animation. L'explication précise quelle condition est évaluée. |
| 4 | `GROUP BY` | Les lignes ayant la même valeur de regroupement s'animent pour se regrouper visuellement (effet "collapse" en accordéon). Chaque groupe devient une ligne-groupe avec ses lignes détail visibles en expansion. |
| 5 | Fonctions d'agrégation (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) | À l'intérieur de chaque groupe (ou sur l'ensemble si pas de GROUP BY), le calcul de la fonction est affiché : les valeurs concernées sont surlignées, le résultat calculé apparaît. |
| 6 | `HAVING` | Parmi les groupes résultants, les groupes qui ne satisfont pas la condition sont éliminés (même animation que WHERE). |
| 7 | Fonctions scalaires (`UPPER`, `LOWER`, `LENGTH`, `ROUND`, `COALESCE`, `CONCAT`, `SUBSTR`, fonctions de date) | La colonne source est visible, la transformation est animée colonne par colonne, le résultat remplace la valeur source. |
| 8 | `SELECT` (projection) | Les colonnes non sélectionnées disparaissent. Les alias de colonnes apparaissent. |
| 9 | `DISTINCT` | Les doublons sont surlignés, puis les lignes en double sont retirées. |
| 10 | `ORDER BY` | Les lignes se réordonnent avec une animation de déplacement. La/les colonne(s) de tri sont surlignées. |
| 11 | `LIMIT` / `OFFSET` | Les lignes exclues par la limite sont grisées puis retirées. |

#### Sous-requêtes

Les sous-requêtes sont traitées en **profondeur d'abord** : la sous-requête s'affiche dans un panneau secondaire et s'exécute visuellement *avant* que la requête principale continue.

Cas gérés :
- Sous-requête dans `WHERE` (scalaire, `IN`, `EXISTS`)
- Sous-requête dans `FROM` (table dérivée)
- Sous-requête dans `SELECT` (scalaire)

Indicateur visuel : la sous-requête est affichée dans une "bulle" ou un panneau superposé, avec une flèche indiquant où son résultat est injecté dans la requête principale.

#### Fonctions de fenêtrage *(optionnel — phase ultérieure)*

Pour les clauses `OVER (PARTITION BY ... ORDER BY ...)` :
- Affichage des partitions avec délimitation visuelle (couleurs par partition)
- Animation du "sliding window" pour les fonctions comme `ROW_NUMBER`, `RANK`, `LAG`, `LEAD`, `SUM OVER`

#### Fonctions couvertes (phase 1)

| Catégorie | Fonctions |
|-----------|-----------|
| Agrégation | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` |
| Texte | `UPPER`, `LOWER`, `LENGTH`, `SUBSTR`, `CONCAT`, `TRIM` |
| Numérique | `ROUND`, `ABS`, `MOD` |
| Conditionnelle | `COALESCE`, `NULLIF`, `CASE WHEN` |
| Date | `CURRENT_DATE`, `NOW`, `YEAR`, `MONTH`, `DAY`, `DATE_DIFF`, `DATE_TRUNC` |

---

### 3.3 Cahier d'exercices progressif

#### Structure

```
Cahier
└── Chapitre (ex: "Les bases du SELECT")
    └── Leçon (ex: "Filtrer avec WHERE")
        └── Exercice
```

#### Un exercice contient

- **Énoncé** : contexte métier + question (rédigé en français non technique)
- **Base de données active** : peut être différente par exercice
- **Schéma visible** : toujours accessible en panneau latéral
- **Indice(s)** : 1 à 3 niveaux, révélés progressivement sur demande de l'apprenant
- **Résultat attendu** : optionnellement affichable (mode découverte vs guidé)
- **Validation** : comparaison de l'ensemble de données retourné, indépendamment de la syntaxe. La requête de référence (définie dans le slot) est exécutée une fois au chargement pour constituer le jeu de données attendu. Succès si les colonnes et valeurs correspondent — l'ordre des lignes est non significatif sauf si l'exercice impose explicitement un `ORDER BY`.
- **Feedback** en cas d'échec : indication orientée sans donner la réponse — ex: "Votre requête retourne 12 lignes, 8 attendues" ou "La colonne `total` est absente du résultat"

#### Progression

- Chaque apprenant progresse à son propre rythme
- Statuts par exercice : `non commencé` / `en cours` / `réussi` / `réussi avec indices`
- Pas de blocage : l'apprenant peut passer un exercice et y revenir
- Barre de progression visuelle par chapitre

---

### 3.4 Suivi de progression

#### Vue apprenant

- Tableau de bord personnel : exercices réussis, en cours, non commencés
- Historique complet des tentatives par exercice (toutes les requêtes soumises, y compris les échecs, avec timestamp)
- Temps passé par exercice (indicatif)

#### Vue formateur

- Liste des apprenants de la session avec leur progression globale (%)
- Détail par apprenant : état de chaque exercice
- Accès à l'historique complet des tentatives d'un apprenant (pour comprendre où il a bloqué)
- Identification des exercices "bloquants" (nombre d'échecs élevé)
- Visualisation en temps réel (utile en présentiel/distanciel)
- Export CSV de la progression

---

### 3.5 Bases de données pédagogiques & système de slots

#### Concept de slot

Un **slot** est une unité autonome et portable regroupant tout le nécessaire pour une séquence d'apprentissage : la base de données, le cahier d'exercices et les réponses attendues. Il s'installe en une seule opération dans oakDB.

Un slot est conçu pour être **généré avec l'aide d'une IA** à partir d'un document de référence (voir section 8).

#### Structure d'un slot

```
slot-boutique/
├── slot.json          ← métadonnées du slot
├── database.sql       ← CREATE TABLE + INSERT INTO (SQL standard)
└── notebook.json      ← cahier d'exercices + requêtes de référence
```

Voir **section 8** pour la spécification détaillée du format de chaque fichier.

#### Slots livrés avec oakDB

| Slot | Thème | Complexité |
|------|-------|------------|
| `boutique` | Clients, commandes, produits | Débutant |
| `mediatheque` | Livres, auteurs, emprunts | Intermédiaire |
| `rh` | Employés, services, salaires | Intermédiaire |
| `cinema` | Films, acteurs, séances | Avancé |

#### Chargement d'un slot

- Le formateur dépose le dossier du slot dans le répertoire `backend/app/slots/`
- Au démarrage, oakDB détecte et charge automatiquement les slots présents
- La BDD de chaque slot est isolée en sandbox DuckDB in-memory par exécution

#### Sécurité des BDD

- Requêtes `SELECT` uniquement en mode exercice (pas de modification de la BDD)
- `INSERT`, `UPDATE`, `DELETE` disponibles en mode "bac à sable" libre uniquement

---

### 3.6 Gestion utilisateurs & sessions

#### Modèle d'accès

- **Formateur** : compte avec login/password
- **Apprenant** : accès par **code de session** (pas d'email requis), choisit un pseudo

#### Gestion des sessions

- Le formateur crée une session (nom + date + cahier assigné + BDD)
- Génération d'un code de session (6 caractères, ex: `OAK-4F2`)
- Les apprenants rejoignent via ce code
- Une session peut être active/archivée

#### Bac à sable libre

- Un espace "exploration libre" accessible indépendamment des exercices
- L'apprenant choisit une BDD et écrit librement
- Mode visualisation disponible ici aussi

---

## 4. Architecture technique

### Vue d'ensemble

```
┌─────────────────────────────────────┐
│           Navigateur                │
│  React SPA + Monaco Editor          │
│  Visualisation (animations CSS/JS)  │
└────────────────┬────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────┐
│         Backend FastAPI (Python)    │
│  - API REST                         │
│  - Moteur d'exécution SQL           │
│  - Parser & analyseur de requêtes   │
│  - Gestion sessions/progression     │
│                                     │
│  ┌─────────────┐  ┌───────────────┐ │
│  │   DuckDB    │  │    SQLite     │ │
│  │ (in-process)│  │  (app data)   │ │
│  │ exécution   │  │ users/sessions│ │
│  │ sandboxes   │  │ progression   │ │
│  └─────────────┘  └───────────────┘ │
└─────────────────────────────────────┘
```

Aucun serveur de base de données externe — tout est embarqué dans le process FastAPI.

### Stack

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Frontend | React 18 + TypeScript | Écosystème riche, composants réutilisables |
| Build | Vite | Dev server rapide, hot reload |
| Style | Tailwind CSS | Utilitaire, pas de composants lourds |
| Éditeur SQL | Monaco Editor | Même moteur que VS Code, excellent SQL |
| Animations | Framer Motion | Animations fluides déclaratives |
| Tables | TanStack Table | Performant, flexible |
| État global | Zustand | Léger, simple pour la visualisation |
| Requêtes API | TanStack Query | Cache, loading states |
| Backend | Python FastAPI | Rapide, typage, async natif |
| Parser SQL | `sqlglot` | Multi-dialectes, AST Python, maintenu activement |
| Moteur SQL | DuckDB (in-process) | Standard SQL, typage strict, window functions, zéro config |
| BDD applicative | SQLite (fichier) | Embarqué, parfait pour OLTP léger (users/sessions/progression) |
| Auth | JWT (python-jose + passlib) | Simple, stateless |
| Déploiement prod | Docker Compose + Caddy | Reproductible, HTTPS automatique |

### Dialectes SQL supportés

Via `sqlglot` : SQL standard, PostgreSQL, MySQL, DuckDB, BigQuery, Spark SQL.
Le formateur choisit le dialecte actif pour une session ou un exercice.

### Exécution pas-à-pas : principe technique

Pour chaque étape logique, le backend :
1. Reconstruit une requête SQL partielle via l'AST `sqlglot` (jusqu'à la clause courante)
2. L'exécute sur DuckDB in-memory et capture le résultat intermédiaire
3. Retourne à la fois le résultat et les métadonnées (lignes ajoutées/supprimées, colonnes projetées...)
4. Le frontend anime la transition entre l'état N-1 et l'état N

### Environnements

#### Développement local (PC du formateur)

```bash
# Terminal 1 — backend (hot reload)
cd backend && uvicorn app.main:app --reload   # port 8000

# Terminal 2 — frontend (hot reload)
cd frontend && npm run dev                    # port 5173
```

Prérequis : Python 3.11+ et Node.js 20+. Aucune installation de base de données.

```bash
# Alternative : tout via Docker
docker compose -f docker-compose.dev.yml up
```

#### Production (VPS)

```bash
docker compose up -d    # avec Caddy pour HTTPS automatique
```

#### Structure des fichiers de déploiement

```
/oakDB
├── docker-compose.yml          ← production (avec Caddy + HTTPS)
├── docker-compose.dev.yml      ← développement local (sans Caddy)
└── Caddyfile                   ← config reverse proxy (2 lignes)
```

### Structure du projet

```
/oakDB
├── frontend/
│   └── src/
│       ├── editor/        Monaco SQL editor
│       ├── viz/           Moteur de visualisation (composants animés)
│       ├── notebook/      Cahier d'exercices
│       └── dashboard/     Suivi de progression
├── backend/
│   └── app/
│       ├── api/           Routes REST
│       ├── sql/           sqlglot parser + DuckDB executor
│       ├── models/        SQLite schemas (users, sessions, progression)
│       └── slots/         Dossiers des slots pédagogiques
├── docker-compose.yml
├── docker-compose.dev.yml
└── Caddyfile

---

## 5. Contraintes & non-objectifs

### Contraintes

- Aucune installation côté apprenant (100% navigateur)
- Interface en français
- Données pédagogiques uniquement (pas de connexion à des BDD de production)
- Hébergement mono-formateur dans un premier temps (1 compte formateur, N apprenants)

### Non-objectifs (phase 1)

- Pas d'IA générative dans l'outil (pas de "génère-moi une requête")
- Pas de support des procédures stockées, triggers, DDL complexe
- Pas d'application mobile native
- Pas de multi-formateurs / multi-organisations (phase ultérieure)
- Pas de fenêtrage (phase 2)

---

---

## 7. Roadmap

### Phase 1 — MVP fonctionnel

- [ ] Éditeur SQL + exécution simple
- [ ] Moteur de visualisation : FROM, JOIN, WHERE, GROUP BY, agrégations, HAVING, SELECT, ORDER BY, LIMIT
- [ ] Sous-requêtes (WHERE IN, FROM dérivé)
- [ ] Système de slots (chargement auto, 4 slots embarqués)
- [ ] Cahier d'exercices (lecture des slots + interface apprenant)
- [ ] Validation par comparaison de données
- [ ] Historique complet des tentatives
- [ ] Sessions apprenant (code d'accès + pseudo)
- [ ] Suivi de progression (vue apprenant + vue formateur)
- [ ] Développement local (Python + Node, sans Docker)
- [ ] Déploiement Docker sur VPS

### Phase 2 — Enrichissement

- [ ] Fonctions de fenêtrage (visualisation OVER/PARTITION BY)
- [ ] Interface formateur de création de slots dans l'outil
- [ ] Dialectes SQL (PostgreSQL, MySQL)
- [ ] Export progression (CSV)
- [ ] Mode DML : INSERT/UPDATE/DELETE en bac à sable

### Phase 3 — Ouverture

- [ ] Multi-formateurs
- [ ] Bibliothèque de slots partagée entre formateurs
- [ ] Statistiques avancées

---

## 8. Format des slots — spécification détaillée

> Ce document sert de référence pour créer des slots avec l'aide d'une IA.

### Qu'est-ce qu'un slot ?

Un slot est un dossier autonome contenant 3 fichiers. Il représente une unité pédagogique complète : une base de données + un cahier d'exercices + les réponses attendues.

```
slot-<nom>/
├── slot.json       ← métadonnées
├── database.sql    ← structure et données de la BDD
└── notebook.json   ← cahier (chapitres, exercices, réponses)
```

---

### Fichier 1 : `slot.json`

Métadonnées du slot.

```json
{
  "id": "boutique-v1",
  "name": "La Boutique en ligne",
  "description": "Une base e-commerce simple : clients, commandes, produits, catégories.",
  "difficulty": "debutant",
  "version": "1.0",
  "author": "Prénom Nom",
  "tags": ["SELECT", "WHERE", "JOIN", "GROUP BY"]
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | oui | Identifiant unique, format `nom-version`, sans espaces |
| `name` | string | oui | Nom affiché dans l'interface |
| `description` | string | oui | Résumé court de la BDD et du thème |
| `difficulty` | string | oui | `debutant`, `intermediaire` ou `avance` |
| `version` | string | oui | Version du slot (ex: `"1.0"`) |
| `author` | string | non | Nom du créateur |
| `tags` | array | non | Clauses SQL couvertes dans le cahier |

---

### Fichier 2 : `database.sql`

Script SQL standard (compatible DuckDB) pour créer et peupler la base de données.

**Règles :**
- Toujours commencer par `DROP TABLE IF EXISTS` pour permettre le rechargement
- Respecter l'ordre de création (clés étrangères : créer les tables parent en premier)
- Utiliser des données réalistes et cohérentes (noms français, valeurs plausibles)
- Volume recommandé : 20 à 50 lignes par table principale
- Pas de procédures stockées, pas de triggers

```sql
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS clients;

CREATE TABLE clients (
    id       INTEGER PRIMARY KEY,
    nom      VARCHAR NOT NULL,
    prenom   VARCHAR NOT NULL,
    email    VARCHAR,
    ville    VARCHAR,
    age      INTEGER
);

INSERT INTO clients VALUES
    (1, 'Dupont',  'Marie',   'marie@mail.fr',  'Paris',  34),
    (2, 'Martin',  'Pierre',  'pierre@mail.fr', 'Lyon',   28),
    (3, 'Bernard', 'Sophie',  NULL,             'Nantes', 45);

CREATE TABLE commandes (
    id          INTEGER PRIMARY KEY,
    client_id   INTEGER REFERENCES clients(id),
    date_cmd    DATE,
    montant     DECIMAL(10,2),
    statut      VARCHAR
);

INSERT INTO commandes VALUES
    (1, 1, '2024-01-15', 129.90, 'livree'),
    (2, 1, '2024-02-03',  49.00, 'en_cours'),
    (3, 2, '2024-01-28', 210.50, 'livree');
```

---

### Fichier 3 : `notebook.json`

Structure complète du cahier d'exercices avec les réponses de référence.

#### Structure globale

```json
{
  "title": "Apprendre SQL avec la Boutique",
  "description": "Cahier progressif du SELECT simple aux agrégations.",
  "chapters": [ ... ]
}
```

#### Structure d'un chapitre

```json
{
  "id": "ch1",
  "title": "Sélectionner des données",
  "description": "Les bases du SELECT et de la projection.",
  "lessons": [ ... ]
}
```

#### Structure d'une leçon

```json
{
  "id": "l1",
  "title": "Le SELECT simple",
  "exercises": [ ... ]
}
```

#### Structure d'un exercice

```json
{
  "id": "ex1",
  "title": "Lister tous les clients",
  "statement": "Affichez la liste complète des clients avec leur nom, prénom et ville.",
  "hints": [
    "Regardez la table clients",
    "Utilisez SELECT avec les colonnes nom, prenom, ville"
  ],
  "answer_query": "SELECT nom, prenom, ville FROM clients",
  "order_sensitive": false
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | oui | Identifiant unique dans le notebook, format `ex1`, `ex2`... |
| `title` | string | oui | Titre court de l'exercice |
| `statement` | string | oui | Énoncé complet en français, rédigé pour un non-informaticien. Inclure le contexte métier. **Doit toujours nommer explicitement les colonnes à afficher** (ex : "avec leur nom, prénom et ville") — ne jamais écrire "affichez les clients" sans préciser les champs, au risque de rendre la validation ambiguë. |
| `hints` | array | non | 1 à 3 indices, du plus vague au plus précis. Chaque indice est une string. |
| `answer_query` | string | oui | Requête SQL de référence. Son résultat constitue le jeu de données attendu. |
| `order_sensitive` | boolean | oui | `true` si l'exercice exige un `ORDER BY` précis (l'ordre des lignes compte pour la validation). `false` sinon. |

#### Exemple complet de `notebook.json`

```json
{
  "title": "Apprendre SQL avec la Boutique",
  "description": "Cahier progressif du SELECT simple aux agrégations.",
  "chapters": [
    {
      "id": "ch1",
      "title": "Sélectionner des données",
      "description": "Les bases du SELECT.",
      "lessons": [
        {
          "id": "l1",
          "title": "Le SELECT simple",
          "exercises": [
            {
              "id": "ex1",
              "title": "Lister tous les clients",
              "statement": "Affichez la liste complète des clients avec leur nom, prénom et ville.",
              "hints": [
                "Regardez la table clients",
                "Utilisez SELECT avec les colonnes nom, prenom, ville"
              ],
              "answer_query": "SELECT nom, prenom, ville FROM clients",
              "order_sensitive": false
            },
            {
              "id": "ex2",
              "title": "Les clients de Paris",
              "statement": "Affichez uniquement les clients habitant à Paris.",
              "hints": [
                "Utilisez une condition avec WHERE",
                "La colonne ville contient la ville du client"
              ],
              "answer_query": "SELECT nom, prenom, ville FROM clients WHERE ville = 'Paris'",
              "order_sensitive": false
            }
          ]
        }
      ]
    },
    {
      "id": "ch2",
      "title": "Trier et regrouper",
      "description": "ORDER BY, GROUP BY et fonctions d'agrégation.",
      "lessons": [
        {
          "id": "l2",
          "title": "Trier les résultats",
          "exercises": [
            {
              "id": "ex3",
              "title": "Clients par ordre alphabétique",
              "statement": "Affichez tous les clients triés par nom de famille dans l'ordre alphabétique.",
              "hints": [
                "Utilisez ORDER BY"
              ],
              "answer_query": "SELECT nom, prenom FROM clients ORDER BY nom ASC",
              "order_sensitive": true
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Bonnes pratiques pour créer un slot avec une IA

Lors de la génération d'un slot avec une IA, fournir ce cadrage :

1. **Thème métier** : décrire le contexte (ex: "une médiathèque avec livres, auteurs et emprunts")
2. **Tables souhaitées** : lister les entités et leurs relations
3. **Niveau cible** : débutant / intermédiaire / avancé
4. **Clauses SQL à couvrir** : ex: "SELECT, WHERE, JOIN INNER, GROUP BY, COUNT, HAVING"
5. **Nombre d'exercices** : ex: "15 exercices répartis en 3 chapitres"
6. **Consignes de rédaction** : "Énoncés en français, langage non technique, contexte métier réaliste"
7. **Colonnes explicites** : "Chaque énoncé doit nommer les colonnes à afficher — jamais 'affichez les clients' sans préciser lesquels des champs sont attendus"

L'IA produit les 3 fichiers. Vérifier ensuite :
- Que `database.sql` s'exécute sans erreur dans DuckDB
- Que chaque `answer_query` retourne bien des données (non vide)
- Que les `hints` sont progressifs (vague → précis)
- Que `order_sensitive` est `true` uniquement quand l'ordre est pédagogiquement significatif
- Que chaque `statement` nomme explicitement les colonnes attendues (jamais "affichez les clients" sans préciser les champs)

---

*Spec rédigée le 27/09/2026 — mise à jour le 27/09/2026 (stack DuckDB+SQLite, dev local, système de slots, validation par données, historique complet).*
