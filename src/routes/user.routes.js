const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controllers");

// Rotas
router.get("/profile", userController.profile);
router.put("/profile", userController.updateProfile);

// Logout
router.post("/logout", userController.logout);

module.exports = router;
