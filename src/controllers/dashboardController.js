const db = require("../config/database");

// Helper response
const sendResponse = (res, success, data = null, message = null, statusCode = 200) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// Validasi parameter
const validateMonthYear = (month, year) => {
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error("Month must be between 1 and 12");
  }
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    throw new Error("Invalid year");
  }
  return { month: monthNum, year: yearNum };
};

// ============================================
// REKAP PER BULAN (Admin)
// ============================================
exports.getRekap = async (req, res) => {
  try {
    let { month, year } = req.query;
    
    // Default ke bulan ini jika tidak ada
    if (!month || !year) {
      const now = new Date();
      month = month || (now.getMonth() + 1).toString();
      year = year || now.getFullYear().toString();
    }
    
    const { month: m, year: y } = validateMonthYear(month, year);
    
    const prevMonth = m == 1 ? 12 : m - 1;
    const prevYear = m == 1 ? y - 1 : y;
    
    const [summary, prevSummary, daily, bestProducts, paymentSummary] = await Promise.all([
      db.query(
        `SELECT 
           COALESCE(SUM(total_price), 0) AS "totalIncome",
           COUNT(*) AS "totalOrders",
           COALESCE((
             SELECT SUM(oi.quantity) 
             FROM order_items oi 
             JOIN orders o2 ON o2.id = oi.order_id
             WHERE EXTRACT(MONTH FROM o2.created_at) = $1 
               AND EXTRACT(YEAR FROM o2.created_at) = $2 
               AND o2.payment_status = 'paid'
           ), 0) AS "totalSold"
         FROM orders 
         WHERE EXTRACT(MONTH FROM created_at) = $1 
           AND EXTRACT(YEAR FROM created_at) = $2 
           AND payment_status = 'paid'`,
        [m, y]
      ),
      db.query(
        `SELECT 
           COALESCE(SUM(total_price), 0) AS "prevIncome",
           COUNT(*) AS "prevOrders"
         FROM orders 
         WHERE EXTRACT(MONTH FROM created_at) = $1 
           AND EXTRACT(YEAR FROM created_at) = $2 
           AND payment_status = 'paid'`,
        [prevMonth, prevYear]
      ),
      db.query(
        `SELECT 
           created_at::date AS tanggal,
           SUM(total_price) AS total
         FROM orders 
         WHERE EXTRACT(MONTH FROM created_at) = $1 
           AND EXTRACT(YEAR FROM created_at) = $2 
           AND payment_status = 'paid'
         GROUP BY created_at::date 
         ORDER BY tanggal ASC`,
        [m, y]
      ),
      db.query(
        `SELECT 
           menu_name,
           SUM(quantity) AS sold,
           SUM(subtotal) AS revenue
         FROM order_items oi 
         JOIN orders o ON o.id = oi.order_id
         WHERE EXTRACT(MONTH FROM o.created_at) = $1 
           AND EXTRACT(YEAR FROM o.created_at) = $2 
           AND o.payment_status = 'paid'
         GROUP BY menu_name 
         ORDER BY revenue DESC 
         LIMIT 5`,
        [m, y]
      ),
      db.query(
        `SELECT 
           payment_method,
           COUNT(*) AS total_orders,
           SUM(total_price) AS total_income
         FROM orders 
         WHERE EXTRACT(MONTH FROM created_at) = $1 
           AND EXTRACT(YEAR FROM created_at) = $2 
           AND payment_status = 'paid'
         GROUP BY payment_method`,
        [m, y]
      ),
    ]);

    sendResponse(res, true, {
      period: { month: m, year: y },
      summary: summary.rows[0] || { totalIncome: 0, totalOrders: 0, totalSold: 0 },
      comparison: prevSummary.rows[0] || { prevIncome: 0, prevOrders: 0 },
      daily: daily.rows,
      bestProducts: bestProducts.rows,
      paymentSummary: paymentSummary.rows,
    });
    
  } catch (err) {
    console.error("GET_REKAP ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// KATEGORI CRUD
// ============================================
exports.getKategori = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, created_at FROM kategori ORDER BY name ASC`
    );
    sendResponse(res, true, { items: result.rows });
  } catch (err) {
    console.error("GET_KATEGORI ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

exports.createKategori = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return sendResponse(res, false, null, "Nama kategori wajib diisi", 400);
    }
    
    // Cek duplikat
    const existing = await db.query(
      "SELECT id FROM kategori WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );
    if (existing.rows.length > 0) {
      return sendResponse(res, false, null, "Kategori sudah ada", 409);
    }
    
    const result = await db.query(
      `INSERT INTO kategori (name) VALUES ($1) RETURNING id, name, created_at`,
      [name.trim()]
    );
    sendResponse(res, true, { kategori: result.rows[0] }, "Kategori berhasil ditambahkan");
  } catch (err) {
    console.error("CREATE_KATEGORI ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

exports.updateKategori = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim() === "") {
      return sendResponse(res, false, null, "Nama kategori wajib diisi", 400);
    }
    
    const result = await db.query(
      `UPDATE kategori SET name = $1 WHERE id = $2 RETURNING id, name`,
      [name.trim(), id]
    );
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Kategori tidak ditemukan", 404);
    }
    
    sendResponse(res, true, { kategori: result.rows[0] }, "Kategori berhasil diupdate");
  } catch (err) {
    console.error("UPDATE_KATEGORI ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

exports.deleteKategori = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah kategori masih digunakan
    const used = await db.query(
      "SELECT id FROM menu_items WHERE kategori_id = $1 LIMIT 1",
      [id]
    );
    
    if (used.rows.length > 0) {
      return sendResponse(res, false, null, "Kategori masih digunakan oleh menu, tidak bisa dihapus", 400);
    }
    
    const result = await db.query("DELETE FROM kategori WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Kategori tidak ditemukan", 404);
    }
    
    sendResponse(res, true, null, "Kategori berhasil dihapus");
  } catch (err) {
    console.error("DELETE_KATEGORI ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// MENU (dari menuController)
// ============================================
const menuController = require("./menuController");
exports.getMenu = menuController.getMenu;
exports.createMenu = menuController.createMenu;
exports.updateMenu = menuController.updateMenu;
exports.deleteMenu = menuController.deleteMenu;

// ============================================
// MEJA CRUD
// ============================================
exports.getMeja = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, table_number, qr_code, is_active, created_at 
       FROM tables 
       ORDER BY (table_number ~ '^[0-9]+$') DESC, 
                table_number::integer NULLS LAST, 
                table_number`
    );
    sendResponse(res, true, { tables: result.rows });
  } catch (err) {
    console.error("GET_MEJA ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

exports.createMeja = async (req, res) => {
  try {
    const { table_number, qr_code = null } = req.body;
    if (!table_number || table_number.trim() === "") {
      return sendResponse(res, false, null, "Nomor meja wajib diisi", 400);
    }
    
    // Cek duplikat
    const existing = await db.query(
      "SELECT id FROM tables WHERE table_number = $1",
      [table_number.trim()]
    );
    if (existing.rows.length > 0) {
      return sendResponse(res, false, null, "Nomor meja sudah ada", 409);
    }
    
    const result = await db.query(
      `INSERT INTO tables (table_number, qr_code, is_active) 
       VALUES ($1, $2, TRUE) 
       RETURNING id, table_number`,
      [table_number.trim(), qr_code]
    );
    sendResponse(res, true, { table: result.rows[0] }, "Meja berhasil ditambahkan");
  } catch (err) {
    console.error("CREATE_MEJA ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

exports.updateMeja = async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, qr_code } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (table_number) {
      updates.push(`table_number = $${paramIndex++}`);
      values.push(table_number.trim());
    }
    if (qr_code !== undefined) {
      updates.push(`qr_code = $${paramIndex++}`);
      values.push(qr_code);
    }
    
    if (updates.length === 0) {
      return sendResponse(res, false, null, "Tidak ada data yang diupdate", 400);
    }
    
    values.push(id);
    const result = await db.query(
      `UPDATE tables SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, table_number`,
      values
    );
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Meja tidak ditemukan", 404);
    }
    
    sendResponse(res, true, { table: result.rows[0] }, "Meja berhasil diupdate");
  } catch (err) {
    console.error("UPDATE_MEJA ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

exports.toggleMeja = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE tables SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Meja tidak ditemukan", 404);
    }
    
    sendResponse(res, true, { 
      is_active: result.rows[0].is_active 
    }, `Meja ${result.rows[0].is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
  } catch (err) {
    console.error("TOGGLE_MEJA ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

exports.deleteMeja = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah meja sudah pernah dipakai order
    const usage = await db.query(
      `SELECT COUNT(*) AS total FROM orders WHERE table_id = $1`,
      [id]
    );
    
    if (Number(usage.rows[0].total) > 0) {
      // Soft delete: hanya nonaktifkan
      await db.query(`UPDATE tables SET is_active = FALSE WHERE id = $1`, [id]);
      return sendResponse(res, true, { softDeleted: true }, 
        "Meja sudah pernah dipakai order, dinonaktifkan agar riwayat tetap aman");
    }
    
    const result = await db.query(`DELETE FROM tables WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Meja tidak ditemukan", 404);
    }
    
    sendResponse(res, true, null, "Meja berhasil dihapus");
  } catch (err) {
    console.error("DELETE_MEJA ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// LAPORAN
// ============================================
exports.getLaporan = async (req, res) => {
  try {
    const { date, status, payment, startDate, endDate, limit = 100 } = req.query;
    let sql = `SELECT * FROM orders WHERE 1=1`;
    const params = [];
    let idx = 1;
    
    if (date) {
      sql += ` AND created_at::date = $${idx++}`;
      params.push(date);
    }
    
    if (startDate && endDate) {
      sql += ` AND created_at::date BETWEEN $${idx++} AND $${idx++}`;
      params.push(startDate, endDate);
    }
    
    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }
    
    if (payment) {
      sql += ` AND payment_method = $${idx++}`;
      params.push(payment);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT $${idx++}`;
    params.push(parseInt(limit));
    
    const result = await db.query(sql, params);
    
    // Hitung total
    let totalIncome = 0;
    result.rows.forEach(order => {
      if (order.status !== 'dibatalkan') {
        totalIncome += parseFloat(order.total_price);
      }
    });
    
    sendResponse(res, true, {
      total_income: totalIncome,
      total_orders: result.rows.length,
      orders: result.rows
    });
  } catch (err) {
    console.error("GET_LAPORAN ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// ANTREAN (Order pending & diproses)
// ============================================
exports.getAntrean = async (req, res) => {
  try {
    const [orders, selesai] = await Promise.all([
      db.query(
        `SELECT o.*, u.name as kasir_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         WHERE o.created_at::date = CURRENT_DATE 
           AND o.status IN ('pending', 'diproses')
         ORDER BY o.created_at ASC`
      ),
      db.query(
        `SELECT o.*, u.name as kasir_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         WHERE o.created_at::date = CURRENT_DATE 
           AND o.status = 'selesai'
         ORDER BY o.updated_at DESC 
         LIMIT 20`
      ),
    ]);
    
    sendResponse(res, true, {
      antrean: orders.rows,
      selesai: selesai.rows,
      total_antrean: orders.rows.length
    });
  } catch (err) {
    console.error("GET_ANTREAN ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// DASHBOARD STATISTICS (Harian)
// ============================================
exports.getDashboardStats = async (req, res) => {
  try {
    const [summary, bestProducts, unavailableMenus, recentOrders, salesChart] = await Promise.all([
      db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE AND payment_status = 'paid' THEN total_price END), 0) AS "incomeToday",
          COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) AS "ordersToday",
          COALESCE((
            SELECT SUM(oi.quantity) 
            FROM order_items oi 
            JOIN orders o2 ON o2.id = oi.order_id
            WHERE o2.created_at::date = CURRENT_DATE 
              AND o2.payment_status = 'paid'
          ), 0) AS "productsSold"
        FROM orders
      `),
      db.query(`
        SELECT 
          menu_name,
          SUM(quantity) AS sold,
          SUM(subtotal) AS revenue
        FROM order_items
        GROUP BY menu_name
        ORDER BY sold DESC
        LIMIT 5
      `),
      // Menu yang tidak tersedia
      db.query(`
        SELECT id, name, is_available, kategori_id
        FROM menu_items 
        WHERE is_available = FALSE
        ORDER BY name ASC
        LIMIT 5
      `),
      db.query(`
        SELECT 
          order_code, 
          customer_name, 
          total_price, 
          payment_method, 
          status, 
          created_at
        FROM orders 
        ORDER BY created_at DESC 
        LIMIT 5
      `),
      db.query(`
        SELECT 
          created_at::date AS tanggal,
          SUM(total_price) AS total
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' 
          AND payment_status = 'paid'
        GROUP BY created_at::date 
        ORDER BY tanggal ASC
      `),
    ]);

    sendResponse(res, true, {
      today: summary.rows[0] || { incomeToday: 0, ordersToday: 0, productsSold: 0 },
      bestProducts: bestProducts.rows,
      unavailableMenus: unavailableMenus.rows,
      recentOrders: recentOrders.rows,
      salesChart: salesChart.rows,
    });
  } catch (err) {
    console.error("GET_DASHBOARD_STATS ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET ALL USERS (for admin)
// ============================================
exports.getUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, name, role, created_at, last_login 
       FROM users 
       ORDER BY created_at DESC`
    );
    sendResponse(res, true, { users: result.rows });
  } catch (err) {
    console.error("GET_USERS ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// CREATE USER (kasir)
// ============================================
exports.createUser = async (req, res) => {
  try {
    const { name, username, password, role = 'kasir' } = req.body;
    
    if (!username || !password) {
      return sendResponse(res, false, null, "Username dan password wajib diisi", 400);
    }
    
    // Cek duplikat
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existing.rows.length > 0) {
      return sendResponse(res, false, null, "Username sudah digunakan", 409);
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, name, role`,
      [username, hashedPassword, name || username, role]
    );
    
    sendResponse(res, true, { user: result.rows[0] }, "User berhasil ditambahkan");
  } catch (err) {
    console.error("CREATE_USER ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// DELETE USER
// ============================================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    
    if (parseInt(id) === currentUserId) {
      return sendResponse(res, false, null, "Tidak bisa menghapus akun sendiri", 400);
    }
    
    const result = await db.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "User tidak ditemukan", 404);
    }
    
    sendResponse(res, true, null, "User berhasil dihapus");
  } catch (err) {
    console.error("DELETE_USER ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};