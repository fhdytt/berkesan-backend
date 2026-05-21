# Berkesan Backend — Ngrok

Backend berjalan di lokal, diekspos ke internet via Ngrok.  
MySQL juga berjalan lokal — tidak perlu database cloud.

---

## Prasyarat

- Node.js v18+
- MySQL berjalan di lokal
- Akun Ngrok gratis → [ngrok.com](https://ngrok.com)

---

## 1. Setup Backend

```bash
npm install
cp .env.example .env
```

Edit `.env` sesuai konfigurasi MySQL lokal kamu, lalu import database:

```bash
mysql -u root -p < database/schema.sql
```

Jalankan server:

```bash
npm start
```

Pastikan berjalan di `http://localhost:3000`.

---

## 2. Install & Setup Ngrok

**Linux:**
```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update && sudo apt install ngrok
```

**Mac:**
```bash
brew install ngrok
```

**Windows:** Download installer dari [ngrok.com/download](https://ngrok.com/download)

---

## 3. Hubungkan Akun Ngrok

Daftar di [ngrok.com](https://ngrok.com), lalu salin authtoken dari dashboard.

```bash
ngrok config add-authtoken <TOKEN_KAMU>
```

---

## 4. Dapatkan Static Domain (URL Tetap)

Di dashboard Ngrok → **Cloud Edge** → **Domains** → **New Domain**.  
Ngrok akan generate 1 domain gratis seperti `impish-harpist-parcel.ngrok-free.dev`.

---

## 5. Jalankan Ngrok

```bash
# Pastikan backend sudah jalan (npm start), lalu:
ngrok http --domain=impish-harpist-parcel.ngrok-free.dev 3000
```

Ganti `impish-harpist-parcel.ngrok-free.dev` dengan domain yang kamu dapat di langkah 4.

---

## 6. Update Frontend

Edit `berkesan-frontend/public/js/api.config.js`:

```js
const BACKEND_URL = "https://impish-harpist-parcel.ngrok-free.dev";
```

Lalu redeploy frontend ke Vercel.

---

## Setiap Kali Mau Demo

Cukup jalankan dua perintah ini:

```bash
# Terminal 1
npm start

# Terminal 2
ngrok http --domain=impish-harpist-parcel.ngrok-free.dev 3000
```

Laptop harus tetap menyala dan terhubung internet selama demo berlangsung.
