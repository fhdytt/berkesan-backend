-- ============================================================
-- DUMMY SALES DATA — Berkesan Coffee
-- Data penjualan 3 bulan: Mei - Juli 2026
-- Jalankan SETELAH schema.postgres.sql dan dummy_data.sql
-- ============================================================

-- 1. TABLES (Meja)
INSERT INTO tables (table_number, is_active) VALUES
  ('1', TRUE), ('2', TRUE), ('3', TRUE), ('4', TRUE),
  ('5', TRUE), ('6', TRUE), ('7', TRUE), ('8', TRUE),
  ('9', TRUE), ('10', TRUE)
ON CONFLICT (table_number) DO NOTHING;

-- ============================================================
-- 2. ORDERS MEI 2026
-- ============================================================
INSERT INTO orders (order_code, user_id, table_id, customer_name, total_price, payment_method, paid_amount, change_amount, status, payment_status, queue_number, created_at) VALUES
('ORD-MAY-001', 1, 1, 'Budi',    60000, 'cash', 60000, 0,    'selesai', 'paid', 'A01', '2026-05-01 09:15:00+07'),
('ORD-MAY-002', 1, 2, 'Sari',    40000, 'qris', 40000, 0,    'selesai', 'paid', 'A02', '2026-05-02 10:30:00+07'),
('ORD-MAY-003', 1, 3, 'Deni',    44000, 'cash', 50000, 6000, 'selesai', 'paid', 'A03', '2026-05-03 08:45:00+07'),
('ORD-MAY-004', 1, 4, 'Rina',    65000, 'qris', 65000, 0,    'selesai', 'paid', 'A04', '2026-05-04 11:00:00+07'),
('ORD-MAY-005', 1, 5, 'Anto',    38000, 'cash', 40000, 2000, 'selesai', 'paid', 'A05', '2026-05-05 09:00:00+07'),
('ORD-MAY-006', 1, 6, 'Dewi',    47000, 'qris', 47000, 0,    'selesai', 'paid', 'A06', '2026-05-06 13:00:00+07'),
('ORD-MAY-007', 1, 7, 'Hana',    55000, 'cash', 60000, 5000, 'selesai', 'paid', 'A07', '2026-05-07 10:15:00+07'),
('ORD-MAY-008', 1, 8, 'Rudi',    42000, 'qris', 42000, 0,    'selesai', 'paid', 'A08', '2026-05-08 14:00:00+07'),
('ORD-MAY-009', 1, 1, 'Tini',    70000, 'cash', 70000, 0,    'selesai', 'paid', 'A09', '2026-05-09 08:30:00+07'),
('ORD-MAY-010', 1, 2, 'Wawan',   35000, 'qris', 35000, 0,    'selesai', 'paid', 'A10', '2026-05-10 12:30:00+07'),
('ORD-MAY-011', 1, 3, 'Fitri',   62000, 'cash', 70000, 8000, 'selesai', 'paid', 'A11', '2026-05-11 09:45:00+07'),
('ORD-MAY-012', 1, 4, 'Galih',   45000, 'qris', 45000, 0,    'selesai', 'paid', 'A12', '2026-05-12 15:00:00+07'),
('ORD-MAY-013', 1, 5, 'Laras',   80000, 'cash', 80000, 0,    'selesai', 'paid', 'A13', '2026-05-13 10:00:00+07'),
('ORD-MAY-014', 1, 6, 'Fajar',   36000, 'qris', 36000, 0,    'selesai', 'paid', 'A14', '2026-05-14 16:00:00+07'),
('ORD-MAY-015', 1, 7, 'Nana',    44000, 'cash', 50000, 6000, 'selesai', 'paid', 'A15', '2026-05-15 09:00:00+07'),
('ORD-MAY-016', 1, 8, 'Irfan',   68000, 'qris', 68000, 0,    'selesai', 'paid', 'A16', '2026-05-16 11:30:00+07'),
('ORD-MAY-017', 1, 1, 'Yuni',    55000, 'cash', 60000, 5000, 'selesai', 'paid', 'A17', '2026-05-17 08:00:00+07'),
('ORD-MAY-018', 1, 2, 'Agus',    40000, 'qris', 40000, 0,    'selesai', 'paid', 'A18', '2026-05-18 14:00:00+07'),
('ORD-MAY-019', 1, 3, 'Mega',    75000, 'cash', 80000, 5000, 'selesai', 'paid', 'A19', '2026-05-19 10:30:00+07'),
('ORD-MAY-020', 1, 4, 'Dimas',   42000, 'qris', 42000, 0,    'selesai', 'paid', 'A20', '2026-05-20 13:45:00+07'),
('ORD-MAY-021', 1, 5, 'Putri',   60000, 'cash', 60000, 0,    'selesai', 'paid', 'A21', '2026-05-21 09:15:00+07'),
('ORD-MAY-022', 1, 6, 'Bagas',   50000, 'qris', 50000, 0,    'selesai', 'paid', 'A22', '2026-05-22 15:30:00+07'),
('ORD-MAY-023', 1, 7, 'Indah',   85000, 'cash', 90000, 5000, 'selesai', 'paid', 'A23', '2026-05-23 08:45:00+07'),
('ORD-MAY-024', 1, 8, 'Wahyu',   36000, 'qris', 36000, 0,    'selesai', 'paid', 'A24', '2026-05-24 12:00:00+07'),
('ORD-MAY-025', 1, 1, 'Ayu',     62000, 'cash', 70000, 8000, 'selesai', 'paid', 'A25', '2026-05-25 10:00:00+07'),
('ORD-MAY-026', 1, 2, 'Rizky',   48000, 'qris', 48000, 0,    'selesai', 'paid', 'A26', '2026-05-26 14:30:00+07'),
('ORD-MAY-027', 1, 3, 'Lina',    70000, 'cash', 70000, 0,    'selesai', 'paid', 'A27', '2026-05-27 09:30:00+07'),
('ORD-MAY-028', 1, 4, 'Hendra',  45000, 'qris', 45000, 0,    'selesai', 'paid', 'A28', '2026-05-28 16:00:00+07'),
('ORD-MAY-029', 1, 5, 'Devi',    55000, 'cash', 60000, 5000, 'selesai', 'paid', 'A29', '2026-05-29 08:30:00+07'),
('ORD-MAY-030', 1, 6, 'Faris',   66000, 'qris', 66000, 0,    'selesai', 'paid', 'A30', '2026-05-30 11:00:00+07'),
('ORD-MAY-031', 1, 7, 'Novi',    50000, 'cash', 50000, 0,    'selesai', 'paid', 'A31', '2026-05-31 10:00:00+07');


