const Pedido = require("../models/pedido.js");
const PedidoItem = require("../models/pedidoItem.model.js");
const Produto = require("../models/product.model.js");
const Usuario = require("../models/user.model.js");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: "../../.env" });

// Cards do Dashboard
async function getDashboardCards(req, res) {
  try {
    // Total de pedidos
    const totalPedidos = await Pedido.count();

    // Total de vendas
    const totalVendas = await Pedido.sum("total"); // <-- aqui estava 'valorTotal'

    // Total de clientes
    const totalClientes = await Usuario.count();

    res.json({
      pedidos: totalPedidos,
      vendas: totalVendas || 0,
      clientes: totalClientes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar cards" });
  }
}

// Pedidos recentes
async function getRecentOrders(req, res) {
  try {
    const pedidos = await Pedido.findAll({
      include: [{ model: Usuario, as: "usuario", attributes: ["id", "nome"] }],
      order: [["createdAt", "DESC"]],
      limit: 10
    });

    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar pedidos" });
  }
}

// Vendas mensais
async function getMonthlySales(req, res) {
  try {
    const vendas = [];

    // Vamos gerar 12 meses
    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(new Date().getFullYear(), month, 1);
      const lastDay = new Date(new Date().getFullYear(), month + 1, 0);

      const total = await Pedido.sum("total", {
        where: {
          createdAt: {
            [require("sequelize").Op.between]: [firstDay, lastDay]
          }
        }
      });

      vendas.push(total || 0);
    }

    res.json(vendas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar vendas mensais" });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Processando", "Enviado", "Entregue", "Cancelado"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const pedido = await Pedido.findByPk(id, {
      include: { model: Usuario, as: "usuario", attributes: ["id", "nome", "email"] }
    });

    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    pedido.status = status;
    await pedido.save();

    // === Enviar e-mail ao cliente ===
    if (pedido.usuario?.email) {
      await sendStatusEmail(pedido.usuario.email, pedido.usuario.nome, pedido.id, status);
    }

    res.json({ success: true, message: "Status atualizado com sucesso", pedido });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar status do pedido" });
  }
}

// Função de envio de e-mail
async function sendStatusEmail(to, nomeCliente, pedidoId, status) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
  });

  const statusMessages = {
    Processando: "seu pedido está sendo processado e logo será enviado.",
    Enviado: "seu pedido foi enviado! Em breve chegará até você.",
    Entregue: "seu pedido foi entregue. Obrigado pela preferência!",
    Cancelado: "seu pedido foi cancelado. Caso tenha dúvidas, entre em contato."
  };

  const mailOptions = {
    from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
    to,
    subject: `Atualização do Pedido #${pedidoId}`,
    html: `
      <div style="font-family:sans-serif; padding:20px; background:#f7f7f7;">
        <h2>Olá, ${nomeCliente}!</h2>
        <p>O status do seu pedido <b>#${pedidoId}</b> foi atualizado para <b>${status}</b>.</p>
        <p>${statusMessages[status]}</p>
        <br/>
        <p>Atenciosamente,<br><b>Equipe Balcão e Bandeja</b></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

async function getPedidoById(req, res) {
  const { id } = req.params;

  try {
    const pedido = await Pedido.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email"],
        },
        {
          model: PedidoItem,
          as: "itens",
          attributes: ["id", "quantidade", "precoUnitario"],
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "valor"],
            },
          ],
        },
      ],
    });

    if (!pedido) return res.status(404).json({ message: "Pedido não encontrado" });

    res.json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar pedido" });
  }
}

async function getPedidosPaginated(req, res) {
  try {
    const { page = 1, limit = 10, status = "", search = "" } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      const { Op } = require("sequelize");
      whereClause[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { "$usuario.nome$": { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Pedido.findAndCountAll({
      where: whereClause,
      include: [{ model: Usuario, as: "usuario", attributes: ["id", "nome", "email"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      pedidos: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar pedidos" });
  }
}

// Clientes paginados e filtrados
async function getClientesPaginated(req, res) {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      const { Op } = require("sequelize");
      whereClause.nome = { [Op.like]: `%${search}%` };
    }

    const { rows, count } = await Usuario.findAndCountAll({
      where: whereClause,
      attributes: ["id", "nome", "cpf", "celular", "telefoneFixo", "sexo", "dataNascimento",
      "cep", "rua", "numero", "complemento", "referencia", "bairro",
      "cidade", "estado", "email", "senha"],
      order: [["nome", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      clientes: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar clientes" });
  }
}

// Buscar usuário por ID
async function getUsuarioById(req, res) {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ["senha"] }
    });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
}

// Criar usuário
async function createUsuario(req, res) {
  try {
    const {
      nome, cpf, celular, telefoneFixo, sexo, dataNascimento,
      cep, rua, numero, complemento, referencia, bairro,
      cidade, estado, email, senha, customer_asaas_id
    } = req.body;

    if (!nome || !cpf || !celular || !sexo || !dataNascimento || !email || !senha) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const hashSenha = await bcrypt.hash(senha, 10);

    const novoUsuario = await Usuario.create({
      nome, cpf, celular, telefoneFixo, sexo, dataNascimento,
      cep, rua, numero, complemento, referencia, bairro,
      cidade, estado, email, senha: hashSenha, customer_asaas_id
    });

    const { senha: _, ...usuarioData } = novoUsuario.toJSON();
    res.json({ success: true, usuario: usuarioData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
}

// Atualizar usuário
async function updateUsuario(req, res) {
  try {
    const { id } = req.params;
    const {
      nome, cpf, celular, telefoneFixo, sexo, dataNascimento,
      cep, rua, numero, complemento, referencia, bairro,
      cidade, estado, email, senha, customer_asaas_id
    } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

    let updateData = {
      nome, cpf, celular, telefoneFixo, sexo, dataNascimento,
      cep, rua, numero, complemento, referencia, bairro,
      cidade, estado, email, customer_asaas_id
    };

    if (senha) {
      updateData.senha = await bcrypt.hash(senha, 10);
    }

    await usuario.update(updateData);

    const { senha: _, ...usuarioData } = usuario.toJSON();
    res.json({ success: true, usuario: usuarioData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
}

// Deletar usuário
async function deleteUsuario(req, res) {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

    await usuario.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir usuário" });
  }
}

// Produtos paginados e filtrados
async function getProdutosPaginated(req, res) {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      const { Op } = require("sequelize");
      whereClause.nome = { [Op.like]: `%${search}%` };
    }

    const { rows, count } = await Produto.findAndCountAll({
      where: whereClause,
      attributes: ["id", "nome", "valor"],
      order: [["nome", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      produtos: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar produtos" });
  }
}

// Criar produto
async function createProduto(req, res) {
  try {
    const { nome, descricao, valor, estoque, imagem } = req.body;
    if (!nome || !valor) return res.status(400).json({ error: "Campos obrigatórios ausentes." });

    const novoProduto = await Produto.create({ nome, descricao, valor, estoque, imagem });
    res.json({ success: true, produto: novoProduto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar produto." });
  }
}

// Atualizar produto
async function updateProduto(req, res) {
  try {
    const { id } = req.params;
    const { nome, descricao, valor, estoque, imagem } = req.body;

    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ error: "Produto não encontrado." });

    await produto.update({ nome, descricao, valor, estoque, imagem });
    res.json({ success: true, produto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar produto." });
  }
}

// Deletar produto
async function deleteProduto(req, res) {
  try {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ error: "Produto não encontrado." });

    await produto.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir produto." });
  }
}

module.exports = {
  getDashboardCards,
  getRecentOrders,
  getMonthlySales,
  updateOrderStatus,
  getPedidoById,
  getPedidosPaginated,
  getClientesPaginated,
  getProdutosPaginated,
  createProduto,
  updateProduto,
  deleteProduto,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};
