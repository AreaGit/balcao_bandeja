const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controllers");

// Criar pedido (checkout)
router.post("/", orderController.createOrder);

// Listar todos os pedidos
router.get("/", orderController.getOrders);

// Buscar pedido por ID
router.get("/:id", orderController.getOrderById);

// Atualizar status do pedido
router.put("/:id/status", orderController.updateOrderStatus);

// Excluir pedido
router.delete("/:id", orderController.deleteOrder);

module.exports = router;