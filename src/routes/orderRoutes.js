const express = require("express");

const router = express.Router();

const orderController = require("../controllers/orderController");

// GET ORDER
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrderDetail);

// CREATE ORDER
router.post("/", orderController.createOrder);
router.patch("/:id/status", orderController.updateOrderStatus);

module.exports = router;