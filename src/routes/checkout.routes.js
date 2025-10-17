const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkout.controllers");

router.post("/cart", checkoutController.getCart);
router.get("/user", checkoutController.getUserData);
router.post("/save-user", checkoutController.saveUserData);
router.post("/save-address-frete", checkoutController.saveAddressFrete);
router.post("/save-address-frete-cart", checkoutController.saveAddressFreteCart);
router.get("/payment-methods", checkoutController.getPaymentMethods);
router.post("/create-order", checkoutController.createOrder);
router.get("/order-summary/:orderId", checkoutController.getOrderSummary);
router.post("/gerar-pix", checkoutController.gerarPix);
router.post("/gerar-boleto", checkoutController.gerarBoleto);
router.post("/gerar-cartao", checkoutController.gerarCartao);
router.post("/finalizar", checkoutController.finalizarPedido);

module.exports = router;