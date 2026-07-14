const { pool } = require("../config/database");

// Helper response
const sendResponse = (res, success, data = null, message = null, statusCode = 200) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// Generate unique order code
function makeOrderCode() {
  const now = new Date();
  const date = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const stamp = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 900 + 100);
  return `ORD-${date}-${stamp}${rand}`;
}

// Get order by ID or code
async function getOrderByIdOrCode(idOrCode) {
  const isNumber = !isNaN(parseInt(idOrCode));
  let query, params;
  
  if (isNumber) {
    query = `
      SELECT o.*, t.table_number, u.name AS kasir_name
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = $1
      LIMIT 1
    `;
    params = [parseInt(idOrCode)];
  } else {
    query = `
      SELECT o.*, t.table_number, u.name AS kasir_name
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.order_code = $1
      LIMIT 1
    `;
    params = [idOrCode];
  }
  
  const result = await pool.query(query, params);
  return result.rows[0];
}

// Get order items
async function getOrderItems(orderId) {
  const result = await pool.query(
    `SELECT id, order_id, menu_item_id, menu_name, quantity, price, subtotal 
     FROM order_items 
     WHERE order_id = $1 
     ORDER BY id ASC`,
    [orderId]
  );
  return result.rows;
}

// Validasi payment method — sesuai CHECK constraint di schema
const validPaymentMethods = ["cash", "qris", "transfer", "debit", "credit", "va", "ewallet"];
const validStatuses = ["pending", "diproses", "selesai", "dibatalkan"];

