# API Documentation — Berkesan

**Base URL (production):** `https://<your-domain>/api`  
**Base URL (local):** `http://localhost:3000/api`

All responses use this format:
```json
{ "success": true, "data": {} }
{ "success": false, "message": "error description" }
```

---

## Authentication

### POST `/auth/login`
Login and get a JWT token.

**Body:**
```json
{ "username": "admin", "password": "password" }
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": { "id": 1, "username": "admin", "name": "Administrator", "role": "admin" }
}
```

Include the token in subsequent requests:
```
Authorization: Bearer <token>
```

---

## Menu

### GET `/menu`
List active menu items (`is_available = true`), grouped by category.

### POST `/menu`
Add a new menu item.

**Body:**
```json
{
  "name": "Kopi Susu",
  "kategori_id": 1,
  "price": 18000,
  "is_available": true,
  "image_url": null
}
```

### PUT `/menu/:id`
Update a menu item. Same body as POST.

### DELETE `/menu/:id`
Delete a menu item. If it has existing transactions → soft delete (`is_available = false`).

---

## Order

### GET `/order`
List orders. Optional query params: `?status=pending&today=true`

### GET `/order/:id`
Get order detail by ID or order code.

### POST `/order`
Create a new order.

**Body:**
```json
{
  "table_number": "1",
  "customer_name": "Budi",
  "payment_method": "cash",
  "notes": "",
  "items": [
    { "menu_item_id": 1, "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 42,
      "order_code": "ORD-260520-143022987",
      "total_price": 36000,
      "status": "pending"
    }
  }
}
```

### PATCH `/order/:id/status`
Update order status.

**Body:**
```json
{ "status": "diproses", "paid_amount": 50000 }
```

Status flow: `pending` → `diproses` → `selesai` / `dibatalkan`

---

## Kasir

### GET `/kasir/orders`
All orders for today with their items.

### GET `/kasir/orders/lookup?code=ORD-xxx`
Find an order by order code.

### GET `/kasir/orders/:id`
Get order detail and items.

### PATCH `/kasir/orders/:id/status`
Update order status.

**Body:** `{ "status": "selesai", "paid_amount": 50000 }`

### GET `/kasir/queue`
Active queue — orders with status `diproses` for today.

### GET `/kasir/history`
Completed and cancelled orders for today.

---

## Dashboard

> `GET /dashboard/users`, `POST /dashboard/users`, `DELETE /dashboard/users/:id` require `Authorization: Bearer <token>`.

### GET `/dashboard/stats`
Today's statistics: revenue, total orders, products sold, top 5 products, 7-day sales chart.

### GET `/dashboard/rekap?month=05&year=2026`
Monthly recap: daily revenue trend, top 5 products, payment method breakdown, comparison with previous month.

### GET `/dashboard/laporan?date=2026-05-20&status=selesai&payment=cash`
Transaction report with optional filters. Returns max 100 rows.

### GET `/dashboard/antrean`
Today's `pending` and `diproses` orders + last 20 completed orders.

### GET `/dashboard/kategori`
List all categories.

### POST `/dashboard/kategori`
Add a category.

**Body:** `{ "name": "Signature" }`

### GET `/dashboard/menu`
All menu items including inactive ones.

### POST `/dashboard/menu`
Add menu item (alias for `POST /menu`).

### PUT `/dashboard/menu/:id`
Update menu item (alias for `PUT /menu/:id`).

### DELETE `/dashboard/menu/:id`
Delete/deactivate menu item.

### GET `/dashboard/meja`
List all tables.

### POST `/dashboard/meja`
Add a table.

**Body:** `{ "table_number": "5" }`

### PATCH `/dashboard/meja/:id/toggle`
Toggle table active/inactive status.

### DELETE `/dashboard/meja/:id`
Delete a table. If it has existing orders → soft delete (deactivate).

### GET `/dashboard/users` *(Auth required)*
List all users.

### POST `/dashboard/users` *(Auth required)*
Add a new user.

**Body:** `{ "username": "kasir1", "password": "pass", "name": "Kasir Satu", "role": "kasir" }`

### DELETE `/dashboard/users/:id` *(Auth required)*
Delete a user. Cannot delete your own account.
