const express = require("express");
const router = express.Router();
const freteController = require("../controllers/frete.controllers");

// POST 
router.post("/cotacao", freteController.getFrete);

module.exports = router;