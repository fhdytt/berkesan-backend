USE berkesan;

INSERT INTO kategori (name)
SELECT 'Coffee'
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE LOWER(name) = LOWER('Coffee'));

INSERT INTO kategori (name)
SELECT 'Non Coffee'
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE LOWER(name) = LOWER('Non Coffee'));

INSERT INTO kategori (name)
SELECT 'Signature'
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE LOWER(name) = LOWER('Signature'));