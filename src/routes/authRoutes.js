const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken, isAdmin } = require("../middleware/auth");

// ============================================
// PUBLIC ROUTES
// ============================================
router.post("/login", authController.login);

// ============================================
// PROTECTED ROUTES (Perlu Token)
// ============================================
router.get("/profile", verifyToken, authController.getProfile);
router.post("/logout", verifyToken, authController.logout);

// ============================================
// ADMIN ONLY ROUTES
// ============================================
router.post("/register", verifyToken, isAdmin, authController.register);
router.get("/users", verifyToken, isAdmin, authController.getUsers);
router.get("/users/:id", verifyToken, isAdmin, authController.getUserById);
router.put("/users/:id", verifyToken, isAdmin, authController.updateUser);
router.delete("/users/:id", verifyToken, isAdmin, authController.deleteUser);

module.exports = router;