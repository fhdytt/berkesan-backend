# Backend — Berkesan

Built with **Node.js + Express**, database **PostgreSQL** via `pg` Pool.

---

## Structure

```
src/
├── server.js                   # Entry point — starts the HTTP server
├── app.js                      # Express setup: middleware, CSP, routes
├── config/
│   └── database.js             # pg Pool, connects via DATABASE_URL
├── controllers/
│   ├── authController.js       # Login, register, list/delete users
│   ├── menuController.js       # CRUD menu items
│   ├── orderController.js      # Create & update orders (public)
│   ├── kasirController.js      # Order view & processing for kasir
│   └── dashboardController.js  # Stats, recap, tables, reports
├── routes/
│   ├── authRoutes.js
│   ├── menuRoutes.js
│   ├── orderRoutes.js
│   ├── kasirRoutes.js
│   └── dashboardRoutes.js
├── middleware/
│   ├── auth.js                 # JWT verification
│   └── errorHandler.js
├── validations/                # Input validation helpers
└── utils/
    └── hash.js                 # bcrypt helper
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT (min. 32 characters) |
| `FRONTEND_URL` | Frontend URL for CORS (comma-separated for multiple) |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `production` or `development` |

---

## Running Locally

```bash
npm install
cp backend/.env.example backend/.env
# fill in DATABASE_URL, JWT_SECRET, etc.
npm run start
```

Server runs at `http://localhost:3000`.

---

## API Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login |
| GET | `/api/menu` | — | List active menu items |
| POST | `/api/menu` | — | Add menu item |
| PUT | `/api/menu/:id` | — | Update menu item |
| DELETE | `/api/menu/:id` | — | Delete/deactivate menu item |
| POST | `/api/order` | — | Create new order |
| GET | `/api/order` | — | List orders |
| PATCH | `/api/order/:id/status` | — | Update order status |
| GET | `/api/kasir/orders` | — | Today's orders (kasir view) |
| PATCH | `/api/kasir/orders/:id/status` | — | Process/complete order |
| GET | `/api/dashboard/stats` | JWT | Today's statistics |
| GET | `/api/dashboard/rekap` | JWT | Monthly recap |
| GET | `/api/dashboard/laporan` | JWT | Transaction report |

Full documentation: [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)
