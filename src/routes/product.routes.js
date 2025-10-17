const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/product.controllers");
const Product = require("../models/product.model");
const { Op, Sequelize } = require("sequelize");

router.get("/search", async (req, res) => {
  try {
    let { q } = req.query;
    if (!q) return res.status(400).json({ error: "Termo de busca não informado" });

    // Normalizar acentos e transformar em minúsculas
    q = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const results = await Product.findAll({
      where: Sequelize.where(
        Sequelize.fn(
          "LOWER",
          Sequelize.fn("REPLACE", Sequelize.col("nome"), "ç", "c")
        ),
        {
          [Op.like]: `%${q}%`
        }
      ),
      limit: 10
    });

    if (!results.length) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json(results);
  } catch (error) {
    console.error("Erro na busca:", error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

router.get("/highlights", ProductController.getHighlights);

router.post("/", ProductController.createProduct);
router.get("/", ProductController.getProducts);
router.get("/category", ProductController.getProductsByCategory); // ✅ rota corrigida
router.get("/:id/related", ProductController.getRelatedProducts);
router.get("/:id", ProductController.getProductById);
router.put("/:id", ProductController.updateProduct);
router.delete("/:id", ProductController.deleteProduct);


module.exports = router;