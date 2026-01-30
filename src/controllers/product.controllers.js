const Product = require("../models/product.model");
const Category = require("../models/category.model");
const { Op } = require("sequelize");

// Criar produto
async function createProduct(req, res, next) {
  try {
    const {
      nome, valor, valorPromocional, descricao, categoria,
      cores, lonas, imagens, estoque, peso, altura, largura, comprimento,
      isLancamento, isMaisVendido
    } = req.body;

    // Se categoria foi enviada, garante que existe na tabela de categorias
    if (categoria) {
      await Category.findOrCreate({ where: { nome: categoria } });
    }

    const product = await Product.create({
      nome: nome || null,
      valor: valor || 0,
      valorPromocional: valorPromocional || 0,
      descricao: descricao || null,
      categoria: categoria || "Geral",
      cores: cores || [],
      lonas: lonas || [],
      imagens: imagens || [],
      estoque: estoque || 0,
      peso: peso || "0",
      altura: altura || "0",
      largura: largura || "0",
      comprimento: comprimento || "0",
      isLancamento: !!isLancamento,
      isMaisVendido: !!isMaisVendido
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ error: "Erro ao criar produto" });
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
    const {
      nome, valor, valorPromocional, descricao, categoria,
      cores, lonas, imagens, sales, estoque, peso, altura, largura, comprimento,
      isLancamento, isMaisVendido
    } = req.body;

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });

    // Se categoria foi enviada, garante que existe na tabela de categorias
    if (categoria) {
      await Category.findOrCreate({ where: { nome: categoria } });
    }

    await product.update({
      nome, valor, valorPromocional, descricao, categoria,
      cores, lonas, imagens, sales, estoque, peso, altura, largura, comprimento,
      isLancamento, isMaisVendido
    });
    res.json(product);
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
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

async function getHighlights(req, res) {
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