// ============================================
// GET ORDERS (with filters)
// ============================================
exports.getOrders = async (req, res) => {
  try {
    const { status, today, limit = 100, page = 1, startDate, endDate } = req.query;
    const params = [];
    let where = "WHERE 1=1";
    let idx = 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (status && status !== "all" && validStatuses.includes(status)) {
      where += ` AND o.status = $${idx++}`;
      params.push(status);
    }
    
    if (today === "true") {
      where += ` AND o.created_at::date = CURRENT_DATE`;
    }
    
    if (startDate) {
      where += ` AND o.created_at::date >= $${idx++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      where += ` AND o.created_at::date <= $${idx++}`;
      params.push(endDate);
    }

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT o.id) as total FROM orders o ${where}`,
      params
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT o.*, t.table_number, u.name AS kasir_name, COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id, t.table_number, u.name
       ORDER BY o.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    sendResponse(res, true, {
      orders: result.rows,
      pagination: {
        currentPage: parseInt(page),
        perPage: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("GET_ORDERS ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// CREATE ORDER (with transaction)
// ============================================
exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      table_number,
      table_id,
      customer_name = "Customer",
      payment_method,
      notes = "",
      items = [],
    } = req.body;

    if (!validPaymentMethods.includes(payment_method)) {
      return sendResponse(res, false, null, "Metode pembayaran tidak valid", 400);
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return sendResponse(res, false, null, "Keranjang masih kosong", 400);
    }

    let resolvedTableId = table_id || null;
    if (!resolvedTableId && table_number) {
      const tbl = await client.query(
        "SELECT id FROM tables WHERE table_number = $1 AND is_active = TRUE LIMIT 1",
        [table_number]
      );
      if (!tbl.rows[0]) {
        return sendResponse(res, false, null, "Nomor meja tidak ditemukan atau nonaktif", 400);
      }
      resolvedTableId = tbl.rows[0].id;
    }

    await client.query("BEGIN");

    const ids = [...new Set(items.map((item) => Number(item.menu_item_id || item.id)).filter(Boolean))];
    const qtyById = new Map();
    
    items.forEach((item) => {
      const id = Number(item.menu_item_id || item.id);
      const qty = Math.max(1, Number(item.quantity || item.qty || 1));
      if (id) qtyById.set(id, (qtyById.get(id) || 0) + qty);
    });

    if (ids.length === 0) {
      await client.query("ROLLBACK");
      return sendResponse(res, false, null, "Item pesanan tidak valid", 400);
    }

    const menus = await client.query(
      `SELECT id, name, price, is_available FROM menu_items WHERE id = ANY($1)`,
      [ids]
    );

    if (menus.rows.length !== ids.length) {
      await client.query("ROLLBACK");
      return sendResponse(res, false, null, "Sebagian menu tidak ditemukan", 400);
    }

    let total = 0;
    const orderItems = [];
    
    for (const menu of menus.rows) {
      if (!menu.is_available) {
        await client.query("ROLLBACK");
        return sendResponse(res, false, null, `${menu.name} sedang tidak tersedia`, 400);
      }
      
      const quantity = qtyById.get(menu.id);
      const price = Number(menu.price);
      total += price * quantity;
      orderItems.push({ ...menu, quantity, price });
    }

    const orderCode = makeOrderCode();
    const orderResult = await client.query(
      `INSERT INTO orders (order_code, table_id, customer_name, total_price, payment_method, status, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7) 
       RETURNING id, order_code, created_at`,
      [orderCode, resolvedTableId, customer_name, total, payment_method, notes, req.user?.id || null]
    );

    const orderId = orderResult.rows[0].id;
    
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, menu_name, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.id, item.name, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");

    sendResponse(res, true, {
      order: {
        id: orderId,
        order_code: orderCode,
        table_number: table_number || null,
        customer_name,
        total_price: total,
        payment_method,
        status: "pending",
        created_at: orderResult.rows[0].created_at
      },
      payment_code: orderCode,
      items: orderItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
    }, "Order berhasil dibuat");
    
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("CREATE_ORDER ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  } finally {
    client.release();
  }
};

// ============================================
// GET ORDER DETAIL
// ============================================
exports.getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getOrderByIdOrCode(id);
    
    if (!order) {
      return sendResponse(res, false, null, "Order tidak ditemukan", 404);
    }
    
    const items = await getOrderItems(order.id);
    sendResponse(res, true, { order, items });
  } catch (err) {
    console.error("GET_ORDER_DETAIL ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// UPDATE ORDER STATUS
// ============================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_amount = 0, payment_method } = req.body;
    const userId = req.user.id;
    
    if (!validStatuses.includes(status)) {
      return sendResponse(res, false, null, "Status tidak valid", 400);
    }

    const order = await getOrderByIdOrCode(id);
    if (!order) {
      return sendResponse(res, false, null, "Order tidak ditemukan", 404);
    }
    
    const statusOrder = ["pending", "diproses", "selesai", "dibatalkan"];
    const currentIndex = statusOrder.indexOf(order.status);
    const newIndex = statusOrder.indexOf(status);
    
    if (currentIndex > newIndex && order.status !== 'pending') {
      return sendResponse(res, false, null, "Tidak bisa mengubah status ke sebelumnya", 400);
    }

    const paid = Number(paid_amount) || 0;
    const totalPrice = Number(order.total_price);
    let change = order.change_amount || 0;
    let paidAmount = order.paid_amount || 0;
    
    if (paid > 0) {
      paidAmount = paid;
      change = Math.max(0, paid - totalPrice);
    }
    
    const updates = [`status = $1`, `updated_at = NOW()`, `user_id = $2`];
    const values = [status, userId];
    let idx = 3;
    
    if (paid > 0) {
      updates.push(`paid_amount = $${idx++}`);
      values.push(paidAmount);
      updates.push(`change_amount = $${idx++}`);
      values.push(change);
    }
    
    if (payment_method && validPaymentMethods.includes(payment_method)) {
      updates.push(`payment_method = $${idx++}`);
      values.push(payment_method);
    }
    
    values.push(order.id);
    
    await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    sendResponse(res, true, { 
      status, 
      paid_amount: paidAmount,
      change_amount: change 
    }, "Status order diperbarui");
  } catch (err) {
    console.error("UPDATE_ORDER_STATUS ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET ORDERS BY TABLE
// ============================================
exports.getOrdersByTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { status } = req.query;
    
    let where = `o.table_id = $1`;
    const params = [table_id];
    let idx = 2;
    
    if (status && validStatuses.includes(status)) {
      where += ` AND o.status = $${idx++}`;
      params.push(status);
    }
    
    const result = await pool.query(
      `SELECT o.*, COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      params
    );
    
    sendResponse(res, true, { orders: result.rows });
  } catch (err) {
    console.error("GET_ORDERS_BY_TABLE ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET TODAY'S SUMMARY
// ============================================
exports.getTodaySummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total_orders,
        COALESCE(SUM(CASE WHEN status != 'dibatalkan' THEN total_price END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status != 'dibatalkan' THEN total_price END), 0) AS cash_income,
        COALESCE(SUM(CASE WHEN payment_method = 'qris' AND status != 'dibatalkan' THEN total_price END), 0) AS qris_income,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
        COALESCE(SUM(CASE WHEN status = 'diproses' THEN 1 ELSE 0 END), 0) AS processing_orders,
        COALESCE(SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END), 0) AS completed_orders
      FROM orders
      WHERE created_at::date = CURRENT_DATE
    `);
    
    sendResponse(res, true, { summary: result.rows[0] });
  } catch (err) {
    console.error("GET_TODAY_SUMMARY ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};