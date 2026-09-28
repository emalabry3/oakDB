DROP TABLE IF EXISTS seances;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS acteurs;
DROP TABLE IF EXISTS films;
DROP TABLE IF EXISTS realisateurs;
DROP TABLE IF EXISTS genres;

CREATE TABLE genres (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL
);
INSERT INTO genres VALUES
    (1, 'Action'),
    (2, 'Comédie'),
    (3, 'Drame'),
    (4, 'Science-Fiction'),
    (5, 'Thriller'),
    (6, 'Animation');

CREATE TABLE realisateurs (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    nationalite TEXT
);
INSERT INTO realisateurs VALUES
    (1,  'Nolan',        'Christopher', 'Britannique'),
    (2,  'Spielberg',    'Steven',       'Américaine'),
    (3,  'Audiard',      'Jacques',      'Française'),
    (4,  'Villeneuve',   'Denis',        'Canadienne'),
    (5,  'Luc Besson',   'Luc',          'Française'),
    (6,  'Fincher',      'David',        'Américaine'),
    (7,  'Miyazaki',     'Hayao',        'Japonaise'),
    (8,  'Tarantino',    'Quentin',      'Américaine'),
    (9,  'Ozon',         'François',     'Française'),
    (10, 'Cameron',      'James',        'Canadienne');

CREATE TABLE films (
    id INTEGER PRIMARY KEY,
    titre TEXT NOT NULL,
    realisateur_id INTEGER REFERENCES realisateurs(id),
    genre_id INTEGER REFERENCES genres(id),
    annee_sortie INTEGER,
    duree_minutes INTEGER,
    note_moyenne DECIMAL(3,1)
);
INSERT INTO films VALUES
    (1,  'Inception',                   1,  4, 2010, 148, 8.8),
    (2,  'Interstellar',                1,  4, 2014, 169, 8.6),
    (3,  'Oppenheimer',                 1,  3, 2023, 180, 8.5),
    (4,  'Dune',                        4,  4, 2021, 155, 8.1),
    (5,  'Dune : Deuxième Partie',      4,  4, 2024, 166, 8.7),
    (6,  'Arrête-moi si tu peux',       2,  2, 2002, 141, 8.1),
    (7,  'Schindler''s List',           2,  3, 1993, 195, 9.0),
    (8,  'De rouille et d''os',         3,  3, 2012, 120, 7.4),
    (9,  'Un prophète',                 3,  3, 2009, 155, 7.9),
    (10, 'Le Cinquième Élément',        5,  1, 1997, 126, 7.6),
    (11, 'Léon',                        5,  1, 1994, 110, 8.5),
    (12, 'Fight Club',                  6,  5, 1999, 139, 8.8),
    (13, 'Zodiac',                      6,  5, 2007, 157, 7.7),
    (14, 'Mon voisin Totoro',           7,  6, 1988,  86, 8.2),
    (15, 'Le Voyage de Chihiro',        7,  6, 2001, 125, 9.3),
    (16, 'Pulp Fiction',                8,  5, 1994, 154, 8.9),
    (17, 'Kill Bill Vol. 1',            8,  1, 2003, 111, 8.1),
    (18, 'Dans la maison',              9,  3, 2012,  105, 7.5),
    (19, 'Avatar',                     10,  4, 2009, 162, 7.9),
    (20, 'Titanic',                    10,  3, 1997, 194, 7.8);

CREATE TABLE acteurs (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    nationalite TEXT
);
INSERT INTO acteurs VALUES
    (1,  'DiCaprio',   'Leonardo',  'Américaine'),
    (2,  'Cotillard',  'Marion',    'Française'),
    (3,  'Murphy',     'Cillian',   'Irlandaise'),
    (4,  'Chalamet',   'Timothée',  'Américaine'),
    (5,  'Ferguson',   'Rebecca',   'Suédoise'),
    (6,  'Hanks',      'Tom',       'Américaine'),
    (7,  'Deneuve',    'Catherine', 'Française'),
    (8,  'Cassel',     'Vincent',   'Française'),
    (9,  'Rahim',      'Tahar',     'Française'),
    (10, 'Willis',     'Bruce',     'Américaine'),
    (11, 'Reno',       'Jean',      'Française'),
    (12, 'Norton',     'Edward',    'Américaine'),
    (13, 'Thurman',    'Uma',       'Américaine'),
    (14, 'Travolta',   'John',      'Américaine'),
    (15, 'Winslet',    'Kate',      'Britannique');

