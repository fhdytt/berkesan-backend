const db = require('../config/database');

async function ensureDefaultKategori() {
  const [items] = await db.query(`SELECT * FROM kategori ORDER BY name ASC`);
  if (items.length) return items;

  const defaults = ['Coffee', 'Non Coffee', 'Signature'];
  for (const name of defaults) {
    await db.query(`INSERT INTO kategori (name) VALUES (?)`, [name]);
  }
  const [created] = await db.query(`SELECT * FROM kategori ORDER BY name ASC`);
  return created;
}

// GET /api/dashboard/rekap?month=05&year=2026
exports.getRekap = async (req, res) => {
  const { month, year } = req.query;
  const [daily] = await db.query(`SELECT DATE(created_at) AS tanggal, SUM(total_price) AS total FROM orders WHERE MONTH(created_at)=? AND YEAR(created_at)=? AND status!='dibatalkan' GROUP BY DATE(created_at) ORDER BY tanggal ASC`, [month, year]);
  const [bestProducts] = await db.query(`SELECT menu_name, SUM(quantity) AS sold, SUM(subtotal) AS revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE MONTH(o.created_at)=? AND YEAR(o.created_at)=? AND o.status!='dibatalkan' GROUP BY menu_name ORDER BY revenue DESC LIMIT 5`, [month, year]);
  const [paymentSummary] = await db.query(`SELECT payment_method, COUNT(*) AS total_orders, SUM(total_price) AS total_income FROM orders WHERE MONTH(created_at)=? AND YEAR(created_at)=? AND status!='dibatalkan' GROUP BY payment_method`, [month, year]);
  const [[{ totalIncome }]] = await db.query(`SELECT IFNULL(SUM(total_price),0) AS totalIncome FROM orders WHERE MONTH(created_at)=? AND YEAR(created_at)=? AND status!='dibatalkan'`, [month, year]);
  const [[{ totalOrders }]] = await db.query(`SELECT COUNT(*) AS totalOrders FROM orders WHERE MONTH(created_at)=? AND YEAR(created_at)=?`, [month, year]);
  const [[{ totalSold }]] = await db.query(`SELECT IFNULL(SUM(quantity),0) AS totalSold FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE MONTH(o.created_at)=? AND YEAR(o.created_at)=? AND o.status!='dibatalkan'`, [month, year]);
  // prev month
  const prevMonth = month == 1 ? 12 : month - 1;
  const prevYear  = month == 1 ? year - 1 : year;
  const [[{ prevIncome }]] = await db.query(`SELECT IFNULL(SUM(total_price),0) AS prevIncome FROM orders WHERE MONTH(created_at)=? AND YEAR(created_at)=? AND status!='dibatalkan'`, [prevMonth, prevYear]);
  const [[{ prevOrders }]] = await db.query(`SELECT COUNT(*) AS prevOrders FROM orders WHERE MONTH(created_at)=? AND YEAR(created_at)=?`, [prevMonth, prevYear]);
  res.json({ success:true, data:{ daily, bestProducts, paymentSummary, totalIncome, totalOrders, totalSold, prevIncome, prevOrders } });
};

// GET /api/dashboard/stok
exports.getStok = async (req, res) => {
  const [items] = await db.query(`SELECT m.*, k.name AS kategori_name FROM menu_items m JOIN kategori k ON k.id=m.kategori_id ORDER BY m.stock ASC`);
  res.json({ success:true, data:{ items } });
};

exports.getKategori = async (req, res) => {
  const [items] = await db.query(`SELECT * FROM kategori ORDER BY name ASC`);
  res.json({ success: true, data: { items } });
};

exports.createKategori = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi' });
  const [result] = await db.query(`INSERT INTO kategori (name) VALUES (?)`, [name]);
  res.json({ success: true, data: { id: result.insertId } });
};

exports.getMenu = async (req, res) => {
  const [items] = await db.query(`
    SELECT m.*, k.name AS kategori_name
    FROM menu_items m
    LEFT JOIN kategori k ON k.id = m.kategori_id
    ORDER BY m.created_at DESC
  `);
  res.json({ success: true, data: { items } });
};

