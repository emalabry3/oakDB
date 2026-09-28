import duckdb

BOUTIQUE_SQL = """
DROP TABLE IF EXISTS lignes_commande;
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS produits;
DROP TABLE IF EXISTS clients;

CREATE TABLE clients (
    id INTEGER PRIMARY KEY,
    nom VARCHAR NOT NULL,
    prenom VARCHAR NOT NULL,
    email VARCHAR,
    ville VARCHAR,
    age INTEGER
);
INSERT INTO clients VALUES
    (1, 'Dupont',   'Marie',   'marie@mail.fr',    'Paris',     34),
    (2, 'Martin',   'Pierre',  'pierre@mail.fr',   'Lyon',      28),
    (3, 'Bernard',  'Sophie',  NULL,               'Nantes',    45),
    (4, 'Leroy',    'Thomas',  'thomas@mail.fr',   'Paris',     31),
    (5, 'Moreau',   'Isabelle','isabelle@mail.fr', 'Bordeaux',  52),
    (6, 'Simon',    'Lucas',   'lucas@mail.fr',    'Lyon',      23),
    (7, 'Laurent',  'Emma',    'emma@mail.fr',     'Paris',     29),
    (8, 'Lefebvre', 'Nicolas', NULL,               'Toulouse',  38),
    (9, 'Michel',   'Camille', 'camille@mail.fr',  'Nantes',    41),
    (10,'Garcia',   'Julie',   'julie@mail.fr',    'Bordeaux',  27);

CREATE TABLE produits (
    id INTEGER PRIMARY KEY,
    nom VARCHAR NOT NULL,
    categorie VARCHAR,
    prix DECIMAL(10,2),
    stock INTEGER
);
INSERT INTO produits VALUES
    (1,  'Cahier A4',          'Papeterie',     2.50,  150),
    (2,  'Stylo bille bleu',   'Papeterie',     0.80,  500),
    (3,  'Clé USB 32Go',       'Informatique',  12.90,  80),
    (4,  'Souris sans fil',    'Informatique',  24.99,  45),
    (5,  'Agenda 2025',        'Papeterie',     8.50,   60),
    (6,  'Casque audio',       'Informatique',  39.90,  30),
    (7,  'Lampe de bureau',    'Mobilier',      29.99,  25),
    (8,  'Tapis de souris',    'Informatique',   6.90, 120),
    (9,  'Classeur A4',        'Papeterie',      3.20,  90),
    (10, 'Webcam HD',          'Informatique',  49.90,  20);

CREATE TABLE commandes (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    date_cmd DATE,
    statut VARCHAR
);
INSERT INTO commandes VALUES
    (1,  1, '2024-01-15', 'livree'),
    (2,  1, '2024-02-03', 'en_cours'),
    (3,  2, '2024-01-28', 'livree'),
    (4,  3, '2024-02-10', 'annulee'),
    (5,  4, '2024-02-14', 'livree'),
    (6,  5, '2024-02-20', 'en_cours'),
    (7,  6, '2024-03-01', 'livree'),
    (8,  7, '2024-03-05', 'en_cours'),
    (9,  8, '2024-03-10', 'livree'),
    (10, 9, '2024-03-12', 'livree');

CREATE TABLE lignes_commande (
    id INTEGER PRIMARY KEY,
    commande_id INTEGER REFERENCES commandes(id),
    produit_id INTEGER REFERENCES produits(id),
    quantite INTEGER,
    prix_unitaire DECIMAL(10,2)
);
INSERT INTO lignes_commande VALUES
    (1,  1, 3,  1, 12.90),
    (2,  1, 2,  3,  0.80),
    (3,  2, 4,  1, 24.99),
    (4,  3, 1,  2,  2.50),
    (5,  3, 5,  1,  8.50),
    (6,  4, 6,  1, 39.90),
    (7,  5, 7,  1, 29.99),
    (8,  6, 8,  2,  6.90),
    (9,  7, 9,  3,  3.20),
    (10, 8, 10, 1, 49.90),
    (11, 9, 2,  5,  0.80),
    (12, 10,3,  1, 12.90);
"""


class DuckDBService:
    def __init__(self):
        self.conn = duckdb.connect(":memory:")
        self._load_boutique()

    def _load_boutique(self):
        self.conn.execute(BOUTIQUE_SQL)

    def execute(self, query: str) -> dict:
        try:
            rel = self.conn.execute(query)
            columns = [desc[0] for desc in rel.description]
            rows = rel.fetchall()
            return {
                "columns": columns,
                "rows": [list(row) for row in rows],
            }
        except Exception as e:
            raise ValueError(self._format_error(e))

    def get_schema(self) -> list[dict]:
        tables_result = self.conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"
        ).fetchall()

        schema = []
        for (table_name,) in tables_result:
            columns_result = self.conn.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'main' AND table_name = ? ORDER BY ordinal_position",
                [table_name],
            ).fetchall()
            schema.append({
                "table": table_name,
                "columns": [{"name": col, "type": dtype} for col, dtype in columns_result],
            })
        return schema

    def _format_error(self, e: Exception) -> str:
        msg = str(e)

        if "Catalog Error" in msg or "does not exist" in msg:
            # Try to extract the name from the error message
            import re
            match = re.search(r'"([^"]+)"', msg)
            name = match.group(1) if match else "inconnue"
            return f"La table ou colonne '{name}' n'existe pas dans cette base de données."

        if "Parser Error" in msg or "syntax error" in msg:
            return "Erreur de syntaxe SQL. Vérifiez la structure de votre requête."

        if "Binder Error" in msg:
            return "Référence invalide : une colonne ou table est introuvable."

        if "Conversion Error" in msg:
            return "Erreur de type : une valeur ne correspond pas au type attendu."

        return f"Erreur d'exécution : {msg}"


db_service = DuckDBService()
