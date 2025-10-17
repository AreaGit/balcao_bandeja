const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controllers");

// Criar ou buscar carrinho (userId ou guestId)
router.post("/", cartController.createOrGetCart);

// Obter carrinho formatado
router.get("/:id", cartController.getCart);

// Adicionar item no carrinho
router.post("/item", cartController.addItem);

// Atualizar quantidade de item
router.put("/item/:itemId", cartController.updateItem);

// Atualizar frete
router.post("/update-frete", cartController.updateFrete);

// Remover item do carrinho
router.delete("/item/:itemId", cartController.removeItem);

// Aplicar cupom de desconto
router.post("/:id/coupon", cartController.applyCoupon);

module.exports = router;