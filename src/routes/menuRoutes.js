const express = require("express");

const router = express.Router();

const menuController = require("../controllers/menuController");

// GET MENU
router.get("/", menuController.getMenus);

// CREATE MENU
router.post("/", menuController.createMenu);
router.put("/:id", menuController.updateMenu);
router.delete("/:id", menuController.deleteMenu);

module.exports = router;