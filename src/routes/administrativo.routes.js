const express = require("express");
const router = express.Router();
const adminController = require("../controllers/administrativo.controllers");
const adminCartController = require("../controllers/adminCart.controllers");

// Dashboard
router.get("/cards", adminController.getDashboardCards);
router.get("/pedidos", adminController.getRecentOrders);
router.get("/pedidos/paginados", adminController.getPedidosPaginated);
router.get("/pedidos/:id", adminController.getPedidoById);
router.get("/vendas-mensais", adminController.getMonthlySales);
router.get("/financeiro/balanco", adminController.getFinancialBalance);
router.get("/indicadores", adminController.getIndicadoresGerais);

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

// CRUD de cupons
router.get("/cupons/paginados", adminController.getCuponsPaginated);
router.post("/cupons", adminController.createCoupon);
router.put("/cupons/:id", adminController.updateCoupon);
router.delete("/cupons/:id", adminController.deleteCoupon);

// Carrinhos (Admin)
router.get("/carrinhos/paginados", adminCartController.getCartsPaginated);
router.post("/carrinhos/:id/lembrar", adminCartController.remindCartByEmail);
router.post("/carrinhos/lembrar-abandonados", adminCartController.remindAllAbandoned);
router.get("/carrinhos", adminCartController.getAllCarts);
router.get("/carrinhos/:id", adminCartController.getCartById);
router.post("/carrinhos/:id/adicionar", adminCartController.addItemToCart);
router.delete("/carrinhos/:id/item/:itemId", adminCartController.removeItemFromCart);
router.put("/carrinhos/:id/aplicar-cupom", adminCartController.applyCouponAdmin);
router.post("/carrinhos/:id/mensagem", adminCartController.sendAbandonedCartMessage);

module.exports = router;