-- ============================================================
-- 3. ORDERS JUNI 2026
-- ============================================================
INSERT INTO orders (order_code, user_id, table_id, customer_name, total_price, payment_method, paid_amount, change_amount, status, payment_status, queue_number, created_at) VALUES
('ORD-JUN-001', 1, 1, 'Adit',   65000, 'cash', 70000, 5000, 'selesai', 'paid', 'A01', '2026-06-01 09:00:00+07'),
('ORD-JUN-002', 1, 2, 'Susi',   44000, 'qris', 44000, 0,    'selesai', 'paid', 'A02', '2026-06-02 13:30:00+07'),
('ORD-JUN-003', 1, 3, 'Reza',   80000, 'cash', 80000, 0,    'selesai', 'paid', 'A03', '2026-06-03 08:30:00+07'),
('ORD-JUN-004', 1, 4, 'Tiara',  42000, 'qris', 42000, 0,    'selesai', 'paid', 'A04', '2026-06-04 12:00:00+07'),
('ORD-JUN-005', 1, 5, 'Gilang', 55000, 'cash', 60000, 5000, 'selesai', 'paid', 'A05', '2026-06-05 10:15:00+07'),
('ORD-JUN-006', 1, 6, 'Nabila', 70000, 'qris', 70000, 0,    'selesai', 'paid', 'A06', '2026-06-06 14:00:00+07'),
('ORD-JUN-007', 1, 7, 'Ferdi',  48000, 'cash', 50000, 2000, 'selesai', 'paid', 'A07', '2026-06-07 09:45:00+07'),
('ORD-JUN-008', 1, 8, 'Citra',  92000, 'cash',100000, 8000, 'selesai', 'paid', 'A08', '2026-06-08 08:00:00+07'),
('ORD-JUN-009', 1, 1, 'Haris',  40000, 'qris', 40000, 0,    'selesai', 'paid', 'A09', '2026-06-09 12:30:00+07'),
('ORD-JUN-010', 1, 2, 'Wening', 58000, 'cash', 60000, 2000, 'selesai', 'paid', 'A10', '2026-06-10 10:00:00+07'),
('ORD-JUN-011', 1, 3, 'Daffa',  44000, 'qris', 44000, 0,    'selesai', 'paid', 'A11', '2026-06-11 14:30:00+07'),
('ORD-JUN-012', 1, 4, 'Mawar',  75000, 'cash', 80000, 5000, 'selesai', 'paid', 'A12', '2026-06-12 09:00:00+07'),
('ORD-JUN-013', 1, 5, 'Ridho',  50000, 'qris', 50000, 0,    'selesai', 'paid', 'A13', '2026-06-13 16:00:00+07'),
('ORD-JUN-014', 1, 6, 'Naura',  62000, 'cash', 70000, 8000, 'selesai', 'paid', 'A14', '2026-06-14 08:45:00+07'),
('ORD-JUN-015', 1, 7, 'Alfian', 48000, 'qris', 48000, 0,    'selesai', 'paid', 'A15', '2026-06-15 13:00:00+07'),
('ORD-JUN-016', 1, 8, 'Tari',   85000, 'cash', 90000, 5000, 'selesai', 'paid', 'A16', '2026-06-16 10:30:00+07'),
('ORD-JUN-017', 1, 1, 'Sapto',  38000, 'qris', 38000, 0,    'selesai', 'paid', 'A17', '2026-06-17 15:30:00+07'),
('ORD-JUN-018', 1, 2, 'Lusi',   66000, 'cash', 70000, 4000, 'selesai', 'paid', 'A18', '2026-06-18 09:15:00+07'),
('ORD-JUN-019', 1, 3, 'Nurul',  44000, 'qris', 44000, 0,    'selesai', 'paid', 'A19', '2026-06-19 13:45:00+07'),
('ORD-JUN-020', 1, 4, 'Irwan',  70000, 'cash', 70000, 0,    'selesai', 'paid', 'A20', '2026-06-20 08:30:00+07'),
('ORD-JUN-021', 1, 5, 'Yanti',  52000, 'qris', 52000, 0,    'selesai', 'paid', 'A21', '2026-06-21 14:00:00+07'),
('ORD-JUN-022', 1, 6, 'Koko',   88000, 'cash', 90000, 2000, 'selesai', 'paid', 'A22', '2026-06-22 10:00:00+07'),
('ORD-JUN-023', 1, 7, 'Dika',   60000, 'cash', 60000, 0,    'selesai', 'paid', 'A23', '2026-06-23 09:30:00+07'),
('ORD-JUN-024', 1, 8, 'Sekar',  50000, 'qris', 50000, 0,    'selesai', 'paid', 'A24', '2026-06-24 14:30:00+07'),
('ORD-JUN-025', 1, 1, 'Yogi',   76000, 'cash', 80000, 4000, 'selesai', 'paid', 'A25', '2026-06-25 08:00:00+07'),
('ORD-JUN-026', 1, 2, 'Niken',  44000, 'qris', 44000, 0,    'selesai', 'paid', 'A26', '2026-06-26 13:00:00+07'),
('ORD-JUN-027', 1, 3, 'Arya',   95000, 'cash',100000, 5000, 'selesai', 'paid', 'A27', '2026-06-27 10:15:00+07'),
('ORD-JUN-028', 1, 4, 'Fitria', 40000, 'qris', 40000, 0,    'selesai', 'paid', 'A28', '2026-06-28 15:30:00+07'),
('ORD-JUN-029', 1, 5, 'Wahid',  72000, 'cash', 80000, 8000, 'selesai', 'paid', 'A29', '2026-06-29 09:00:00+07'),
('ORD-JUN-030', 1, 6, 'Hadi',   90000, 'cash', 90000, 0,    'selesai', 'paid', 'A30', '2026-06-30 11:00:00+07');

