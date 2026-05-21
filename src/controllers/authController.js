const db = require("../config/database");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // VALIDASI INPUT
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username dan password wajib diisi",
      });
    }

    // CEK USER
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username],
    );

    // USER TIDAK DITEMUKAN
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Username tidak ditemukan",
      });
    }

    const user = rows[0];

    // CEK PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);

    // PASSWORD SALAH
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Password salah",
      });
    }

    // GENERATE JWT TOKEN
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "1d",
      },
    );

    // RESPONSE
    return res.json({
      success: true,

      token,

      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
