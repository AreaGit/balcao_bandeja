const Cart = require("../models/cart.model");
const CartItem = require("../models/cartItem.model");
const Product = require("../models/product.model");
const { Op } = require("sequelize");
const Coupon = require("../models/cupom.model");

function toNumber(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

// ---- Função utilitária para formatar carrinho ----
async function formatCart(cartId) {
  const cart = await Cart.findByPk(cartId, {
    include: [
      {
        model: CartItem,
        as: "items",
        include: [{ model: Product, as: "product" }]
      }
    ]
  });

  if (!cart) return null;

  // Endereço e frete salvos no carrinho
  const endereco = cart.endereco
    ? (typeof cart.endereco === "string" ? JSON.parse(cart.endereco) : cart.endereco)
    : null;

  const freteObj = cart.frete
    ? (typeof cart.frete === "string" ? JSON.parse(cart.frete) : cart.frete)
    : null;

  const freteValor = freteObj ? toNumber(freteObj.custom_price ?? freteObj.price ?? 0) : 0;

  // Subtotal dos itens
  let subtotal = 0;
  const formattedItems = cart.items.map(item => {
    let precoUnitario = parseFloat(item.product.valor);

    // Se houver uma lona selecionada e ela tiver um preço específico, usamos esse preço
    if (item.lona && Array.isArray(item.product.lonas)) {
      const lonaConfig = item.product.lonas.find(l => l.nome === item.lona);
      if (lonaConfig && lonaConfig.preco > 0) {
        precoUnitario = parseFloat(lonaConfig.preco);
      }
    }

    const totalItem = precoUnitario * item.quantity;
    subtotal += totalItem;

    return {
      id: item.id,
      productId: item.product.id,
      nome: item.product.nome,
      descricao: item.product.descricao,
      imagem: Array.isArray(item.product.imagens) ? item.product.imagens[0] : null,
      precoUnitario,
      quantidade: item.quantity,
      cor: item.cor,
      lona: item.lona,
      arteUrl: item.arteUrl,
      totalItem
    };
  });

  // Desconto aplicado
  const desconto = toNumber(cart.discountValue || 0);

  // Frete grátis do cupom
  let isFreeShipping = false;
  if (cart.discountCode) {
    const coupon = await Coupon.findOne({ where: { code: cart.discountCode } });
    if (coupon?.is_free_shipping) isFreeShipping = true;
  }

  // Total final = subtotal - desconto + frete
  let totalFinal = subtotal - desconto + (isFreeShipping ? 0 : freteValor);
  if (totalFinal < 0) totalFinal = 0;

  return {
    id: cart.id,
    userId: cart.userId,
    guestId: cart.guestId,
    items: formattedItems,
    endereco,
    frete: freteObj,
    subtotal,
    desconto,
    totalFinal,
    isFreeShipping,
    cupom: cart.discountCode || null
  };
}


// ---- Controller Functions ----

// Criar ou buscar carrinho
async function createOrGetCart(req, res) {
  try {
    const { userId, guestId } = req.body;

    let cart = await Cart.findOne({
      where: userId ? { userId } : { guestId }
    });

    if (!cart) {
      cart = await Cart.create({ userId, guestId });
    }

    const formatted = await formatCart(cart.id);
    console.log(formatted);
    return res.json(formatted);
  } catch (err) {
    console.error("Erro ao buscar/criar carrinho:", err);
    res.status(500).json({ error: "Erro interno" });
  }
}

async function addItem(req, res) {
  try {
    const { cartId, productId, quantity, cor, lona, arteUrl } = req.body;

    if (!quantity || quantity <= 0)
      return res.status(400).json({ error: "Quantidade inválida" });

    const cart = await Cart.findByPk(cartId);
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado" });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });

    // 🔹 Se o produto tiver variações obrigatórias (exemplo: cores)
    if (product.variacoes && product.variacoes.includes("cor") && !cor) {
      return res.status(400).json({ error: "Selecione uma cor antes de adicionar o produto ao carrinho." });
    }

    let item = await CartItem.findOne({
      where: {
        cartId,
        productId,
        cor: cor || { [Op.is]: null },
        lona: lona || { [Op.is]: null }
      }
    });

    if (item) {
      item.quantity += quantity;
      await item.save();
    } else {
      item = await CartItem.create({ cartId, productId, quantity, cor, lona, arteUrl });
    }

    const formatted = await formatCart(cartId);
    console.log(formatted);
    return res.status(201).json(formatted);
  } catch (err) {
    console.error("Erro ao adicionar item:", err);
    res.status(500).json({ error: "Erro interno" });
  }
}

// Listar carrinho
async function getCart(req, res) {
  try {
    const { id } = req.params;
    const formatted = await formatCart(id);

    if (!formatted) return res.status(404).json({ error: "Carrinho não encontrado" });
    console.log(formatted);
    res.json(formatted);
  } catch (err) {
    console.error("Erro ao buscar carrinho:", err);
    res.status(500).json({ error: "Erro interno" });
  }
}

// Atualizar quantidade
async function updateItem(req, res) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const item = await CartItem.findByPk(itemId);
    if (!item) return res.status(404).json({ error: "Item não encontrado" });

    if (!quantity || quantity <= 0) {
      await item.destroy();
      const formatted = await formatCart(item.cartId);
      return res.json(formatted);
    }

    item.quantity = quantity;
    await item.save();

    const formatted = await formatCart(item.cartId);
    return res.json(formatted);
  } catch (err) {
    console.error("Erro ao atualizar item:", err);
    res.status(500).json({ error: "Erro interno" });
  }
}

