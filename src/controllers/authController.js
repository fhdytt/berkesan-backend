const db = require("../config/database");
const { comparePassword, hashPassword } = require("../utils/hash");
const { generateToken } = require("../utils/jwt");

const VALID_ROLES = ["admin", "kasir"];

// Helper response
const sendResponse = (res, success, data = null, message = null, statusCode = 200) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// ============================================
// REGISTER (Admin only)
// ============================================
exports.register = async (req, res) => {
  try {
    const { username, password, name, role = "kasir" } = req.body;
    
    if (!username || !password) {
      return sendResponse(res, false, null, "Username dan password wajib diisi", 400);
    }
    
    if (username.length < 3) {
      return sendResponse(res, false, null, "Username minimal 3 karakter", 400);
    }
    
    if (password.length < 6) {
      return sendResponse(res, false, null, "Password minimal 6 karakter", 400);
    }
    
    if (!VALID_ROLES.includes(role)) {
      return sendResponse(res, false, null, "Role tidak valid", 400);
    }
    
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1", 
      [username]
    );
    
    if (existing.rows.length > 0) {
      return sendResponse(res, false, null, "Username sudah digunakan", 409);
    }
    
    const hashed = await hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, name, role, created_at`,
      [username, hashed, name || username, role]
    );
    
    return sendResponse(res, true, { user: result.rows[0] }, "Register berhasil");
    
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return sendResponse(res, false, null, "Internal server error", 500);
  }
};

// ============================================
// LOGIN
// ============================================
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return sendResponse(res, false, null, "Username dan password wajib diisi", 400);
    }
    
    const result = await db.query(
      "SELECT id, username, password, name, role FROM users WHERE username = $1 LIMIT 1",
      [username]
    );
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "Username atau password salah", 401);
    }
    
    const user = result.rows[0];
    const isMatch = await comparePassword(password, user.password);
    
    if (!isMatch) {
      return sendResponse(res, false, null, "Username atau password salah", 401);
    }
    
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    
    // Update last_login
    await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
    
    delete user.password;
    
    return sendResponse(res, true, {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    }, "Login berhasil");
    
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return sendResponse(res, false, null, "Internal server error", 500);
  }
};

// ============================================
// GET PROFILE (Current user)
// ============================================
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT id, username, name, role, created_at, last_login 
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "User tidak ditemukan", 404);
    }
    
    return sendResponse(res, true, { user: result.rows[0] });
    
  } catch (err) {
    console.error("GET_PROFILE ERROR:", err);
    return sendResponse(res, false, null, "Internal server error", 500);
  }
};

// ============================================
// GET ALL USERS (Admin only)
// ============================================
exports.getUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, name, role, created_at, last_login 
       FROM users 
       ORDER BY created_at DESC`
    );
    
    return sendResponse(res, true, { users: result.rows });
    
  } catch (err) {
    console.error("GET_USERS ERROR:", err);
    return sendResponse(res, false, null, "Internal server error", 500);
  }
};

// ============================================
// GET USER BY ID (Admin only)
// ============================================
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT id, username, name, role, created_at, last_login 
       FROM users 
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, null, "User tidak ditemukan", 404);
    }
    
    return sendResponse(res, true, { user: result.rows[0] });
    
  } catch (err) {
    console.error("GET_USER_ERROR:", err);
    return sendResponse(res, false, null, "Internal server error", 500);
  }
};

// ============================================
// UPDATE USER (Admin only)
// ============================================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, password } = req.body;
    
    const userExists = await db.query("SELECT id FROM users WHERE id = $1", [id]);
    if (userExists.rows.length === 0) {
      return sendResponse(res, false, null, "User tidak ditemukan", 404);
    }
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    
    if (role && VALID_ROLES.includes(role)) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    
    if (password) {
      if (password.length < 6) {
        return sendResponse(res, false, null, "Password minimal 6 karakter", 400);
      }
      const hashed = await hashPassword(password);
      updates.push(`password = $${paramIndex++}`);
      values.push(hashed);
    }
    
    if (updates.length === 0) {
      return sendResponse(res, false, null, "Tidak ada data yang diupdate", 400);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    return sendResponse(res, true, null, "User berhasil diupdate");
    
  } catch (err) {
    console.error("UPDATE_USER ERROR:", err);
    return sendResponse(res, false, null, "Internal server error", 500);
  }
};

// ============================================
// DELETE USER (Admin only)
// ============================================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    
    const userExists = await db.query("SELECT id FROM users WHERE id = $1", [id]);
    if (userExists.rows.length === 0) {
      return sendResponse(res, false, null, "User tidak ditemukan", 404);
    }
    
    if (parseInt(id) === currentUserId) {
      return sendResponse(res, false, null, "Tidak bisa menghapus akun sendiri", 400);
    }
    
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    
    return sendResponse(res, true, null, "User berhasil dihapus");
    
  } catch (err) {
    console.error("DELETE_USER ERROR:", err);
    return sendResponse(res, false, null, "Internal server error", 500);
  }
};

// ============================================
// LOGOUT
// ============================================
exports.logout = async (req, res) => {
  // JWT stateless, cukup hapus token di client
  return sendResponse(res, true, null, "Logout berhasil. Silakan hapus token dari client.");
};