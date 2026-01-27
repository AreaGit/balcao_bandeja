const Category = require("../models/category.model");

// Listar todas as categorias
async function getAllCategories(req, res) {
    try {
        const categories = await Category.findAll({
            order: [['nome', 'ASC']]
        });
        res.json(categories);
    } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        res.status(500).json({ error: "Erro ao buscar categorias" });
    }
}

// Criar nova categoria
async function createCategory(req, res) {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: "Nome da categoria é obrigatório" });
        }

        const category = await Category.create({ nome });
        res.status(201).json(category);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: "Categoria já existe" });
        }
        console.error("Erro ao criar categoria:", error);
        res.status(500).json({ error: "Erro ao criar categoria" });
    }
}

// Atualizar categoria
async function updateCategory(req, res) {
    try {
        const { id } = req.params;
        const { nome } = req.body;

        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }

        category.nome = nome;
        await category.save();

        res.json(category);
    } catch (error) {
        console.error("Erro ao atualizar categoria:", error);
        res.status(500).json({ error: "Erro ao atualizar categoria" });
    }
}

// Deletar categoria
async function deleteCategory(req, res) {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }

        await category.destroy();
        res.json({ message: "Categoria removida com sucesso" });
    } catch (error) {
        console.error("Erro ao deletar categoria:", error);
        res.status(500).json({ error: "Erro ao deletar categoria" });
    }
}

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
