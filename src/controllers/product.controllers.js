const Product = require("../models/product.model");
const { Op } = require("sequelize");

// Criar produto
async function createProduct(req, res, next) {
  try {
    const { nome, valor, valorPromocional, descricao, categoria,
            cores, imagem1, imagem2, imagem3, imagem4 } = req.body;

    const product = await Product.create({
      nome: nome || null,
      valor: valor || null,
      valorPromocional: valorPromocional || null,
      descricao: descricao || null,
      categoria: categoria || null,
      cores: Array.isArray(cores) ? cores : [],
      imagem1: imagem1 || null,
      imagem2: imagem2 || null,
      imagem3: imagem3 || null,
      imagem4: imagem4 || null
    });

    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

// Listar todos produtos
async function getProducts(req, res, next) {
  try {
    const products = await Product.findAll({ order: [["createdAt", "DESC"]] });
    res.json(products);
  } catch (err) { next(err); }
}

// Listar produtos por categoria + filtros
async function getProductsByCategory(req, res, next) {
  try {
    const { category, maxPrice, sort } = req.query;

    console.log("Query params:", req.query);

    // Monta filtro
    let where = {};
    if (category) where.categoria = category;
    if (maxPrice) {
      const priceNum = parseFloat(maxPrice);
      if (!isNaN(priceNum)) where.valor = { [Op.lte]: priceNum };
    }

    // Ordenação
    let order = [];
    switch (sort) {
      case "highest": order = [["valor", "DESC"]]; break;
      case "lowest": order = [["valor", "ASC"]]; break;
      case "alphabetical": order = [["nome", "ASC"]]; break;
      case "alphabetical-desc": order = [["nome", "DESC"]]; break;
      case "bestsellers": order = [["sales", "DESC"]]; break;
      case "discount": order = [["valorPromocional", "DESC"]]; break;
      default: order = [["createdAt", "DESC"]];
    }

    // Busca produtos
    const products = await Product.findAll({ where, order });

    // Garante que cores e imagens sejam arrays válidos
    const safeProducts = products.map(p => {
      const prod = p.toJSON();

      try {
        prod.cores = Array.isArray(prod.cores) ? prod.cores : JSON.parse(prod.cores || "[]");
      } catch {
        prod.cores = [];
      }

      try {
        prod.imagens = Array.isArray(prod.imagens) ? prod.imagens : JSON.parse(prod.imagens || "[]");
      } catch {
        prod.imagens = [];
      }

      return prod;
    });

    res.json(safeProducts);

  } catch (err) {
    console.error("Erro em getProductsByCategory:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
    next(err);
  }
}


// Buscar produto por id
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(product);
  } catch (err) { next(err); }
}

// Produtos relacionados
async function getRelatedProducts(req, res, next) {
  try {
    const { id } = req.params;

    const currentProduct = await Product.findByPk(id);
    if (!currentProduct) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const related = await Product.findAll({
      where: {
        categoria: currentProduct.categoria,
        id: { [Op.ne]: id }
      },
      limit: 6
    });

    if (!related.length) {
      return res.json({ message: "Sem produtos relacionados..." });
    }

    // Sanitiza JSON (caso necessário)
    const safeProducts = related.map(p => {
      const prod = p.toJSON();

      try {
        prod.cores = Array.isArray(prod.cores) ? prod.cores : JSON.parse(prod.cores || "[]");
      } catch {
        prod.cores = [];
      }

      try {
        prod.imagens = Array.isArray(prod.imagens) ? prod.imagens : JSON.parse(prod.imagens || "[]");
      } catch {
        prod.imagens = [];
      }

      return prod;
    });

    res.json(safeProducts);
  } catch (err) {
    console.error("Erro em getRelatedProducts:", err);
    res.status(500).json({ error: "Erro ao buscar relacionados" });
    next(err);
  }
}

// Atualizar produto
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, valor, valorPromocional, descricao, categoria, cores, imagens, sales } = req.body;

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });

    await product.update({ nome, valor, valorPromocional, descricao, categoria, cores, imagens, sales });
    res.json(product);
  } catch (err) { next(err); }
}

// Deletar produto
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });

    await product.destroy();
    res.json({ message: "Produto deletado com sucesso" });
  } catch (err) { next(err); }
}

async function getHighlights (req, res) {
  try {
    const lancamentos = await Product.findAll({
      where: { isLancamento: true },
      limit: 8
    });

    const maisVendidos = await Product.findAll({
      where: { isMaisVendido: true },
      limit: 8
    });

    res.json({ lancamentos, maisVendidos });
  } catch (err) {
    console.error("Erro ao buscar destaques:", err);
    res.status(500).json({ error: "Erro ao buscar produtos em destaque" });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductsByCategory,
  getRelatedProducts,
  updateProduct,
  deleteProduct,
  getHighlights
};