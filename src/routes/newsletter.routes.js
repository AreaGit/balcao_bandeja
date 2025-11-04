const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletter.controllers");

// Público
router.post("/subscribe", newsletterController.subscribe);
router.post("/unsubscribe", newsletterController.unsubscribe);

// Admin
router.get("/", newsletterController.listSubscribers);
router.post("/send", newsletterController.sendNewsletter);
router.get("/stats", newsletterController.getStats);

module.exports = router;