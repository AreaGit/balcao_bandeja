const express = require("express");
const router = express.Router();

const contactCtrl = require("../controllers/contact.controllers");
const { validators, handleValidation } = require("../utils/validateContact");
const contactRateLimiter = require("../utils/rateLimitContact");

// POST /contact  (envio do formulário)
router.post(
  "/",
  contactRateLimiter,
  validators,
  handleValidation,
  contactCtrl.create
);

router.post("/beneficio", contactCtrl.store);
router.get("/beneficios", contactCtrl.index);
router.get("/beneficio/:id", contactCtrl.show);

// GET /contact (admin) — proteja com seu middleware de auth
router.get("/", /* authMiddleware, */ contactCtrl.list);

// PATCH /contact/:id/status (admin) — proteja com auth
router.patch("/:id/status", /* authMiddleware, */ contactCtrl.updateStatus);

module.exports = router;
