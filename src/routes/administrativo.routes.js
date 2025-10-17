const express = require("express");
const router = express.Router();
const adminController = require("../controllers/administrativo.controllers");

// Dashboard
router.get("/cards", adminController.getDashboardCards);
router.get("/pedidos", adminController.getRecentOrders);
router.get("/pedidos/paginados", adminController.getPedidosPaginated);
router.get("/pedidos/:id", adminController.getPedidoById);
router.get("/vendas-mensais", adminController.getMonthlySales);

// Clientes e produtos paginados
router.get("/clientes/paginados", adminController.getClientesPaginated);
router.get("/produtos/paginados", adminController.getProdutosPaginated);

// CRUD de clientes/usuários
router.get("/clientes/:id", adminController.getUsuarioById);
router.post("/clientes", adminController.createUsuario);
router.put("/clientes/:id", adminController.updateUsuario);
router.delete("/clientes/:id", adminController.deleteUsuario);

// CRUD de produtos (admin)
router.post("/produtos", adminController.createProduto);
router.put("/produtos/:id", adminController.updateProduto);
router.delete("/produtos/:id", adminController.deleteProduto);

// Atualizar status de pedido
router.put("/pedidos/:id/status", adminController.updateOrderStatus);

module.exports = router;
