const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controllers');
const rateLimit = require("express-rate-limit");

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // máx 5 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);

router.post("/forgot", forgotLimiter, AuthController.requestPasswordReset);
router.post("/reset", AuthController.resetPassword);

module.exports = router;