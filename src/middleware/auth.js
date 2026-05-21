const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // TOKEN TIDAK ADA
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // FORMAT:
    // Bearer TOKEN

    const token = authHeader.split(" ")[1];

    // VERIFY TOKEN
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // SIMPAN USER KE REQUEST
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
};