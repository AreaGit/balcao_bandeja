const Pedido = require("../models/pedido.js");
const PedidoItem = require("../models/pedidoItem.model.js");
const Produto = require("../models/product.model.js");
const Usuario = require("../models/user.model.js");
const Coupon = require("../models/cupom.model.js");
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
    let data = { ...req.body };

    // Função utilitária para normalizar campos JSON/array
    const normalizeArrayField = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // caso seja string simples (como "http://imagem.png" ou "AZUL")
          return val.includes("http") ? [val] : val.split(",").map(v => v.trim()).filter(Boolean);
        }
      }
      return [];
    };

    // Normalizar campos que podem vir como string JSON
    if (data.imagens) data.imagens = normalizeArrayField(data.imagens);
    if (data.cores) data.cores = normalizeArrayField(data.cores);

    // Criar produto
    const produto = await Produto.create(data);

    res.json({ success: true, produto });
  } catch (err) {
    console.error("Erro ao criar produto:", err);
    res.status(500).json({ error: "Erro ao criar produto." });
  }
}

// Atualizar produto
async function updateProduto(req, res) {
  try {
    const { id } = req.params;
    let data = { ...req.body };

    const produto = await Produto.findByPk(id);
    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    // 🔧 Função utilitária para normalizar campos JSON
    const normalizeArrayField = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // caso seja string simples (URL única, por exemplo)
          return val.includes("http") ? [val] : [];
        }
      }
      return [];
    };

    // Normalizar os campos JSON antes de salvar
    if (data.imagens) data.imagens = normalizeArrayField(data.imagens);
    if (data.cores) data.cores = normalizeArrayField(data.cores);

    // Atualizar no banco
    await produto.update(data);

    // 🔁 Retornar o produto atualizado (já com arrays válidos)
    res.json({ success: true, produto: await Produto.findByPk(id) });

  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({ error: "Erro ao atualizar produto." });
  }
};

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

// === CRUD DE CUPONS ===

// Paginação de cupons
async function getCuponsPaginated(req, res) {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;
    const { Op } = require("sequelize");

    const where = search ? {
      [Op.or]: [
        { code: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { rows, count } = await Coupon.findAndCountAll({
      where,
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      cupons: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar cupons" });
  }
}

// Criar cupom
async function createCoupon(req, res) {
  try {
    const { code, description, discount_percent, expires_at, active, is_free_shipping } = req.body;

    if (!code || (discount_percent === undefined && !is_free_shipping))
      return res.status(400).json({ error: "Código e percentual ou frete grátis são obrigatórios" });

    const existing = await Coupon.findOne({ where: { code } });
    if (existing)
      return res.status(400).json({ error: "Já existe um cupom com esse código" });

    const coupon = await Coupon.create({
      code,
      description,
      discount_percent: discount_percent || 0,
      is_free_shipping: is_free_shipping ?? false,
      expires_at: expires_at || null,
      active: active ?? true
    });

    res.json({ success: true, coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar cupom" });
  }
}

// Atualizar cupom
async function updateCoupon(req, res) {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ error: "Cupom não encontrado" });

    await coupon.update(req.body);
    res.json({ success: true, coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar cupom" });
  }
}

// Excluir cupom
async function deleteCoupon(req, res) {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ error: "Cupom não encontrado" });

    await coupon.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir cupom" });
  }
}

// === BALANÇO FINANCEIRO ===
async function getFinancialBalance(req, res) {
  try {
    const Pedido = require("../models/pedido.js");
    const { Op } = require("sequelize");

    // Últimos 12 meses
    const meses = [];
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        label: d.toLocaleDateString("pt-BR", { month: "short" }),
        inicio: d,
        fim: new Date(d.getFullYear(), d.getMonth() + 1, 0)
      });
    }

    const data = [];
    for (const mes of meses) {
      const totalVendas = await Pedido.sum("total", {
        where: { createdAt: { [Op.between]: [mes.inicio, mes.fim] } }
      }) || 0;
      const custos = totalVendas * 0.6; // exemplo
      const lucro = totalVendas - custos;

      data.push({
        mes: mes.label,
        vendas: totalVendas.toFixed(2),
        custos: custos.toFixed(2),
        lucro: lucro.toFixed(2)
      });
    }

    const totalVendasAno = data.reduce((sum, m) => sum + parseFloat(m.vendas), 0);
    const totalLucroAno = data.reduce((sum, m) => sum + parseFloat(m.lucro), 0);
    const margemMedia = totalVendasAno ? (totalLucroAno / totalVendasAno) * 100 : 0;

    let crescimento = 0;
    if (data.length > 1) {
      const penultimo = parseFloat(data[data.length - 2].lucro);
      const ultimo = parseFloat(data[data.length - 1].lucro);
      crescimento = penultimo ? ((ultimo - penultimo) / penultimo) * 100 : 0;
    }


    res.json({
      meses: data,
      resumo: {
        totalVendasAno,
        totalLucroAno,
        margemMedia,
        crescimento
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar balanço financeiro" });
  }
}

async function getIndicadoresGerais(req, res) {
  try {
    const Pedido = require("../models/pedido.js");
    const Produto = require("../models/product.model.js");
    const Usuario = require("../models/user.model.js");
    const Cart = require("../models/cart.model.js");
    const Newsletter = require("../models/newsletter.model.js");
    const { Op } = require("sequelize");

    const agora = new Date();
    const mesPassado = new Date();
    mesPassado.setMonth(agora.getMonth() - 1);

    // === PEDIDOS ===
    const totalPedidos = await Pedido.count();
    const pedidosPagos = await Pedido.count({ where: { status: "PAGO" } });
    const pedidosCancelados = await Pedido.count({ where: { status: "Cancelado" } });
    const vendasTotais = await Pedido.sum("total") || 0;

    // Ticket médio
    const ticketMedio = totalPedidos ? vendasTotais / totalPedidos : 0;

    // === CLIENTES ===
    const totalClientes = await Usuario.count();
    const novosClientes = await Usuario.count({
      where: { createdAt: { [Op.gte]: mesPassado } }
    });

    // === PRODUTOS ===
    const totalProdutos = await Produto.count();
    const produtosComEstoqueBaixo = await Produto.count({
      where: { estoque: { [Op.lte]: 5 } }
    });

    // === CARRINHOS ===
    const totalCarrinhos = await Cart.count();
    const carrinhosAtivos = await Cart.count({ where: { frete: { [Op.not]: null } } });
    const carrinhosAbandonados = totalCarrinhos - carrinhosAtivos;

    // === NEWSLETTER ===
    const totalNewsletter = await Newsletter.count();
    const novosInscritos = await Newsletter.count({
      where: { createdAt: { [Op.gte]: mesPassado } }
    });

    res.json({
      pedidos: {
        total: totalPedidos,
        pagos: pedidosPagos,
        cancelados: pedidosCancelados,
        ticketMedio,
        vendasTotais
      },
      clientes: {
        total: totalClientes,
        novos: novosClientes
      },
      produtos: {
        total: totalProdutos,
        baixoEstoque: produtosComEstoqueBaixo
      },
      carrinhos: {
        total: totalCarrinhos,
        ativos: carrinhosAtivos,
        abandonados: carrinhosAbandonados
      },
      newsletter: {
        total: totalNewsletter,
        novos: novosInscritos
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar indicadores." });
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
  deleteUsuario,
  getCuponsPaginated,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getFinancialBalance,
  getIndicadoresGerais
};
