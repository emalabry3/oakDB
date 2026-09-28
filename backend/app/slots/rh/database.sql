DROP TABLE IF EXISTS conges;
DROP TABLE IF EXISTS employes;
DROP TABLE IF EXISTS postes;
DROP TABLE IF EXISTS services;

CREATE TABLE services (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    localisation TEXT
);
INSERT INTO services VALUES
    (1, 'Informatique', 'Paris'),
    (2, 'Marketing',    'Lyon'),
    (3, 'Finance',      'Paris'),
    (4, 'Logistique',   'Bordeaux'),
    (5, 'Direction',    'Paris');

CREATE TABLE postes (
    id INTEGER PRIMARY KEY,
    titre TEXT NOT NULL,
    niveau TEXT,
    salaire_min DECIMAL(10,2),
    salaire_max DECIMAL(10,2)
);
INSERT INTO postes VALUES
    (1, 'Développeur',      'junior', 2800.00,  4500.00),
    (2, 'Chef de projet',   'senior', 4500.00,  7000.00),
    (3, 'Analyste',         'junior', 2600.00,  4000.00),
    (4, 'Responsable',      'senior', 5000.00,  8000.00),
    (5, 'Assistant',        'junior', 2200.00,  3200.00),
    (6, 'Directeur',        'senior', 8000.00, 15000.00);

CREATE TABLE employes (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    service_id INTEGER REFERENCES services(id),
    poste_id INTEGER REFERENCES postes(id),
    date_embauche DATE,
    salaire DECIMAL(10,2),
    manager_id INTEGER
);
INSERT INTO employes VALUES
    (1,  'Morel',     'Isabelle', 'i.morel@corp.fr',    5, 6, '2015-03-01', 12000.00, NULL),
    (2,  'Leclerc',   'François', 'f.leclerc@corp.fr',  1, 4, '2017-06-15', 6500.00,  1),
    (3,  'Dupont',    'Marie',    'm.dupont@corp.fr',   2, 4, '2018-09-01', 5800.00,  1),
    (4,  'Martin',    'Pierre',   'p.martin@corp.fr',   3, 4, '2016-02-10', 6200.00,  1),
    (5,  'Bernard',   'Sophie',   's.bernard@corp.fr',  4, 4, '2019-05-20', 5500.00,  1),
    (6,  'Petit',     'Lucas',    'l.petit@corp.fr',    1, 1, '2021-03-10', 3200.00,  2),
    (7,  'Richard',   'Emma',     'e.richard@corp.fr',  1, 1, '2020-07-01', 3500.00,  2),
    (8,  'Simon',     'Hugo',     'h.simon@corp.fr',    1, 2, '2019-11-15', 5000.00,  2),
    (9,  'Laurent',   'Camille',  'c.laurent@corp.fr',  1, 1, '2022-01-05', 3000.00,  2),
    (10, 'Lefebvre',  'Thomas',   't.lefebvre@corp.fr', 2, 3, '2020-04-20', 3800.00,  3),
    (11, 'Michel',    'Julie',    'j.michel@corp.fr',   2, 5, '2021-08-01', 2800.00,  3),
    (12, 'Garcia',    'Antoine',  'a.garcia@corp.fr',   2, 2, '2018-12-01', 4800.00,  3),
    (13, 'Roux',      'Claire',   'c.roux@corp.fr',     3, 3, '2019-03-15', 3900.00,  4),
    (14, 'David',     'Nicolas',  'n.david@corp.fr',    3, 3, '2020-09-10', 3600.00,  4),
    (15, 'Bertrand',  'Lucie',    'l.bertrand@corp.fr', 3, 5, '2022-06-01', 2600.00,  4),
    (16, 'Moreau',    'Maxime',   'm.moreau@corp.fr',   4, 3, '2019-07-22', 3700.00,  5),
    (17, 'Fournier',  'Sarah',    's.fournier@corp.fr', 4, 5, '2021-02-15', 2500.00,  5),
    (18, 'Girard',    'Alexis',   'a.girard@corp.fr',   4, 2, '2018-05-03', 4700.00,  5),
    (19, 'Bonnet',    'Manon',    'm.bonnet@corp.fr',   1, 1, '2023-03-01', 2900.00,  2),
    (20, 'Lambert',   'Kevin',    'k.lambert@corp.fr',  2, 5, '2023-07-10', 2700.00,  3);

CREATE TABLE conges (
    id INTEGER PRIMARY KEY,
    employe_id INTEGER REFERENCES employes(id),
    date_debut DATE,
    date_fin DATE,
    type TEXT CHECK(type IN ('RTT', 'Congés payés', 'Maladie')),
    statut TEXT CHECK(statut IN ('approuvé', 'refusé', 'en attente'))
);
INSERT INTO conges VALUES
    (1,  6,  '2024-02-05', '2024-02-09', 'Congés payés', 'approuvé'),
    (2,  7,  '2024-02-12', '2024-02-16', 'RTT',          'approuvé'),
    (3,  8,  '2024-03-04', '2024-03-08', 'Congés payés', 'approuvé'),
    (4,  9,  '2024-03-11', '2024-03-12', 'Maladie',      'approuvé'),
    (5,  10, '2024-03-18', '2024-03-22', 'Congés payés', 'approuvé'),
    (6,  11, '2024-04-01', '2024-04-05', 'RTT',          'en attente'),
    (7,  12, '2024-04-08', '2024-04-12', 'Congés payés', 'approuvé'),
    (8,  13, '2024-04-15', '2024-04-19', 'Congés payés', 'approuvé'),
    (9,  14, '2024-04-22', '2024-04-23', 'Maladie',      'approuvé'),
    (10, 15, '2024-05-06', '2024-05-10', 'RTT',          'refusé'),
    (11, 16, '2024-05-13', '2024-05-17', 'Congés payés', 'approuvé'),
    (12, 17, '2024-05-20', '2024-05-24', 'Congés payés', 'en attente'),
    (13, 18, '2024-06-03', '2024-06-07', 'RTT',          'approuvé'),
    (14, 19, '2024-06-10', '2024-06-11', 'Maladie',      'approuvé'),
    (15, 20, '2024-06-17', '2024-06-21', 'Congés payés', 'en attente'),
    (16, 6,  '2024-07-01', '2024-07-12', 'Congés payés', 'approuvé'),
    (17, 7,  '2024-07-15', '2024-07-26', 'Congés payés', 'approuvé'),
    (18, 10, '2024-08-05', '2024-08-16', 'Congés payés', 'approuvé'),
    (19, 13, '2024-08-19', '2024-08-23', 'RTT',          'approuvé'),
    (20, 16, '2024-09-02', '2024-09-03', 'Maladie',      'approuvé');
