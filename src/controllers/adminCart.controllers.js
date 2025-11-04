const Cart = require("../models/cart.model");
const CartItem = require("../models/cartItem.model");
const Product = require("../models/product.model");
const Coupon = require("../models/cupom.model");
const Usuario = require("../models/user.model");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");

// Reaproveita a função formatCart do seu controller de carrinho
const { formatCart } = require("./cart.controllers");

// 📋 Listar todos os carrinhos
async function getAllCarts(req, res) {
  try {
    const carts = await Cart.findAll({
      include: [{ model: CartItem, as: "cartItems", include: [{ model: Product, as: "product" }] }],
      order: [["updatedAt", "DESC"]]
    });

    res.json(carts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar carrinhos." });
  }
}

// 🔍 Ver detalhes de um carrinho
async function getCartById(req, res) {
  try {
    const { id } = req.params;
    const cart = await formatCart(id);
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado." });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar carrinho." });
  }
}

// ➕ Adicionar item manualmente
async function addItemToCart(req, res) {
  try {
    const { id } = req.params;
    const { productId, quantity = 1, cor } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    const cart = await Cart.findByPk(id);
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado." });

    const existing = await CartItem.findOne({ where: { cartId: id, productId, cor: cor || null } });
    if (existing) {
      existing.quantity += quantity;
      await existing.save();
    } else {
      await CartItem.create({ cartId: id, productId, quantity, cor });
    }

    const updated = await formatCart(id);
    res.json({ success: true, message: "Item adicionado ao carrinho.", cart: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao adicionar item." });
  }
}

// 🗑️ Remover item
async function removeItemFromCart(req, res) {
  try {
    const { id, itemId } = req.params;
    const item = await CartItem.findByPk(itemId);
    if (!item) return res.status(404).json({ error: "Item não encontrado." });

    await item.destroy();
    const updated = await formatCart(id);
    res.json({ success: true, message: "Item removido do carrinho.", cart: updated });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover item." });
  }
}

// 🎟️ Aplicar cupom manualmente
async function applyCouponAdmin(req, res) {
  try {
    const { id } = req.params;
    const { code } = req.body;

    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(),
        active: true,
        [Op.or]: [{ expires_at: { [Op.is]: null } }, { expires_at: { [Op.gt]: new Date() } }]
      }
    });

    if (!coupon) return res.status(404).json({ error: "Cupom inválido." });

    const cart = await Cart.findByPk(id, { include: [{ model: CartItem, as: "cartItems", include: [{ model: Product, as: "product" }] }] });

    let subtotal = 0;
    cart.cartItems.forEach(i => subtotal += parseFloat(i.product.valor) * i.quantity);
    const desconto = subtotal * (coupon.discount_percent / 100);
    cart.discountCode = coupon.code;
    cart.discountValue = desconto;
    await cart.save();

    const updated = await formatCart(id);
    res.json({ success: true, message: `Cupom "${coupon.code}" aplicado.`, cart: updated });
  } catch (err) {
    res.status(500).json({ error: "Erro ao aplicar cupom." });
  }
}

// 💬 Enviar mensagem de carrinho abandonado
async function sendAbandonedCartMessage(req, res) {
  try {
    const { id } = req.params;
    const { email, nome } = req.body;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const cart = await formatCart(id);
    if (!cart || !email) return res.status(400).json({ error: "Carrinho ou e-mail inválido." });

    const produtos = cart.items.map(i => `<li>${i.nome} - R$${i.precoUnitario.toFixed(2)} x ${i.quantidade}</li>`).join("");

    await transporter.sendMail({
      from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Você esqueceu seus produtos no carrinho 🛒",
      html: `
        <div style="font-family: Arial; color:#fff; background:#1E1939; padding:20px; border-radius:12px;">
          <h2 style="color:#E7FF14;">Olá, ${nome || "cliente"}!</h2>
          <p>Percebemos que você deixou alguns produtos no carrinho:</p>
          <ul>${produtos}</ul>
          <p>Finalize sua compra antes que os itens acabem! 💛</p>
          <a href="https://balcaoebandeja.com.br/carrinho/${cart.id}" 
             style="display:inline-block; margin-top:20px; padding:12px 24px; 
             background:#E7FF14; color:#1E1939; text-decoration:none; font-weight:bold; border-radius:8px;">
             Voltar para o carrinho
          </a>
        </div>`
    });

    res.json({ success: true, message: "Mensagem de carrinho abandonado enviada com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar mensagem de carrinho abandonado." });
  }
}

// helper: carrinho formatado (reaproveita lógica próxima da sua formatCart)
async function formatCartAdmin(cart) {
  const frete = cart.frete
    ? (typeof cart.frete === "string" ? JSON.parse(cart.frete) : cart.frete)
    : null;

  let subtotal = 0;

  const items = (cart.cartItems || []).map(it => {
    const price = parseFloat(it.product?.valor || 0);
    const totalItem = price * (it.quantity || 0);
    subtotal += totalItem;
    return {
      id: it.id,
      productId: it.productId,
      nome: it.product?.nome || "Produto",
      precoUnitario: price,
      quantidade: it.quantity,
      cor: it.cor,
      totalItem
    };
  });

  const desconto = Number(cart.discountValue || 0);
  const freteValor = Number(frete?.custom_price ?? frete?.price ?? 0);
  const totalFinal = Math.max(subtotal - desconto + freteValor, 0);

  // 🔍 Buscar usuário, se ainda não vier no include
  let userData = null;

  if (cart.usuarios) {
    // veio pelo include
    userData = {
      id: cart.usuarios.id,
      nome: cart.usuarios.nome,
      email: cart.usuarios.email
    };
  } else if (!cart.guestId && cart.userId) {
    // busca manual caso não tenha vindo no include
    const user = await Usuario.findByPk(cart.userId, {
      attributes: ["id", "nome", "email"]
    });
    if (user) {
      userData = {
        id: user.id,
        nome: user.nome,
        email: user.email
      };
    }
  }

  return {
    id: cart.id,
    userId: cart.userId,
    guestId: cart.guestId,
    user: userData, // agora sempre tenta preencher o nome e email
    items,
    frete,
    subtotal,
    desconto,
    totalFinal,
    cupom: cart.discountCode || null,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt
  };
}

