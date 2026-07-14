const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { verifyToken, isAdmin } = require("../middleware/auth");

// Semua route dashboard hanya untuk admin
router.use(verifyToken, isAdmin);

// Dashboard stats
router.get("/stats", dashboardController.getDashboardStats);
router.get("/rekap", dashboardController.getRekap);
router.get("/laporan", dashboardController.getLaporan);
router.get("/antrean", dashboardController.getAntrean);

// Kategori
router.get("/kategori", dashboardController.getKategori);
router.post("/kategori", dashboardController.createKategori);
router.put("/kategori/:id", dashboardController.updateKategori);
router.delete("/kategori/:id", dashboardController.deleteKategori);

// Menu (re-export dari menuController)
router.get("/menu", dashboardController.getMenu);
router.post("/menu", dashboardController.createMenu);
router.put("/menu/:id", dashboardController.updateMenu);
router.delete("/menu/:id", dashboardController.deleteMenu);

// Meja
router.get("/meja", dashboardController.getMeja);
router.post("/meja", dashboardController.createMeja);
router.put("/meja/:id", dashboardController.updateMeja);
router.patch("/meja/:id/toggle", dashboardController.toggleMeja);
router.delete("/meja/:id", dashboardController.deleteMeja);

// Users management (admin only)
router.get("/users", dashboardController.getUsers);
router.post("/users", dashboardController.createUser);
router.delete("/users/:id", dashboardController.deleteUser);

module.exports = router;