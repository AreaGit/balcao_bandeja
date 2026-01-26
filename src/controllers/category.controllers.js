const Category = require("../models/category.model");

// Listar todas as categorias
async function getCategories(req, res, next) {
    try {
        const categories = await Category.findAll({ order: [["nome", "ASC"]] });
        res.json(categories);
    } catch (err) { next(err); }
}

// Criar categoria
async function createCategory(req, res, next) {
    try {
        const { nome } = req.body;
        if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

        // Gera slug simples
        const slug = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

        const category = await Category.create({ nome, slug });
        res.status(201).json(category);
    } catch (err) {
        if (err.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({ error: "Categoria já existe" });
        }
        next(err);
    }
}

// Deletar categoria
async function deleteCategory(req, res, next) {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).json({ error: "Categoria não encontrada" });

        await category.destroy();
        res.json({ message: "Categoria deletada com sucesso" });
    } catch (err) { next(err); }
}

module.exports = {
    getCategories,
    createCategory,
    deleteCategory
};
