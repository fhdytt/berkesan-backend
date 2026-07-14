const db = require("../config/database");

// Helper response
const sendResponse = (res, success, data = null, message = null, statusCode = 200) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// Validasi menu input
const validateMenuInput = (name, kategori_id, price) => {
  if (!name || name.trim() === "") {
    throw new Error("Nama menu wajib diisi");
  }
  if (!kategori_id) {
    throw new Error("Kategori wajib dipilih");
  }
  if (price === undefined || price === null || parseFloat(price) < 0) {
    throw new Error("Harga wajib diisi dan tidak boleh negatif");
  }
  return {
    name: name.trim(),
    kategori_id: parseInt(kategori_id),
    price: parseFloat(price)
  };
};

// ============================================
// GET ALL MENUS (Public - for kasir & customer)
// ============================================
exports.getMenu = async (req, res) => {
  try {
    const { kategori, is_available, search } = req.query;
    let sql = `
      SELECT
        m.id, m.kategori_id, k.name AS kategori_name,
        m.name, m.price, m.image_url, m.is_available,
        m.created_at, m.updated_at
      FROM menu_items m
      LEFT JOIN kategori k ON k.id = m.kategori_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    
    if (kategori) {
      sql += ` AND m.kategori_id = $${idx++}`;
      params.push(parseInt(kategori));
    }
    
    if (is_available !== undefined) {
      sql += ` AND m.is_available = $${idx++}`;
      params.push(is_available === 'true' || is_available === '1');
    } else {
      sql += ` AND m.is_available = TRUE`;
    }
    
    if (search) {
      sql += ` AND LOWER(m.name) LIKE LOWER($${idx++})`;
      params.push(`%${search}%`);
    }
    
    sql += ` ORDER BY k.name ASC, m.name ASC`;
    
    const result = await db.query(sql, params);
    sendResponse(res, true, { 
      items: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error("GET_MENUS ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET ALL MENUS (Admin - include unavailable)
// ============================================
exports.getAllMenusAdmin = async (req, res) => {
  try {
    const { kategori, search } = req.query;
    let sql = `
      SELECT
        m.id, m.kategori_id, k.name AS kategori_name,
        m.name, m.price, m.image_url, m.is_available,
        m.created_at, m.updated_at,
        (SELECT COUNT(*) FROM order_items WHERE menu_item_id = m.id) AS order_count
      FROM menu_items m
      LEFT JOIN kategori k ON k.id = m.kategori_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    
    if (kategori) {
      sql += ` AND m.kategori_id = $${idx++}`;
      params.push(parseInt(kategori));
    }
    
    if (search) {
      sql += ` AND LOWER(m.name) LIKE LOWER($${idx++})`;
      params.push(`%${search}%`);
    }
    
    sql += ` ORDER BY m.created_at DESC`;
    
    const result = await db.query(sql, params);
    sendResponse(res, true, { 
      items: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error("GET_ALL_MENUS_ADMIN ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET MENU BY ID
// ============================================
exports.getMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT
        m.id, m.kategori_id, k.name AS kategori_name,
        m.name, m.price, m.image_url, m.is_available,
        m.created_at, m.updated_at
      FROM menu_items m
      LEFT JOIN kategori k ON k.id = m.kategori_id
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Menu tidak ditemukan", 404);
    }
    
    sendResponse(res, true, { item: result.rows[0] });
  } catch (err) {
    console.error("GET_MENU_BY_ID ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// CREATE MENU (Admin only)
// ============================================
exports.createMenu = async (req, res) => {
  try {
    const { name, kategori_id, price, is_available = true, image_url = null } = req.body;
    
    // Validasi
    const validated = validateMenuInput(name, kategori_id, price);
    
    // Cek apakah kategori exist
    const kategoriCheck = await db.query(
      "SELECT id FROM kategori WHERE id = $1",
      [validated.kategori_id]
    );
    if (kategoriCheck.rows.length === 0) {
      return sendResponse(res, false, null, "Kategori tidak ditemukan", 400);
    }
    
    // Cek duplikat nama menu
    const duplicateCheck = await db.query(
      "SELECT id FROM menu_items WHERE LOWER(name) = LOWER($1)",
      [validated.name]
    );
    if (duplicateCheck.rows.length > 0) {
      return sendResponse(res, false, null, "Nama menu sudah ada", 409);
    }
    
    const result = await db.query(
      `INSERT INTO menu_items (kategori_id, name, price, is_available, image_url)
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, price, is_available`,
      [validated.kategori_id, validated.name, validated.price, !!is_available, image_url || null]
    );
    
    sendResponse(res, true, { menu: result.rows[0] }, "Menu berhasil dibuat");
  } catch (err) {
    console.error("CREATE_MENU ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// UPDATE MENU (Admin only)
// ============================================
exports.updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, kategori_id, price, is_available, image_url } = req.body;
    
    // Cek menu exist
    const menuCheck = await db.query("SELECT id FROM menu_items WHERE id = $1", [id]);
    if (menuCheck.rows.length === 0) {
      return sendResponse(res, false, null, "Menu tidak ditemukan", 404);
    }
    
    // Build update query dinamis
    const updates = [];
    const values = [];
    let idx = 1;
    
    if (name !== undefined) {
      if (!name || name.trim() === "") {
        return sendResponse(res, false, null, "Nama menu tidak boleh kosong", 400);
      }
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    
    if (kategori_id !== undefined) {
      const kategoriCheck = await db.query("SELECT id FROM kategori WHERE id = $1", [kategori_id]);
      if (kategoriCheck.rows.length === 0) {
        return sendResponse(res, false, null, "Kategori tidak ditemukan", 400);
      }
      updates.push(`kategori_id = $${idx++}`);
      values.push(parseInt(kategori_id));
    }
    
    if (price !== undefined) {
      if (parseFloat(price) < 0) {
        return sendResponse(res, false, null, "Harga tidak boleh negatif", 400);
      }
      updates.push(`price = $${idx++}`);
      values.push(parseFloat(price));
    }
    
    if (is_available !== undefined) {
      updates.push(`is_available = $${idx++}`);
      values.push(!!is_available);
    }
    
    if (image_url !== undefined) {
      updates.push(`image_url = $${idx++}`);
      values.push(image_url || null);
    }
    
    if (updates.length === 0) {
      return sendResponse(res, false, null, "Tidak ada data yang diupdate", 400);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    await db.query(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );
    
    sendResponse(res, true, null, "Menu berhasil diperbarui");
  } catch (err) {
    console.error("UPDATE_MENU ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// DELETE MENU (Soft delete if used in orders)
// ============================================
exports.deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek menu exist
    const menuCheck = await db.query("SELECT id, name FROM menu_items WHERE id = $1", [id]);
    if (menuCheck.rows.length === 0) {
      return sendResponse(res, false, null, "Menu tidak ditemukan", 404);
    }
    
    // Cek apakah menu sudah pernah digunakan di order
    const usage = await db.query(
      "SELECT COUNT(*) AS total FROM order_items WHERE menu_item_id = $1",
      [id]
    );
    
    if (Number(usage.rows[0].total) > 0) {
      // Soft delete: hanya nonaktifkan
      await db.query(
        `UPDATE menu_items 
         SET is_available = FALSE, 
             updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );
      return sendResponse(res, true, { softDeleted: true }, 
        `Menu "${menuCheck.rows[0].name}" sudah pernah masuk transaksi, dinonaktifkan`);
    }
    
    // Hard delete jika belum pernah digunakan
    await db.query("DELETE FROM menu_items WHERE id = $1", [id]);
    sendResponse(res, true, null, `Menu "${menuCheck.rows[0].name}" berhasil dihapus`);
  } catch (err) {
    console.error("DELETE_MENU ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// TOGGLE MENU AVAILABILITY
// ============================================
exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `UPDATE menu_items 
       SET is_available = NOT is_available, 
           updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, name, is_available`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Menu tidak ditemukan", 404);
    }
    
    const status = result.rows[0].is_available ? "diaktifkan" : "dinonaktifkan";
    sendResponse(res, true, { is_available: result.rows[0].is_available }, 
      `Menu berhasil ${status}`);
  } catch (err) {
    console.error("TOGGLE_AVAILABILITY ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};

// ============================================
// GET MENUS BY CATEGORY
// ============================================
exports.getMenusByCategory = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        k.id AS kategori_id, 
        k.name AS kategori_name,
        json_agg(json_build_object(
          'id', m.id,
          'name', m.name,
          'price', m.price,
          'image_url', m.image_url,
          'is_available', m.is_available
        ) ORDER BY m.name ASC) AS menus
      FROM kategori k
      LEFT JOIN menu_items m ON m.kategori_id = k.id AND m.is_available = TRUE
      GROUP BY k.id, k.name
      ORDER BY k.name ASC
    `);
    
    sendResponse(res, true, { categories: result.rows });
  } catch (err) {
    console.error("GET_MENUS_BY_CATEGORY ERROR:", err);
    sendResponse(res, false, null, err.message, 500);
  }
};