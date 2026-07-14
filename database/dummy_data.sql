-- ============================================================
-- DUMMY DATA — Berkesan Coffee
-- Jalankan SETELAH schema.postgres.sql
-- ============================================================

-- 1. USERS
INSERT INTO users (username, password, name, role)
VALUES ('Admin', '$2b$10$H2DBH8/KV3j6b4e5RiPos.MuKQCYq3.rQy7cmlz7yEOSFoRHfmPiq', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, name, role)
VALUES ('Kasir', '$2b$10$KOuyFmOKIxAHC14r07AUJ.hqgphB2rzXTXfPXr1RnycvuF.9/8d7a', 'Kasir', 'kasir')
ON CONFLICT (username) DO NOTHING;

-- 2. KATEGORI
INSERT INTO kategori (id, name, created_at) VALUES
  (1, 'Coffee',     '2026-05-19 15:49:53+07'),
  (2, 'Non Coffee', '2026-05-19 15:49:57+07'),
  (3, 'Signature',  '2026-05-19 15:50:03+07')
ON CONFLICT (id) DO NOTHING;
SELECT setval('kategori_id_seq', (SELECT MAX(id) FROM kategori));