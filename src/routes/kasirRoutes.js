const express = require("express");
const router = express.Router();
const kasirController = require("../controllers/kasirController");
const { verifyToken, isKasir } = require("../middleware/auth");

// Semua route kasir require auth dan role kasir/admin
router.use(verifyToken, isKasir);

// Route tanpa parameter ID
router.get("/lookup", kasirController.lookupOrder);
router.get("/orders/lookup", kasirController.lookupOrder);
router.get("/queue", kasirController.getQueue);
router.get("/history", kasirController.getHistory);
router.get("/pending", kasirController.getPendingOrders);

// Route dengan parameter ID 
router.get("/orders", kasirController.getOrders);
router.get("/orders/:id", kasirController.getOrderDetail);
router.put("/orders/:id/status", kasirController.updateOrderStatus);
router.post("/orders/:id/payment", kasirController.processPayment);
router.post("/orders/:id/cancel", kasirController.cancelOrder);


module.exports = router;