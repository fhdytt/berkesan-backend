const db = require("../config/database");

async function findOrder(idOrCode) {
  const [[order]] = await db.query(
    `SELECT o.*, t.table_number
     FROM orders o
     LEFT JOIN tables t ON t.id = o.table_id
     WHERE o.id = ? OR o.order_code = ?
     LIMIT 1`,
    [idOrCode, idOrCode]
  );
  return order;
}

async function getItems(orderId) {
  const [items] = await db.query(
    "SELECT id, order_id, menu_item_id, menu_name, quantity, price, subtotal FROM order_items WHERE order_id = ? ORDER BY id ASC",
    [orderId]
  );
  return items;
}

exports.getOrders = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      WHERE DATE(o.created_at) = CURDATE()
      ORDER BY o.created_at DESC
    `);

    if (!orders.length) return res.json({ success: true, data: { orders: [] } });

    const ids = orders.map((order) => order.id);
    const [items] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY id ASC`,
      ids
    );
    const grouped = items.reduce((acc, item) => {
      acc[item.order_id] = acc[item.order_id] || [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        orders: orders.map((order) => ({ ...order, items: grouped[order.id] || [] })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const order = await findOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order tidak ditemukan" });
    const items = await getItems(order.id);
    res.json({ success: true, data: { order, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.lookupOrder = async (req, res) => {
  try {
    const code = req.query.code || req.query.order_code;
    if (!code) return res.status(400).json({ success: false, message: "Kode order wajib diisi" });
    const order = await findOrder(code);
    if (!order) return res.status(404).json({ success: false, message: "Order tidak ditemukan" });
    const items = await getItems(order.id);
    res.json({ success: true, data: { order, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paid_amount = 0 } = req.body;
    if (!["pending", "diproses", "selesai", "dibatalkan"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid" });
    }

    const order = await findOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order tidak ditemukan" });

    const paid = Number(paid_amount) || 0;
    const change = paid > 0 ? Math.max(0, paid - Number(order.total_price)) : Number(order.change_amount || 0);

    await db.query(
      `UPDATE orders
       SET status = ?,
           paid_amount = IF(? > 0, ?, paid_amount),
           change_amount = IF(? > 0, ?, change_amount)
       WHERE id = ?`,
      [status, paid, paid, paid, change, order.id]
    );

    res.json({ success: true, message: "Status order diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getQueue = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      WHERE DATE(o.created_at) = CURDATE()
        AND o.status IN ('diproses')
      ORDER BY o.updated_at ASC
    `);
    res.json({ success: true, data: { orders } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, t.table_number, COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE DATE(o.created_at) = CURDATE()
        AND o.status IN ('selesai','dibatalkan')
      GROUP BY o.id
      ORDER BY o.updated_at DESC
    `);
    res.json({ success: true, data: { orders } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};