DROP TABLE IF EXISTS emprunts;
DROP TABLE IF EXISTS adherents;
DROP TABLE IF EXISTS livres;
DROP TABLE IF EXISTS auteurs;
DROP TABLE IF EXISTS genres;

CREATE TABLE genres (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL
);
INSERT INTO genres VALUES
    (1, 'Roman'),
    (2, 'Science-Fiction'),
    (3, 'Policier'),
    (4, 'Biographie'),
    (5, 'Histoire');

CREATE TABLE auteurs (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    nationalite TEXT,
    annee_naissance INTEGER
);
INSERT INTO auteurs VALUES
    (1,  'Hugo',        'Victor',     'Française',    1802),
    (2,  'Zola',        'Émile',      'Française',    1840),
    (3,  'Camus',       'Albert',     'Française',    1913),
    (4,  'Verne',       'Jules',      'Française',    1828),
    (5,  'Herbert',     'Frank',      'Américaine',   1920),
    (6,  'Christie',    'Agatha',     'Britannique',  1890),
    (7,  'Leblanc',     'Maurice',    'Française',    1864),
    (8,  'Zweig',       'Stefan',     'Autrichienne', 1881),
    (9,  'Michelet',    'Jules',      'Française',    1798),
    (10, 'Asimov',      'Isaac',      'Américaine',   1920);

CREATE TABLE livres (
    id INTEGER PRIMARY KEY,
    titre TEXT NOT NULL,
    auteur_id INTEGER REFERENCES auteurs(id),
    genre_id INTEGER REFERENCES genres(id),
    annee_publication INTEGER,
    stock INTEGER
);
INSERT INTO livres VALUES
    (1,  'Les Misérables',                    1,  1, 1862, 3),
    (2,  'Notre-Dame de Paris',               1,  1, 1831, 2),
    (3,  'L''Assommoir',                      2,  1, 1877, 2),
    (4,  'Germinal',                          2,  1, 1885, 4),
    (5,  'L''Étranger',                       3,  1, 1942, 3),
    (6,  'La Peste',                          3,  1, 1947, 2),
    (7,  'Vingt mille lieues sous les mers',  4,  2, 1870, 3),
    (8,  'De la Terre à la Lune',             4,  2, 1865, 2),
    (9,  'Dune',                              5,  2, 1965, 4),
    (10, 'Fondation',                         10, 2, 1951, 3),
    (11, 'Le Robot',                          10, 2, 1950, 1),
    (12, 'Dix petits nègres',                 6,  3, 1939, 3),
    (13, 'Le Crime de l''Orient-Express',     6,  3, 1934, 2),
    (14, 'Arsène Lupin gentleman cambrioleur',7,  3, 1907, 2),
    (15, 'L''Aiguille creuse',                7,  3, 1909, 1),
    (16, 'Le Monde d''hier',                  8,  4, 1942, 2),
    (17, 'Marie Curie',                       8,  4, 1935, 1),
    (18, 'Histoire de France',                9,  5, 1833, 1),
    (19, 'La Révolution française',           9,  5, 1847, 2),
    (20, 'Voyage au centre de la Terre',      4,  2, 1864, 3);

CREATE TABLE adherents (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    date_inscription DATE,
    ville TEXT
);
INSERT INTO adherents VALUES
    (1,  'Dupont',   'Marie',    'marie@mail.fr',    '2020-03-15', 'Paris'),
    (2,  'Martin',   'Pierre',   'pierre@mail.fr',   '2021-06-20', 'Lyon'),
    (3,  'Bernard',  'Sophie',   'sophie@mail.fr',   '2019-11-01', 'Paris'),
    (4,  'Leroy',    'Thomas',   'thomas@mail.fr',   '2022-01-10', 'Nantes'),
    (5,  'Moreau',   'Isabelle', 'isabelle@mail.fr', '2022-03-05', 'Paris'),
    (6,  'Simon',    'Lucas',    'lucas@mail.fr',    '2020-07-22', 'Bordeaux'),
    (7,  'Laurent',  'Emma',     'emma@mail.fr',     '2023-02-14', 'Paris'),
    (8,  'Lefebvre', 'Nicolas',  NULL,               '2021-09-30', 'Marseille'),
    (9,  'Michel',   'Camille',  'camille@mail.fr',  '2022-04-18', 'Lyon'),
    (10, 'Garcia',   'Julie',    'julie@mail.fr',    '2023-05-07', 'Paris'),
    (11, 'Roux',     'Antoine',  'antoine@mail.fr',  '2019-08-12', 'Toulouse'),
    (12, 'David',    'Claire',   'claire@mail.fr',   '2022-11-25', 'Paris'),
    (13, 'Bertrand', 'Maxime',   NULL,               '2023-07-03', 'Lyon'),
    (14, 'Morel',    'Lucie',    'lucie@mail.fr',    '2020-12-01', 'Paris'),
    (15, 'Fournier', 'Hugo',     'hugo@mail.fr',     '2024-01-15', 'Bordeaux');

CREATE TABLE emprunts (
    id INTEGER PRIMARY KEY,
    adherent_id INTEGER REFERENCES adherents(id),
    livre_id INTEGER REFERENCES livres(id),
    date_emprunt DATE,
    date_retour_prevue DATE,
    date_retour_reelle DATE
);
INSERT INTO emprunts VALUES
    (1,  1,  1,  '2024-01-10', '2024-01-24', '2024-01-22'),
    (2,  1,  5,  '2024-02-01', '2024-02-15', '2024-02-14'),
    (3,  2,  9,  '2024-02-05', '2024-02-19', '2024-02-20'),
    (4,  3,  12, '2024-02-10', '2024-02-24', '2024-02-23'),
    (5,  4,  7,  '2024-02-15', '2024-03-01', NULL),
    (6,  5,  4,  '2024-02-20', '2024-03-05', '2024-03-04'),
    (7,  6,  10, '2024-03-01', '2024-03-15', '2024-03-16'),
    (8,  7,  2,  '2024-03-05', '2024-03-19', NULL),
    (9,  8,  13, '2024-03-10', '2024-03-24', '2024-03-22'),
    (10, 9,  6,  '2024-03-12', '2024-03-26', '2024-03-25'),
    (11, 10, 1,  '2024-03-18', '2024-04-01', NULL),
    (12, 11, 14, '2024-03-20', '2024-04-03', '2024-04-01'),
    (13, 12, 3,  '2024-04-01', '2024-04-15', '2024-04-13'),
    (14, 13, 9,  '2024-04-05', '2024-04-19', '2024-04-18'),
    (15, 14, 16, '2024-04-10', '2024-04-24', NULL),
    (16, 15, 20, '2024-04-12', '2024-04-26', '2024-04-25'),
    (17, 1,  9,  '2024-04-15', '2024-04-29', '2024-04-28'),
    (18, 2,  4,  '2024-04-18', '2024-05-02', NULL),
    (19, 3,  5,  '2024-04-20', '2024-05-04', '2024-05-03'),
    (20, 5,  1,  '2024-04-22', '2024-05-06', '2024-05-05'),
    (21, 7,  10, '2024-05-01', '2024-05-15', NULL),
    (22, 9,  12, '2024-05-03', '2024-05-17', '2024-05-16'),
    (23, 11, 7,  '2024-05-05', '2024-05-19', '2024-05-18'),
    (24, 12, 4,  '2024-05-08', '2024-05-22', NULL),
    (25, 14, 6,  '2024-05-10', '2024-05-24', '2024-05-23');
