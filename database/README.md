# Database — Berkesan

PostgreSQL database for Berkesan Coffee POS system.

| File | Description |
|------|-------------|
| `schema.postgres.sql` | Main DDL — run this to initialize the database |
| `dummy_data.sql` | Sample data for development & testing |

---

## Initialization

```bash
psql -U postgres -c "CREATE DATABASE berkesan;"
psql -U postgres -d berkesan -f backend/database/schema.postgres.sql
psql -U postgres -d berkesan -f backend/database/dummy_data.sql
```

---

## Tables

### `users`
System users (admin and kasir).

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| username | VARCHAR(100) | Unique |
| password | VARCHAR(255) | bcrypt hash |
| name | VARCHAR(150) | Full name |
| role | VARCHAR(10) | `admin`, `kasir`, `dev` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `kategori`
Menu categories (e.g. Coffee, Non Coffee, Signature).

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | VARCHAR(100) | Unique |
| created_at | TIMESTAMPTZ | |

### `menu_items`
Menu items available for order.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| kategori_id | INTEGER FK | → `kategori.id` |
| name | VARCHAR(150) | |
| price | NUMERIC(10,2) | |
| image_url | TEXT | |
| is_available | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `tables`
Physical tables in the coffee shop.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| table_number | VARCHAR(20) | Unique |
| qr_code | TEXT | QR code data URL |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `orders`
Customer order transactions.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| order_code | VARCHAR(50) | Unique, format `ORD-YYMMDD-HHMMSSxxx` |
| user_id | INTEGER FK | → `users.id` (nullable) |
| table_id | INTEGER FK | → `tables.id` (nullable) |
| customer_name | VARCHAR(150) | |
| total_price | NUMERIC(12,2) | |
| payment_method | VARCHAR(10) | `cash` or `qris` |
| paid_amount | NUMERIC(12,2) | |
| change_amount | NUMERIC(12,2) | |
| status | VARCHAR(20) | `pending`, `diproses`, `selesai`, `dibatalkan` |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `order_items`
Line items for each order.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| order_id | INTEGER FK | → `orders.id` (CASCADE delete) |
| menu_item_id | INTEGER FK | → `menu_items.id` (RESTRICT delete) |
| menu_name | VARCHAR(150) | Snapshot of name at time of order |
| quantity | INTEGER | |
| price | NUMERIC(10,2) | Snapshot of price at time of order |
| subtotal | NUMERIC(12,2) | Generated: `quantity × price` |

---

## Relations

```
kategori 1──* menu_items 1──* order_items
                                   │
users 1──* orders *────────────────┘
tables 1──* orders
```

---

## Notes

- `menu_name` and `price` in `order_items` are stored as **snapshots** — historical transaction data remains accurate even if menu prices change later.
- Menu items cannot be deleted if they have been part of a transaction (RESTRICT). Use soft delete instead (`is_available = false`).
- `order_items` are automatically deleted when their parent order is deleted (CASCADE).
