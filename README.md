# Berkesan Coffee — Backend API

REST API untuk sistem POS & ordering Berkesan Coffee Shop.

**Stack:** Express.js · PostgreSQL · JWT · bcryptjs

---

## Deploy ke Railway

1. Push repo ini ke GitHub
2. Buka [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Pilih repo ini — Railway otomatis membaca `railway.json` dan menjalankan `node src/server.js`
4. Tambahkan **database**: klik **+ New** → **Database** → **PostgreSQL**
5. Setelah database aktif, Railway otomatis mengisi `DATABASE_URL` di environment variables
6. Tambahkan environment variables berikut di tab **Variables**:

| Variable | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | string acak panjang (min 32 karakter) |
| `JWT_EXPIRES_IN` | `7d` |
| `BCRYPT_ROUNDS` | `10` |
| `FRONTEND_URL` | URL Vercel kamu (isi setelah deploy frontend) |
| `DATABASE_URL` | otomatis dari plugin PostgreSQL Railway |

7. Jalankan schema database via Railway Shell:
   ```bash
   psql $DATABASE_URL -f database/schema.postgres.sql
   psql $DATABASE_URL -f database/dummy_data.sql
   ```
8. Catat URL backend Railway (contoh: `https://berkesan-production.up.railway.app`)

---

## Development Lokal

### 1. Jalankan database

```bash
docker compose up -d
```

### 2. Setup environment

```bash
cp .env.example .env
# Edit .env sesuai kebutuhan (DATABASE_URL sudah sesuai docker-compose)
```

### 3. Install & jalankan

```bash
npm install
npm run dev
```

Server berjalan di `http://localhost:3000`.

---

## Struktur Folder

```
berkesan_railway/
├── src/
│   ├── server.js          # Entry point
│   ├── app.js             # Express config
│   ├── config/
│   │   └── database.js    # PostgreSQL pool
│   ├── controllers/       # Request handlers
│   ├── routes/            # Route definitions
│   ├── middleware/        # Auth, error handler
│   ├── utils/             # JWT, hash helpers
│   └── validations/       # Input validation
├── database/
│   ├── schema.postgres.sql
│   └── dummy_data.sql
├── .env.example
├── docker-compose.yml
├── railway.json
└── Procfile
```

---

## Environment Variables

Lihat `.env.example` untuk daftar lengkap semua variable yang dibutuhkan.

---

## Demo Accounts (setelah load dummy_data.sql)

| Role  | Username | Password |
|-------|----------|----------|
| Admin | Admin    | admin    |
| Kasir | Kasir    | kasir    |