exports.createMenu = async (req, res) => {
   try {
    const { name, kategori_id, price, stock = 0, is_available = true, image_url = null } = req.body;
    if (!name || !kategori_id || price === undefined) {
      return res.status(400).json({ success: false, message: 'Nama, kategori, dan harga wajib diisi' });
    }
    const [result] = await db.query(
      `INSERT INTO menu_items (kategori_id, name, price, stock, is_available, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [kategori_id, name, price, stock, !!is_available, image_url || null]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({
        success: false,
        message: 'Kolom gambar terlalu pendek. Jalankan migration agar image_url menjadi LONGTEXT.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMenu = async (req, res) => {
   try {
    const { id } = req.params;
    const { name, kategori_id, price, stock = 0, is_available = true, image_url = null } = req.body;
    if (!name || !kategori_id || price === undefined) {
      return res.status(400).json({ success: false, message: 'Nama, kategori, dan harga wajib diisi' });
    }
    await db.query(
      `UPDATE menu_items
       SET kategori_id = ?, name = ?, price = ?, stock = ?, is_available = ?, image_url = ?
       WHERE id = ?`,
      [kategori_id, name, price, stock, !!is_available, image_url || null, id]
    );
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({
        success: false,
        message: 'Kolom gambar terlalu pendek. Jalankan migration agar image_url menjadi LONGTEXT.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const [[usage]] = await db.query(
      `SELECT COUNT(*) AS total FROM order_items WHERE menu_item_id = ?`,
      [req.params.id]
    );

    if (Number(usage.total) > 0) {
      await db.query(
        `UPDATE menu_items SET is_available = FALSE, stock = 0 WHERE id = ?`,
        [req.params.id]
      );
      return res.json({
        success: true,
        data: { softDeleted: true },
        message: 'Menu sudah pernah masuk transaksi, jadi dinonaktifkan agar riwayat tetap aman.',
      });
    }

    await db.query(`DELETE FROM menu_items WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Menu berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMeja = async (req, res) => {
  const [tables] = await db.query(`SELECT * FROM tables ORDER BY CAST(table_number AS UNSIGNED), table_number`);
  res.json({ success: true, data: { tables } });
};

exports.createMeja = async (req, res) => {
  const { table_number, qr_code = null } = req.body;
  if (!table_number) return res.status(400).json({ success: false, message: 'Nomor meja wajib diisi' });
  const [result] = await db.query(
    `INSERT INTO tables (table_number, qr_code, is_active) VALUES (?, ?, TRUE)`,
    [table_number, qr_code]
  );
  res.json({ success: true, data: { id: result.insertId } });
};

exports.toggleMeja = async (req, res) => {
  await db.query(`UPDATE tables SET is_active = NOT is_active WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
};

exports.deleteMeja = async (req, res) => {
  try {
    const [[usage]] = await db.query(
      `SELECT COUNT(*) AS total FROM orders WHERE table_id = ?`,
      [req.params.id]
    );

    if (Number(usage.total) > 0) {
      await db.query(`UPDATE tables SET is_active = FALSE WHERE id = ?`, [req.params.id]);
      return res.json({
        success: true,
        data: { softDeleted: true },
        message: 'Meja sudah pernah dipakai order, jadi dinonaktifkan agar riwayat tetap aman.',
      });
    }

    await db.query(`DELETE FROM tables WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Meja berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/laporan?date=&status=&payment=
exports.getLaporan = async (req, res) => {
  const { date, status, payment } = req.query;
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params = [];
  if (date)    { sql += ` AND DATE(created_at)=?`; params.push(date); }
  if (status)  { sql += ` AND status=?`;           params.push(status); }
  if (payment) { sql += ` AND payment_method=?`;   params.push(payment); }
  sql += ` ORDER BY created_at DESC LIMIT 100`;
  const [orders] = await db.query(sql, params);
  res.json({ success:true, data:{ orders } });
};

// GET /api/dashboard/antrean
exports.getAntrean = async (req, res) => {
  const [orders] = await db.query(`SELECT * FROM orders WHERE DATE(created_at)=CURDATE() AND status IN ('pending','diproses') ORDER BY created_at ASC`);
  const [selesai] = await db.query(`SELECT * FROM orders WHERE DATE(created_at)=CURDATE() AND status='selesai' ORDER BY updated_at DESC LIMIT 20`);
  res.json({ success:true, data:{ orders, selesai } });
};

exports.getDashboardStats = async (req, res) => {
  try {

    // Pendapatan hari ini
    const [incomeToday] = await db.query(`
      SELECT IFNULL(SUM(total_price),0) AS total
      FROM orders
      WHERE DATE(created_at) = CURDATE()
      AND status != 'dibatalkan'
    `);

    // Total order hari ini
    const [ordersToday] = await db.query(`
      SELECT COUNT(*) AS total
      FROM orders
      WHERE DATE(created_at) = CURDATE()
    `);

    // Produk terjual hari ini
    const [productsSold] = await db.query(`
      SELECT IFNULL(SUM(quantity),0) AS total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE DATE(o.created_at) = CURDATE()
      AND o.status != 'dibatalkan'
    `);

    // Produk terlaris
    const [bestProducts] = await db.query(`
      SELECT
        menu_name,
        SUM(quantity) AS sold,
        SUM(subtotal) AS revenue
      FROM order_items
      GROUP BY menu_name
      ORDER BY sold DESC
      LIMIT 5
    `);

    // Stok menipis
    const [lowStock] = await db.query(`
      SELECT
        name,
        stock
      FROM menu_items
      WHERE stock <= 10
      ORDER BY stock ASC
      LIMIT 5
    `);

    // Recent Orders
    const [recentOrders] = await db.query(`
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
    `);

    // Chart Penjualan 7 Hari
    const [salesChart] = await db.query(`
      SELECT
        DATE(created_at) AS tanggal,
        SUM(total_price) AS total
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      AND status != 'dibatalkan'
      GROUP BY DATE(created_at)
      ORDER BY tanggal ASC
    `);

    res.json({
      success: true,
      data: {
        incomeToday: incomeToday[0].total,
        ordersToday: ordersToday[0].total,
        productsSold: productsSold[0].total,
        bestProducts,
        lowStock,
        recentOrders,
        salesChart
      }
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};