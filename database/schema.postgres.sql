-- ============================================
-- DATABASE COFFEE SHOP 
-- ============================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(150),
    role        VARCHAR(10) NOT NULL DEFAULT 'kasir'
                CHECK (role IN ('admin', 'kasir', 'dev')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    last_login  TIMESTAMPTZ
);

-- 2. KATEGORI
CREATE TABLE IF NOT EXISTS kategori (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MENU ITEMS 
CREATE TABLE IF NOT EXISTS menu_items (
    id              SERIAL PRIMARY KEY,
    kategori_id     INTEGER NOT NULL REFERENCES kategori(id),
    name            VARCHAR(150) NOT NULL,
    price           NUMERIC(10, 2) NOT NULL,
    image_url       TEXT,
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLES
CREATE TABLE IF NOT EXISTS tables (
    id              SERIAL PRIMARY KEY,
    table_number    VARCHAR(20) UNIQUE NOT NULL,
    qr_code         TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS 
CREATE TABLE IF NOT EXISTS orders (
    id                      SERIAL PRIMARY KEY,
    order_code              VARCHAR(50) UNIQUE NOT NULL,
    user_id                 INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    table_id                INTEGER DEFAULT NULL REFERENCES tables(id) ON DELETE SET NULL,
    customer_name           VARCHAR(150),
    total_price             NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- payment_method sekarang mencakup channel umum gateway
    payment_method          VARCHAR(20) NOT NULL
                            CHECK (payment_method IN (
                                'cash', 'qris', 'transfer', 'debit', 'credit',
                                'va', 'ewallet'
                            )),
    paid_amount             NUMERIC(12, 2) DEFAULT 0,
    change_amount           NUMERIC(12, 2) DEFAULT 0,

    -- status = progress pesanan dapur/kasir (TIDAK terikat status bayar lagi)
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'diproses', 'selesai', 'dibatalkan')),

    -- payment_status = status pembayaran, independen dari status di atas
    payment_status          VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                            CHECK (payment_status IN (
                                'unpaid', 'pending', 'paid', 'failed',
                                'expired', 'cancelled', 'refunded', 'partial_refund'
                            )),

    -- kolom generic untuk gateway apapun 
    gateway_name            VARCHAR(50),          
    gateway_reference_id    VARCHAR(150),         -- transaction_id / external_id dari gateway
    payment_url             TEXT,                 -- snap_token url / invoice_url
    expired_at              TIMESTAMPTZ,          -- kapan link/QR pembayaran expired
    paid_at                 TIMESTAMPTZ,          -- kapan konfirmasi paid diterima
    queue_number            VARCHAR(10),

    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id    INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    menu_name       VARCHAR(150) NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    price           NUMERIC(10, 2) NOT NULL,
    subtotal        NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * price) STORED
);

-- 7. PAYMENT TRANSACTIONS (BARU)
-- Mencatat setiap attempt pembayaran untuk sebuah order.
-- Satu order bisa punya lebih dari 1 baris di sini (misal customer retry
-- setelah gagal/expired).
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                      SERIAL PRIMARY KEY,
    order_id                INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway_name            VARCHAR(50) NOT NULL,       -- 'midtrans', 'xendit', dll
    gateway_transaction_id  VARCHAR(150),               -- id transaksi dari gateway
    payment_channel         VARCHAR(50),                -- ex: 'qris', 'bca_va', 'gopay', 'shopeepay'
    amount                  NUMERIC(12, 2) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                                'pending', 'settlement', 'success', 'failed',
                                'expired', 'cancelled', 'refunded'
                            )),
    raw_response            JSONB,                      -- simpan full response dari gateway
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYMENT WEBHOOK LOGS (BARU)
-- Audit trail untuk semua callback/webhook masuk dari gateway.
-- Berguna untuk debugging, verifikasi signature, dan replay protection.
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    gateway_name        VARCHAR(50) NOT NULL,
    event_type          VARCHAR(100),               -- ex: 'payment.success', 'invoice.paid'
    signature_valid     BOOLEAN,                    -- hasil verifikasi signature/HMAC
    payload             JSONB NOT NULL,             -- body mentah webhook
    processed           BOOLEAN NOT NULL DEFAULT FALSE,
    received_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEX
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders (payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_gateway_reference ON orders (gateway_reference_id);
CREATE INDEX IF NOT EXISTS idx_orders_queue_number ON orders (queue_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON order_items (menu_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_kategori ON menu_items (kategori_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items (is_available);

CREATE INDEX IF NOT EXISTS idx_payment_tx_order_id ON payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway_tx_id ON payment_transactions (gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions (status);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON payment_webhook_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_gateway ON payment_webhook_logs (gateway_name);

-- ============================================
-- TRIGGER untuk updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE TRIGGER update_menu_items_modtime
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE TRIGGER update_orders_modtime
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE TRIGGER update_payment_tx_modtime
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================
-- VIEW untuk laporan (opsional)
-- ============================================
-- Laporan penjualan harian (sekarang filter pakai payment_status)
CREATE OR REPLACE VIEW daily_sales AS
SELECT
    DATE(created_at) AS tanggal,
    COUNT(*) AS total_order,
    SUM(total_price) AS total_pendapatan,
    AVG(total_price) AS rata_rata_order,
    SUM(CASE WHEN payment_method = 'cash' THEN total_price ELSE 0 END) AS cash,
    SUM(CASE WHEN payment_method = 'qris' THEN total_price ELSE 0 END) AS qris,
    SUM(CASE WHEN payment_method = 'va' THEN total_price ELSE 0 END) AS va,
    SUM(CASE WHEN payment_method = 'ewallet' THEN total_price ELSE 0 END) AS ewallet
FROM orders
WHERE payment_status = 'paid'
GROUP BY DATE(created_at)
ORDER BY tanggal DESC;

-- Laporan menu terlaris (sekarang filter pakai payment_status)
CREATE OR REPLACE VIEW best_seller_menu AS
SELECT
    mi.id,
    mi.name,
    k.name AS kategori,
    COUNT(oi.id) AS total_dipesan,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.subtotal) AS total_revenue
FROM menu_items mi
JOIN order_items oi ON oi.menu_item_id = mi.id
JOIN orders o ON o.id = oi.order_id
JOIN kategori k ON k.id = mi.kategori_id
WHERE o.payment_status = 'paid'
GROUP BY mi.id, mi.name, k.name
ORDER BY total_quantity DESC;

-- Laporan transaksi payment gateway (BARU)
CREATE OR REPLACE VIEW payment_gateway_summary AS
SELECT
    pt.gateway_name,
    pt.payment_channel,
    pt.status,
    COUNT(*) AS total_transaksi,
    SUM(pt.amount) AS total_nominal
FROM payment_transactions pt
GROUP BY pt.gateway_name, pt.payment_channel, pt.status
ORDER BY pt.gateway_name, total_transaksi DESC;