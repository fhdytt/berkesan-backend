const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken, isKasir, isAdmin } = require("../middleware/auth");

// ============================================
// PUBLIC ROUTES (No auth - for customer order)
// ============================================
router.post("/", orderController.createOrder);
router.get("/:id", orderController.getOrderDetail);

// ============================================
// PROTECTED ROUTES (Kasir & Admin)
// ============================================
router.use(verifyToken, isKasir);

router.get("/", orderController.getOrders);
router.get("/today/summary", orderController.getTodaySummary);
router.put("/:id/status", orderController.updateOrderStatus);
router.get("/table/:table_id", orderController.getOrdersByTable);

// ============================================
// ADMIN ONLY
// ============================================
// (tambahan jika diperlukan)

module.exports = router;