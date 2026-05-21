CREATE DATABASE IF NOT EXISTS berkesan;
USE berkesan;

CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(100) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(150),
    role        ENUM('admin', 'kasir', 'dev') NOT NULL DEFAULT 'kasir',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kategori (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    kategori_id     INT NOT NULL,
    name            VARCHAR(150) NOT NULL,
    price           DECIMAL(10, 2) NOT NULL,
    image_url       LONGTEXT,
    stock INT NOT NULL DEFAULT 0,
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_kategori FOREIGN KEY (kategori_id) REFERENCES kategori(id)
);

CREATE TABLE IF NOT EXISTS tables (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    table_number    VARCHAR(20) UNIQUE NOT NULL,
    qr_code         LONGTEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    order_code          VARCHAR(50) UNIQUE NOT NULL,
    user_id             INT DEFAULT NULL,
    table_id            INT DEFAULT NULL,
    customer_name       VARCHAR(150),
    total_price         DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method      ENUM('cash','qris') NOT NULL,
    paid_amount         DECIMAL(12,2) DEFAULT 0,
    change_amount       DECIMAL(12,2) DEFAULT 0,
    status              ENUM('pending', 'diproses', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'pending',
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL,
    CONSTRAINT fk_order_table
    FOREIGN KEY (table_id)
    REFERENCES tables(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL,
    menu_item_id    INT NOT NULL,
    menu_name       VARCHAR(150) NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    price           DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(12,2) GENERATED ALWAYS AS (quantity * price) STORED,
    CONSTRAINT fk_oi_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_oi_menu
    FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id)
    ON DELETE RESTRICT
);