-- ============================================================
-- 4. ORDERS JULI 2026
-- ============================================================
INSERT INTO orders (order_code, user_id, table_id, customer_name, total_price, payment_method, paid_amount, change_amount, status, payment_status, queue_number, created_at) VALUES
('ORD-JUL-001', 1, 1, 'Dimas',  70000, 'cash', 70000, 0,    'selesai', 'paid', 'A01', '2026-07-01 09:00:00+07'),
('ORD-JUL-002', 1, 2, 'Maya',   44000, 'qris', 44000, 0,    'selesai', 'paid', 'A02', '2026-07-02 13:00:00+07'),
('ORD-JUL-003', 1, 3, 'Agung',  88000, 'cash', 90000, 2000, 'selesai', 'paid', 'A03', '2026-07-03 08:30:00+07'),
('ORD-JUL-004', 1, 4, 'Eka',    50000, 'qris', 50000, 0,    'selesai', 'paid', 'A04', '2026-07-04 12:30:00+07'),
('ORD-JUL-005', 1, 5, 'Faisal', 62000, 'cash', 70000, 8000, 'selesai', 'paid', 'A05', '2026-07-05 10:00:00+07'),
('ORD-JUL-006', 1, 6, 'Dewi',   46000, 'qris', 46000, 0,    'selesai', 'paid', 'A06', '2026-07-06 14:30:00+07'),
('ORD-JUL-007', 1, 7, 'Rio',    78000, 'cash', 80000, 2000, 'selesai', 'paid', 'A07', '2026-07-07 09:15:00+07'),
('ORD-JUL-008', 1, 8, 'Ade',    95000, 'cash',100000, 5000, 'selesai', 'paid', 'A08', '2026-07-08 08:45:00+07'),
('ORD-JUL-009', 1, 1, 'Noval',  66000, 'qris', 66000, 0,    'selesai', 'paid', 'A09', '2026-07-09 10:00:00+07'),
('ORD-JUL-010', 1, 2, 'Wati',   52000, 'cash', 60000, 8000, 'selesai', 'paid', 'A10', '2026-07-10 14:00:00+07'),
('ORD-JUL-011', 1, 3, 'Hamid',  84000, 'qris', 84000, 0,    'selesai', 'paid', 'A11', '2026-07-11 09:30:00+07'),
('ORD-JUL-012', 1, 4, 'Bagas',  72000, 'cash', 80000, 8000, 'selesai', 'paid', 'A12', '2026-07-12 08:00:00+07'),
('ORD-JUL-013', 1, 5, 'Farid',  90000, 'qris', 90000, 0,    'selesai', 'paid', 'A13', '2026-07-13 10:15:00+07'),
('ORD-JUL-014', 1, 6, 'Arif',   86000, 'cash', 90000, 4000, 'selesai', 'paid', 'A14', '2026-07-14 07:30:00+07');
