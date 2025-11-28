const express = require("express");
const router = express.Router();
const PagesController = require("../controllers/pages.controllers");

router.get("/", PagesController.home);
router.get("/home", PagesController.home);
router.get("/categories", PagesController.categories);
router.get("/checkout", PagesController.checkout);
router.get("/detalhes-produto", PagesController.detalhesProduto);
router.get("/fale_conosco", PagesController.faleConosco);
router.get("/login", PagesController.login);
router.get("/politica", PagesController.politica);
router.get("/profile", PagesController.profile);
router.get("/recover", PagesController.recover);
router.get("/register", PagesController.register);
router.get("/reset", PagesController.reset);
router.get("/somos", PagesController.somos);
router.get("/troca", PagesController.troca);
router.get("/autentication", PagesController.autenticacao);
router.get("/api/me", PagesController.inicial);
router.get("/administrativo", PagesController.administrativo);
router.get("/pedido-confirmado", PagesController.pedido_confirmado);
router.get("/forgot-password", PagesController.forgot_password);
router.get("/reset-password", PagesController.reset_password);
router.get("/beneficio", PagesController.beneficio);

module.exports = router;