// Atualizar frete
async function updateFrete(req, res) {
  try {
    const { cartId, frete } = req.body;
    const cart = await Cart.findByPk(cartId);
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado" });

    cart.frete = frete;
    cart.totalFinal = (cart.subtotal || 0) + frete;
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remover item
async function removeItem(req, res) {
  try {
    const { itemId } = req.params;

    const item = await CartItem.findByPk(itemId);
    if (!item) return res.status(404).json({ error: "Item não encontrado" });

    const cartId = item.cartId;
    await item.destroy();

    const cart = await Cart.findByPk(cartId, {
      include: [{ model: CartItem, as: "items" }]
    });

    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado" });

    // 🔹 Se o carrinho ficou vazio, limpa endereço e frete
    if (!cart.items || cart.items.length === 0) {
      await cart.update({
        endereco: null,
        frete: null
      });
    }

    const formatted = await formatCart(cartId);
    return res.json(formatted);

  } catch (err) {
    console.error("Erro ao remover item:", err);
    res.status(500).json({ error: "Erro interno" });
  }
}

// Aplicar cupom
async function applyCoupon(req, res) {
  try {
    const { id } = req.params; // id do carrinho
    const { code } = req.body; // código do cupom
    if (!code) return res.status(400).json({ error: "Nenhum código de cupom informado." });

    const cart = await Cart.findByPk(id, {
      include: [{ model: CartItem, as: "items", include: [{ model: Product, as: "product" }] }]
    });
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado." });

    // 🔹 Buscar cupom no banco
    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(),
        active: true,
        [Op.or]: [
          { expires_at: { [Op.is]: null } },
          { expires_at: { [Op.gt]: new Date() } }
        ]
      }
    });

    if (!coupon) {
      return res.status(404).json({ error: "Cupom inválido, inativo ou expirado." });
    }

    // 🔹 Calcular subtotal
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += parseFloat(item.product.valor) * item.quantity;
    });

    const desconto = subtotal * (parseFloat(coupon.discount_percent || 0) / 100);
    const frete = (cart.frete && !coupon.is_free_shipping) ? parseFloat(cart.frete.price || 0) : 0;
    const totalFinal = Math.max(subtotal - desconto + frete, 0);

    // 🔹 Atualizar carrinho com dados do cupom
    cart.discountCode = coupon.code;
    cart.discountValue = desconto;
    await cart.save();

    res.json({
      success: true,
      message: `Cupom "${coupon.code}" aplicado com sucesso!`,
      cupom: {
        code: coupon.code,
        descricao: coupon.description,
        percentual: coupon.discount_percent
      },
      subtotal,
      desconto,
      isFreeShipping: !!coupon.is_free_shipping,
      totalFinal
    });

  } catch (err) {
    console.error("Erro ao aplicar cupom:", err);
    res.status(500).json({ error: "Erro interno ao aplicar cupom." });
  }
}

module.exports = {
  createOrGetCart,
  addItem,
  getCart,
  updateItem,
  updateFrete,
  removeItem,
  applyCoupon
};