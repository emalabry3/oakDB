DROP TABLE IF EXISTS lignes_commande;
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS produits;
DROP TABLE IF EXISTS categories;
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
    (1,  'Dupont',    'Marie',     'marie@mail.fr',      'Paris',     34),
    (2,  'Martin',    'Pierre',    'pierre@mail.fr',     'Lyon',      28),
    (3,  'Bernard',   'Sophie',    NULL,                 'Nantes',    45),
    (4,  'Leroy',     'Thomas',    'thomas@mail.fr',     'Paris',     31),
    (5,  'Moreau',    'Isabelle',  'isabelle@mail.fr',   'Bordeaux',  52),
    (6,  'Simon',     'Lucas',     'lucas@mail.fr',      'Lyon',      23),
    (7,  'Laurent',   'Emma',      'emma@mail.fr',       'Paris',     29),
    (8,  'Lefebvre',  'Nicolas',   NULL,                 'Toulouse',  38),
    (9,  'Michel',    'Camille',   'camille@mail.fr',    'Nantes',    41),
    (10, 'Garcia',    'Julie',     'julie@mail.fr',      'Bordeaux',  27),
    (11, 'Roux',      'Antoine',   'antoine@mail.fr',    'Paris',     35),
    (12, 'David',     'Claire',    'claire@mail.fr',     'Lyon',      48),
    (13, 'Bertrand',  'Maxime',    NULL,                 'Marseille', 22),
    (14, 'Morel',     'Lucie',     'lucie@mail.fr',      'Paris',     39),
    (15, 'Fournier',  'Hugo',      'hugo@mail.fr',       'Bordeaux',  33);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    nom VARCHAR NOT NULL,
    description VARCHAR
);
INSERT INTO categories VALUES
    (1, 'Papeterie',    'Articles de bureau et fournitures scolaires'),
    (2, 'Informatique', 'Matériel et accessoires informatiques'),
    (3, 'Mobilier',     'Mobilier de bureau'),
    (4, 'Audio',        'Casques, enceintes et accessoires audio');

CREATE TABLE produits (
    id INTEGER PRIMARY KEY,
    nom VARCHAR NOT NULL,
    categorie_id INTEGER REFERENCES categories(id),
    prix DECIMAL(10,2),
    stock INTEGER
);
INSERT INTO produits VALUES
    (1,  'Cahier A4',           1,  2.50,  150),
    (2,  'Stylo bille bleu',    1,  0.80,  500),
    (3,  'Clé USB 32Go',        2, 12.90,   80),
    (4,  'Souris sans fil',     2, 24.99,   45),
    (5,  'Agenda 2025',         1,  8.50,   60),
    (6,  'Casque audio',        4, 39.90,   30),
    (7,  'Lampe de bureau',     3, 29.99,   25),
    (8,  'Tapis de souris',     2,  6.90,  120),
    (9,  'Classeur A4',         1,  3.20,   90),
    (10, 'Webcam HD',           2, 49.90,   20),
    (11, 'Stylo plume',         1, 15.90,   40),
    (12, 'Enceinte Bluetooth',  4, 59.90,   15),
    (13, 'Bureau réglable',     3,299.00,    8),
    (14, 'Hub USB-C',           2, 34.90,   35),
    (15, 'Carnet A5',           1,  4.50,  200);

CREATE TABLE commandes (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    date_cmd DATE,
    statut VARCHAR
);
INSERT INTO commandes VALUES
    (1,  1,  '2024-01-15', 'livree'),
    (2,  1,  '2024-02-03', 'en_cours'),
    (3,  2,  '2024-01-28', 'livree'),
    (4,  3,  '2024-02-10', 'annulee'),
    (5,  4,  '2024-02-14', 'livree'),
    (6,  5,  '2024-02-20', 'en_cours'),
    (7,  6,  '2024-03-01', 'livree'),
    (8,  7,  '2024-03-05', 'en_cours'),
    (9,  8,  '2024-03-10', 'livree'),
    (10, 9,  '2024-03-12', 'livree'),
    (11, 10, '2024-03-18', 'en_cours'),
    (12, 11, '2024-03-20', 'livree'),
    (13, 12, '2024-04-01', 'livree'),
    (14, 13, '2024-04-05', 'annulee'),
    (15, 14, '2024-04-10', 'en_cours'),
    (16, 15, '2024-04-12', 'livree'),
    (17, 1,  '2024-04-15', 'livree'),
    (18, 2,  '2024-04-18', 'livree'),
    (19, 4,  '2024-04-20', 'en_cours'),
    (20, 7,  '2024-04-22', 'livree');

CREATE TABLE lignes_commande (
    id INTEGER PRIMARY KEY,
    commande_id INTEGER REFERENCES commandes(id),
    produit_id INTEGER REFERENCES produits(id),
    quantite INTEGER,
    prix_unitaire DECIMAL(10,2)
);
INSERT INTO lignes_commande VALUES
    (1,  1,  3,  1, 12.90),
    (2,  1,  2,  3,  0.80),
    (3,  2,  4,  1, 24.99),
    (4,  3,  1,  2,  2.50),
    (5,  3,  5,  1,  8.50),
    (6,  4,  6,  1, 39.90),
    (7,  5,  7,  1, 29.99),
    (8,  6,  8,  2,  6.90),
    (9,  7,  9,  3,  3.20),
    (10, 8,  10, 1, 49.90),
    (11, 9,  2,  5,  0.80),
    (12, 10, 3,  1, 12.90),
    (13, 11, 4,  1, 24.99),
    (14, 12, 11, 2, 15.90),
    (15, 13, 12, 1, 59.90),
    (16, 14, 13, 1,299.00),
    (17, 15, 14, 1, 34.90),
    (18, 16, 15, 4,  4.50),
    (19, 17, 6,  1, 39.90),
    (20, 18, 1,  3,  2.50),
    (21, 19, 2, 10,  0.80),
    (22, 20, 4,  2, 24.99);
