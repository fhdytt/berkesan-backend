USE berkesan;

ALTER TABLE menu_items
  MODIFY COLUMN image_url LONGTEXT NULL;

ALTER TABLE tables
  MODIFY COLUMN qr_code LONGTEXT NULL;

ALTER TABLE orders
  ADD COLUMN table_id INT NULL AFTER user_id,
  ADD CONSTRAINT fk_order_table
  FOREIGN KEY (table_id)
  REFERENCES tables(id)
  ON DELETE SET NULL;

INSERT INTO kategori (name)
SELECT 'Coffee'
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE LOWER(name) = LOWER('Coffee'));

INSERT INTO kategori (name)
SELECT 'Non Coffee'
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE LOWER(name) = LOWER('Non Coffee'));

INSERT INTO kategori (name)
SELECT 'Signature'
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE LOWER(name) = LOWER('Signature'));