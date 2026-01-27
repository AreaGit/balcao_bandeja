const express = require("express");
const router = express.Router();
const categoryControllers = require("../controllers/category.controllers");

// Middleware de autenticação de admin (exemplo baseado em administrativo.routes.js se existir)
// Por enquanto, seguindo o padrão de rotas públicas ou protegidas via cookies conforme o projeto.

router.get("/", categoryControllers.getAllCategories);
router.post("/", categoryControllers.createCategory);
router.put("/:id", categoryControllers.updateCategory);
router.delete("/:id", categoryControllers.deleteCategory);

module.exports = router;
