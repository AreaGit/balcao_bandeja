const express = require("express");
const router = express.Router();

const Pedido = require("../models/pedido");
const PedidoItem = require("../models/pedidoItem.model");
const Produto = require("../models/product.model");
const Usuario = require("../models/user.model");

// Buscar todos os pedidos do usuário logado
router.get("/me", async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ message: "Usuário não autenticado" });

    const pedidos = await Pedido.findAll({
      where: { usuarioId: user.id },
      include: [
        {
          model: PedidoItem,
          as: "itens",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "valor", "valorPromocional", "imagens"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.json(pedidos);
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    res.status(500).json({ message: "Erro interno ao carregar pedidos." });
  }
});

// Buscar pedido pelo ID (ex: pedido confirmado)
router.get("/:id", async (req, res) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: "usuario", attributes: ["id", "nome", "email"] },
        {
          model: PedidoItem,
          as: "itens",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "valor", "valorPromocional", "imagens"]
            }
          ]
        }
      ]
    });

    console.log(pedido);

    if (!pedido) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }

    res.json(pedido);
  } catch (err) {
    console.log("Erro ao carregar pedido:", err);
    res.status(500).json({ message: "Erro interno ao carregar pedido." });
  }
});

// Listar todos os pedidos de um usuário
router.get("/usuario/:usuarioId", async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      where: { usuarioId: req.params.usuarioId },
      include: [
        {
          model: PedidoItem,
          as: "itens",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "valor", "valorPromocional", "imagem1"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao carregar pedidos do usuário:", err);
    res.status(500).json({ message: "Erro interno ao carregar pedidos." });
  }
});

module.exports = router;