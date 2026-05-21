const db = require("../config/database");

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

async function getOrderByIdOrCode(idOrCode) {
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

exports.getOrders = async (req, res) => {
  try {
    const { status, today } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    if (status && status !== "all") {
      where += " AND o.status = ?";
      params.push(status);
    }
    if (today === "true") {
      where += " AND DATE(o.created_at) = CURDATE()";
    }

    const [orders] = await db.query(
      `SELECT o.*, t.table_number, COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      params
    );

    res.json({
      success: true,
      message: "Semua order",
      data: { orders },
      orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      table_number,
      table_id,
      customer_name = "Customer",
      payment_method,
      notes = "",
      items = [],
    } = req.body;

    if (!["cash", "qris"].includes(payment_method)) {
      return res.status(400).json({ success: false, message: "Metode pembayaran tidak valid" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Keranjang masih kosong" });
    }

    let resolvedTableId = table_id || null;
    if (!resolvedTableId && table_number) {
      const [[table]] = await conn.query(
        "SELECT id FROM tables WHERE table_number = ? AND is_active = TRUE LIMIT 1",
        [table_number]
      );
      if (!table) {
        return res.status(400).json({ success: false, message: "Nomor meja tidak ditemukan atau nonaktif" });
      }
      resolvedTableId = table.id;
    }

    await conn.beginTransaction();

    const ids = items.map((item) => Number(item.menu_item_id || item.id)).filter(Boolean);
    const qtyById = new Map();
    items.forEach((item) => {
      const id = Number(item.menu_item_id || item.id);
      const qty = Math.max(1, Number(item.quantity || item.qty || 1));
      if (id) qtyById.set(id, (qtyById.get(id) || 0) + qty);
    });

    if (ids.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Item pesanan tidak valid" });
    }

    const placeholders = [...new Set(ids)].map(() => "?").join(",");
    const [menus] = await conn.query(
      `SELECT id, name, price, stock, is_available FROM menu_items WHERE id IN (${placeholders})`,
      [...new Set(ids)]
    );

    if (menus.length !== new Set(ids).size) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Sebagian menu tidak ditemukan" });
    }

    let total = 0;
    const orderItems = menus.map((menu) => {
      if (!menu.is_available) throw new Error(`${menu.name} sedang tidak tersedia`);
      const quantity = qtyById.get(menu.id);
      if (Number(menu.stock) < quantity) throw new Error(`Stok ${menu.name} tidak cukup`);
      const price = Number(menu.price);
      total += price * quantity;
      return { ...menu, quantity, price };
    });

    const orderCode = makeOrderCode();
    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_code, table_id, customer_name, total_price, payment_method, status, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [orderCode, resolvedTableId, customer_name, total, payment_method, notes]
    );

    const orderId = orderResult.insertId;
    for (const item of orderItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, menu_name, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.id, item.name, item.quantity, item.price]
      );
      await conn.query(
        "UPDATE menu_items SET stock = GREATEST(stock - ?, 0) WHERE id = ?",
        [item.quantity, item.id]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Order berhasil dibuat",
      data: {
        order: {
          id: orderId,
          order_code: orderCode,
          table_number,
          total_price: total,
          payment_method,
          status: "pending",
        },
        payment_code: orderCode,
      },
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const order = await getOrderByIdOrCode(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order tidak ditemukan" });

    const [items] = await db.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
    res.json({ success: true, data: { order, items }, order, items });
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

    const order = await getOrderByIdOrCode(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order tidak ditemukan" });

    const paid = Number(paid_amount) || 0;
    const change = paid > 0 ? Math.max(0, paid - Number(order.total_price)) : Number(order.change_amount || 0);

    await db.query(
      "UPDATE orders SET status = ?, paid_amount = IF(? > 0, ?, paid_amount), change_amount = IF(? > 0, ?, change_amount) WHERE id = ?",
      [status, paid, paid, paid, change, order.id]
    );

    res.json({ success: true, message: "Status order diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};