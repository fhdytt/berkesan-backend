const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { verifyToken, isAdmin, isKasir } = require("../middleware/auth");

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================
router.get("/", menuController.getMenu);

// ============================================
// PROTECTED ROUTES (Kasir & Admin)
// ============================================
router.get("/admin/all", verifyToken, isAdmin, menuController.getAllMenusAdmin || menuController.getMenus);
router.get("/:id", verifyToken, isKasir, menuController.getMenuById || menuController.getMenus);

// ============================================
// ADMIN ONLY ROUTES
// ============================================
router.post("/", verifyToken, isAdmin, menuController.createMenu);
router.put("/:id", verifyToken, isAdmin, menuController.updateMenu);
router.delete("/:id", verifyToken, isAdmin, menuController.deleteMenu);
router.patch("/:id/toggle", verifyToken, isAdmin, menuController.toggleAvailability);

module.exports = router;