// GET /api/admin/carrinhos/paginados
async function getCartsPaginated(req, res) {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    // search por id, userId, guestId; e também por email/nome (via include)
    const include = [
      { model: CartItem, as: "cartItems", include: [{ model: Product, as: "product" }] },
      { model: Usuario, as: "usuarios", attributes: ["id", "nome", "email"] }
    ];

    // filtragem por abandonado/ativo será feita pós-busca (pela regra de 24h)
    if (search) {
      include[1].where = {
        [Op.or]: [
          { nome: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
      include[1].required = false;
      // busca básica também em id/userId/guestId
      where[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { userId: { [Op.like]: `%${search}%` } },
        { guestId: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Cart.findAndCountAll({
      where,
      include: [
        {
          model: CartItem,
          as: "cartItems",
          include: [{ model: Product, as: "product" }]
        },
        {
          model: Usuario,
          as: "usuarios", // usa o alias que já está no model
          attributes: ["id", "nome", "email"]
        }
      ],
      order: [["updatedAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // mapeia + filtra por status (se vier)
    let mapped = await Promise.all(rows.map(formatCartAdmin));
    if (status === "abandonados") {
      mapped = mapped.filter(c => {
        const diffH = (Date.now() - new Date(c.updatedAt).getTime()) / 36e5;
        return (c.items?.length || 0) > 0 && diffH >= 24;
      });
    } else if (status === "ativos") {
      mapped = mapped.filter(c => {
        const diffH = (Date.now() - new Date(c.updatedAt).getTime()) / 36e5;
        return !(c.items?.length || 0) ? false : diffH < 24;
      });
    }

    res.json({
      carrinhos: mapped,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar carrinhos" });
  }
}

// POST /api/admin/carrinhos/:id/lembrar
async function remindCartByEmail(req, res) {
  try {
    const { id } = req.params;
    const cart = await Cart.findByPk(id, {
      include: [
        { model: CartItem, as: "cartItems", include: [{ model: Product, as: "product" }] },
        { model: Usuario, as: "usuarios", attributes: ["id", "nome", "email"] }
      ]
    });
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado" });

    const userEmail = cart.usuarios?.email;
    if (!userEmail) return res.status(400).json({ error: "Carrinho sem e-mail de usuário" });

    const formatted = await formatCartAdmin(cart);
    await sendAbandonedEmail(userEmail, cart.usuarios?.nome || "cliente", formatted);
    res.json({ success: true, sent: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar lembrete" });
  }
}

// POST /api/admin/carrinhos/lembrar-abandonados
async function remindAllAbandoned(_req, res) {
  try {
    const since = new Date(Date.now() - 24*60*60*1000);
    const rows = await Cart.findAll({
      include: [
        { model: CartItem, as: "cartItems", include: [{ model: Product, as: "product" }] },
        { model: Usuario, as: "usuarios", attributes: ["id", "nome", "email"] }
      ],
      where: { updatedAt: { [Op.lt]: since } },
      order: [["updatedAt", "DESC"]]
    });

    let sent = 0;
    for (const cart of rows) {
      if (!cart.usuarios?.email) continue;
      if (!cart.cartItems?.length) continue;
      const formatted = await formatCartAdmin(cart);
      await sendAbandonedEmail(cart.usuarios.email, cart.usuarios?.nome || "cliente", formatted);
      sent++;
    }

    res.json({ success: true, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao disparar lembretes" });
  }
}

async function sendAbandonedEmail(to, nomeCliente, cart) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const itensHTML = (cart.items || []).map(i => `
    <tr>
      <td>${i.nome} ${i.cor ? `(${i.cor})` : ""}</td>
      <td>${i.quantidade}</td>
      <td>${Number(i.precoUnitario).toFixed(2)}</td>
      <td>${Number(i.totalItem).toFixed(2)}</td>
    </tr>
  `).join("");

  const mailOptions = {
    from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
    to,
    subject: `Você esqueceu algo no carrinho 🛒`,
    html: `
      <div style="font-family:Montserrat,Arial,sans-serif;padding:24px;background:#0b0c14;color:#e8e9f0">
        <h2 style="color:#E7FF14;margin:0 0 12px">Olá, ${nomeCliente}!</h2>
        <p>Notamos que você deixou alguns itens no carrinho. Que tal finalizar sua compra?</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#131425">
          <thead>
            <tr style="background:#171833">
              <th style="padding:10px;text-align:left">Produto</th>
              <th style="padding:10px;text-align:left">Qtd</th>
              <th style="padding:10px;text-align:left">Preço</th>
              <th style="padding:10px;text-align:left">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itensHTML}</tbody>
        </table>
        <p><strong>Total:</strong> ${cart.totalFinal.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p>
        <p style="margin-top:16px">Se precisar de ajuda, estamos à disposição.</p>
        <p style="margin:0">Equipe <b>Balcão e Bandeja</b></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  getAllCarts,
  getCartById,
  addItemToCart,
  removeItemFromCart,
  applyCouponAdmin,
  sendAbandonedCartMessage,
  getCartsPaginated,
  remindCartByEmail,
  remindAllAbandoned
};
