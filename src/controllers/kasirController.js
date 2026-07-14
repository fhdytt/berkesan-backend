const { pool, query } = require("../config/database");

// Helper response
const sendResponse = (res, success, data = null, message = null, statusCode = 200) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// Helper: find order by ID or order_code
async function findOrder(idOrCode) {
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

// Helper: get order items
async function getItems(orderId) {
  const result = await pool.query(
    `SELECT id, order_id, menu_item_id, menu_name, quantity, price, subtotal 
     FROM order_items 
     WHERE order_id = $1 
     ORDER BY id ASC`,
    [orderId]
  );
  return result.rows;
}

// Helper: generate order code
function generateOrderCode() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${year}${month}${date}-${hours}${minutes}${seconds}-${random}`;
}

// Helper: validate status
const validStatuses = ["pending", "diproses", "selesai", "dibatalkan"];
const isValidStatus = (status) => validStatuses.includes(status);

// ============================================
// GET ORDERS TODAY
// ============================================
exports.getOrders = async (req, res) => {
  try {
    const orders = await pool.query(`
      SELECT o.*, t.table_number, u.name AS kasir_name
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.created_at::date = CURRENT_DATE
      ORDER BY o.created_at DESC
    `);

    if (!orders.rows.length) {
      return sendResponse(res, true, { orders: [] });
    }

    const ids = orders.rows.map(o => o.id);
    const items = await pool.query(
      `SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id ASC`,
      [ids]
    );
    
    const grouped = items.rows.reduce((acc, item) => {
      acc[item.order_id] = acc[item.order_id] || [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    const ordersWithItems = orders.rows.map(order => ({
      ...order,
      items: grouped[order.id] || []
    }));

    sendResponse(res, true, { 
      orders: ordersWithItems,
      total: ordersWithItems.length
    });
  } catch (err) {
    console.error("GET_ORDERS ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET ORDER DETAIL
// ============================================
exports.getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await findOrder(id);
    
    if (!order) {
      return sendResponse(res, false, null, "Order tidak ditemukan", 404);
    }
    
    const items = await getItems(order.id);
    sendResponse(res, true, { order, items });
  } catch (err) {
    console.error("GET_ORDER_DETAIL ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// LOOKUP ORDER BY CODE
// ============================================
exports.lookupOrder = async (req, res) => {
  try {
    const code = req.query.code || req.query.order_code;
    if (!code) {
      return sendResponse(res, false, null, "Kode order wajib diisi", 400);
    }
    
    const order = await findOrder(code);
    if (!order) {
      return sendResponse(res, false, null, "Order tidak ditemukan", 404);
    }
    
    const items = await getItems(order.id);
    sendResponse(res, true, { order, items });
  } catch (err) {
    console.error("LOOKUP_ORDER ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// UPDATE ORDER STATUS
// ============================================
// ============================================
// UPDATE ORDER STATUS
// ============================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_amount = 0, payment_method } = req.body;
    const userId = req.user.id;
    
    if (!isValidStatus(status)) {
      return sendResponse(res, false, null, "Status tidak valid", 400);
    }

    const order = await findOrder(id);
    if (!order) {
      return sendResponse(res, false, null, "Order tidak ditemukan", 404);
    }
    
    // Cek status tidak bisa mundur
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
    
    // PERBAIKAN: Deklarasikan updates sebagai array
    const updates = [];
    const values = [];
    let idx = 1;
    
    updates.push(`status = $${idx++}`);
    values.push(status);
    
    updates.push(`updated_at = NOW()`);
    updates.push(`user_id = $${idx++}`);
    values.push(userId);
    
    if (paid > 0) {
      updates.push(`paid_amount = $${idx++}`);
      values.push(paidAmount);
      updates.push(`change_amount = $${idx++}`);
      values.push(change);
    }
    
    if (payment_method) {
      updates.push(`payment_method = $${idx++}`);
      values.push(payment_method);
    }
    
    values.push(order.id);
    
    const queryText = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${idx}`;
    await pool.query(queryText, values);

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
// GET QUEUE (Orders in process)
// ============================================
exports.getQueue = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, t.table_number, u.name AS kasir_name
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.status = 'diproses'
        AND o.created_at::date = CURRENT_DATE
      ORDER BY o.queue_number ASC
    `);
    sendResponse(res, true, { orders: result.rows });
  } catch (err) {
    console.error("GET_QUEUE ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET HISTORY (Completed & Cancelled orders)
// ============================================
exports.getHistory = async (req, res) => {
  try {
    const { limit = 50, page = 1, date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let dateFilter = "";
    let params = [];
    let paramIndex = 1;
    
    if (date) {
      dateFilter = ` AND o.created_at::date = $${paramIndex++}`;
      params.push(date);
    } else {
      dateFilter = ` AND o.created_at::date = CURRENT_DATE`;
    }
    
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(`
      SELECT o.*, t.table_number, u.name AS kasir_name, COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('selesai', 'dibatalkan')
        ${dateFilter}
      GROUP BY o.id, t.table_number, u.name
      ORDER BY o.updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, params);
    
    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      WHERE o.status IN ('selesai', 'dibatalkan')
        ${dateFilter}
    `, params.slice(0, -2));
    
    sendResponse(res, true, {
      history: result.rows,
      pagination: {
        currentPage: parseInt(page),
        perPage: parseInt(limit),
        total: parseInt(countResult.rows[0]?.total || 0),
        totalPages: Math.ceil((countResult.rows[0]?.total || 0) / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("GET_HISTORY ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET PENDING ORDERS (For kitchen display)
// ============================================
exports.getPendingOrders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.order_code, o.customer_name, t.table_number, 
             o.created_at, o.notes,
             json_agg(json_build_object(
               'menu_name', oi.menu_name,
               'quantity', oi.quantity,
               'notes', oi.notes
             )) as items
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status = 'pending'
        AND o.created_at::date = CURRENT_DATE
      GROUP BY o.id, t.table_number
      ORDER BY o.created_at ASC
    `);
    sendResponse(res, true, { pending: result.rows });
  } catch (err) {
    console.error("GET_PENDING_ORDERS ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// CANCEL ORDER
// ============================================
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;
    
    const order = await findOrder(id);
    if (!order) {
      return sendResponse(res, false, null, "Order tidak ditemukan", 404);
    }
    
    if (order.status === 'selesai') {
      return sendResponse(res, false, null, "Order yang sudah selesai tidak bisa dibatalkan", 400);
    }
    
    if (order.status === 'dibatalkan') {
      return sendResponse(res, false, null, "Order sudah dibatalkan sebelumnya", 400);
    }

    await pool.query(
      `UPDATE orders 
       SET status = 'dibatalkan', 
           notes = COALESCE(notes, '') || $1,
           updated_at = NOW(),
           user_id = $2
       WHERE id = $3`,
      [reason ? `\nDibatalkan oleh kasir. Alasan: ${reason}` : '\nDibatalkan oleh kasir', userId, order.id]
    );
    
    sendResponse(res, true, null, "Order berhasil dibatalkan");
  } catch (err) {
    console.error("CANCEL_ORDER ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// PROCESS PAYMENT
// ============================================
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, payment_method } = req.body;
    const userId = req.user.id;
    
    console.log("🔍 processPayment - orderId:", id);
    console.log("🔍 paid_amount:", paid_amount);
    console.log("🔍 payment_method:", payment_method);
    
    // Validasi
    if (!paid_amount || paid_amount <= 0) {
      return sendResponse(res, false, null, "Jumlah pembayaran wajib diisi", 400);
    }
    
    const order = await findOrder(id);
    if (!order) {
      return sendResponse(res, false, null, "Order tidak ditemukan", 404);
    }
    
    console.log("🔍 Order found:", order.id, order.status, order.total_price);
    
    if (order.status !== 'pending') {
      return sendResponse(res, false, null, "Order sudah diproses", 400);
    }
    
    const totalPrice = Number(order.total_price);
    const paid = Number(paid_amount);
    
    if (paid < totalPrice) {
      return sendResponse(res, false, null, "Pembayaran kurang", 400);
    }
    
    const change = paid - totalPrice;
    
    // Hitung nomor antrian
    const lastQueue = await pool.query(`
    SELECT queue_number FROM orders 
    WHERE status = 'diproses'
      AND created_at::date = CURRENT_DATE 
      AND queue_number IS NOT NULL
    ORDER BY CAST(SUBSTRING(queue_number FROM 2) AS INTEGER) DESC 
    LIMIT 1
  `);

  console.log("🔍 Last queue:", lastQueue.rows);

  let nextNumber = 1;
  if (lastQueue.rows.length > 0 && lastQueue.rows[0].queue_number) {
    const lastNum = parseInt(lastQueue.rows[0].queue_number.substring(1));
    nextNumber = lastNum + 1;
  } else {
    // Jika tidak ada antrian, mulai dari 1
    nextNumber = 1;
  }

  const queueNumber = 'A' + String(nextNumber).padStart(2, '0');

  console.log("🔍 Generated queue number:", queueNumber);
    
    // Update order — set status diproses, payment_status paid, dan queue_number
    const updateResult = await pool.query(
      `UPDATE orders 
       SET status = 'diproses',
           payment_status = 'paid',
           paid_amount = $1,
           change_amount = $2,
           payment_method = $3,
           user_id = $4,
           queue_number = $5,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, queue_number`,
      [paid, change, payment_method, userId, queueNumber, order.id]
    );
    
    console.log("🔍 Update result:", updateResult.rows);
    
    sendResponse(res, true, {
      order_id: order.id,
      order_code: order.order_code,
      queue_number: queueNumber,
      change_amount: change
    }, "Pembayaran berhasil");
    
  } catch (err) {
    console.error("PROCESS_PAYMENT ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};