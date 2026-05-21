const express = require("express");
const router = express.Router();
const kasirController = require("../controllers/kasirController");

router.get("/orders", kasirController.getOrders);
router.get("/orders/lookup", kasirController.lookupOrder);
router.get("/orders/:id", kasirController.getOrderDetail);
router.patch("/orders/:id/status", kasirController.updateOrderStatus);
router.get("/queue", kasirController.getQueue);
router.get("/history", kasirController.getHistory);

module.exports = router;