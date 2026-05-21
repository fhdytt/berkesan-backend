const db = require("../config/database");

exports.getMenus = async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT
        m.id,
        m.kategori_id,
        k.name AS kategori_name,
        m.name,
        m.price,
        m.image_url,
        m.stock,
        m.is_available,
        m.created_at,
        m.updated_at
      FROM menu_items m
      LEFT JOIN kategori k ON k.id = m.kategori_id
      WHERE m.is_available = TRUE
      ORDER BY k.name ASC, m.name ASC
    `);

    res.json({
      success: true,
      message: "Semua menu",
      data: { items },
      items,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.createMenu = async (req, res) => {
  try {
    const { name, kategori_id, price, stock = 0, is_available = true, image_url = null } = req.body;

    if (!name || !kategori_id || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nama, kategori, dan harga wajib diisi",
      });
    }

    const [result] = await db.query(
      `INSERT INTO menu_items (kategori_id, name, price, stock, is_available, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [kategori_id, name, price, stock, !!is_available, image_url || null]
    );

    res.json({
      success: true,
      message: "Menu berhasil dibuat",
      data: { id: result.insertId },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, kategori_id, price, stock = 0, is_available = true, image_url = null } = req.body;

    if (!name || !kategori_id || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nama, kategori, dan harga wajib diisi",
      });
    }

    await db.query(
      `UPDATE menu_items
       SET kategori_id = ?, name = ?, price = ?, stock = ?, is_available = ?, image_url = ?
       WHERE id = ?`,
      [kategori_id, name, price, stock, !!is_available, image_url || null, id]
    );

    res.json({ success: true, message: "Menu berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const [[usage]] = await db.query(
      "SELECT COUNT(*) AS total FROM order_items WHERE menu_item_id = ?",
      [req.params.id]
    );

    if (Number(usage.total) > 0) {
      await db.query(
        "UPDATE menu_items SET is_available = FALSE, stock = 0 WHERE id = ?",
        [req.params.id]
      );
      return res.json({
        success: true,
        message: "Menu sudah pernah masuk transaksi, jadi dinonaktifkan",
      });
    }
    await db.query("DELETE FROM menu_items WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Menu berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};