CREATE TABLE roles (
    film_id INTEGER REFERENCES films(id),
    acteur_id INTEGER REFERENCES acteurs(id),
    nom_personnage TEXT,
    PRIMARY KEY (film_id, acteur_id)
);
INSERT INTO roles VALUES
    (1,  1,  'Dom Cobb'),
    (1,  2,  'Mal'),
    (1,  3,  'Robert Fischer'),
    (2,  1,  'Cooper'),
    (2,  2,  'Dr. Brand'),
    (3,  3,  'J. Robert Oppenheimer'),
    (4,  4,  'Paul Atréides'),
    (4,  5,  'Lady Jessica'),
    (5,  4,  'Paul Atréides'),
    (5,  5,  'Lady Jessica'),
    (6,  1,  'Frank Abagnale Jr.'),
    (6,  6,  'Carl Hanratty'),
    (7,  6,  'Oskar Schindler'),
    (8,  2,  'Stéphanie'),
    (8,  8,  'Ali'),
    (9,  9,  'Malik El Djebena'),
    (9,  8,  'César Luciani'),
    (10, 10, 'Korben Dallas'),
    (10, 11, 'Léon'),
    (11, 11, 'Léon Montana'),
    (12, 12, 'Le Narrateur'),
    (13, 12, 'Robert Graysmith'),
    (16, 13, 'Mia Wallace'),
    (16, 14, 'Vincent Vega'),
    (17, 13, 'The Bride'),
    (18, 7,  'Germain'),
    (19, 1,  'Jake Sully'),
    (20, 1,  'Jack Dawson'),
    (20, 15, 'Rose DeWitt Bukater'),
    (7,  2,  'Mila Pfefferberg'),
    (3,  1,  'Lewis Strauss'),
    (5,  8,  'Glossu Rabban'),
    (12, 1,  'Tyler Durden'),
    (2,  3,  'Mann');

CREATE TABLE seances (
    id INTEGER PRIMARY KEY,
    film_id INTEGER REFERENCES films(id),
    date_heure TIMESTAMP,
    salle TEXT,
    places_disponibles INTEGER,
    prix DECIMAL(4,2)
);
INSERT INTO seances VALUES
    (1,  1,  '2024-06-01 14:00:00', 'Salle 1', 45, 9.50),
    (2,  1,  '2024-06-01 20:30:00', 'Salle 1', 12, 9.50),
    (3,  2,  '2024-06-01 17:00:00', 'Salle 2', 30, 9.50),
    (4,  2,  '2024-06-02 14:30:00', 'Salle 2', 0,  9.50),
    (5,  3,  '2024-06-02 19:00:00', 'Salle 3', 55, 11.00),
    (6,  3,  '2024-06-03 15:00:00', 'Salle 1', 8,  11.00),
    (7,  4,  '2024-06-03 20:00:00', 'Salle 2', 40, 10.00),
    (8,  5,  '2024-06-04 14:00:00', 'Salle 3', 60, 10.00),
    (9,  5,  '2024-06-04 20:30:00', 'Salle 3', 25, 10.00),
    (10, 6,  '2024-06-05 16:00:00', 'Salle 1', 35, 8.50),
    (11, 7,  '2024-06-05 19:30:00', 'Salle 2', 0,  8.50),
    (12, 8,  '2024-06-06 14:30:00', 'Salle 1', 50, 8.00),
    (13, 9,  '2024-06-06 20:00:00', 'Salle 3', 20, 8.00),
    (14, 10, '2024-06-07 15:30:00', 'Salle 2', 42, 8.50),
    (15, 11, '2024-06-07 20:00:00', 'Salle 1', 18, 8.50),
    (16, 12, '2024-06-08 17:00:00', 'Salle 3', 33, 9.00),
    (17, 12, '2024-06-08 21:00:00', 'Salle 3', 0,  9.00),
    (18, 15, '2024-06-09 14:00:00', 'Salle 1', 70, 9.00),
    (19, 15, '2024-06-09 16:30:00', 'Salle 2', 55, 9.00),
    (20, 16, '2024-06-10 19:30:00', 'Salle 3', 28, 9.50),
    (21, 16, '2024-06-10 22:00:00', 'Salle 1', 0,  9.50),
    (22, 17, '2024-06-11 15:00:00', 'Salle 2', 45, 8.50),
    (23, 19, '2024-06-11 20:00:00', 'Salle 3', 62, 10.00),
    (24, 20, '2024-06-12 14:30:00', 'Salle 1', 38, 8.00),
    (25, 14, '2024-06-12 16:00:00', 'Salle 2', 80, 7.50),
    (26, 3,  '2024-06-13 14:00:00', 'Salle 2', 44, 11.00),
    (27, 5,  '2024-06-13 20:30:00', 'Salle 1', 15, 10.00),
    (28, 1,  '2024-06-14 18:00:00', 'Salle 3', 22, 9.50),
    (29, 7,  '2024-06-14 20:00:00', 'Salle 1', 0,  8.50),
    (30, 2,  '2024-06-15 17:30:00', 'Salle 2', 10, 9.50);
