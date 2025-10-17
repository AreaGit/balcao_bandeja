const Cart = require("../models/cart.model");
const CartItem = require("../models/cartItem.model");
const User = require("../models/user.model");
const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const OrderAddress = require("../models/orderAddress.model");
const OrderShipping = require("../models/orderShipping.model");
const Pedido = require("../models/pedido");
const PedidoItem = require("../models/pedidoItem.model");
const sequelize = require("../config/database");
const Product = require("../models/product.model");
const { enviarEmail } = require("../utils/email");
const { cobrancaPixAsaas, obterCodPix, cobrancaBoletoAsaas, obterLinhaBoleto, cobrancaCartaoAsaas } = require("../services/asaas.services");


async function formatCart(cartId) {
  const cart = await Cart.findByPk(cartId, { include: [{ model: CartItem, as: "items" }] });
  if (!cart) return null;

  const totalFinal = cart.items.reduce((sum, item) => sum + item.precoUnitario * item.quantidade, 0);

  return {
    id: cart.id,
    items: cart.items,
    totalFinal
  };
}

/*exports.getCart = async (req, res) => {
  try {
    const { userId, guestId } = req.body;

    let cart = await Cart.findOne({
      where: userId ? { userId } : { guestId }
    });

    if (!cart) {
      cart = await Cart.create({ userId, guestId });
    }

    const formatted = await formatCart(cart.id);
    return res.json(formatted);
  } catch (err) {
    console.error("Erro ao buscar/criar carrinho:", err);
    res.status(500).json({ error: "Erro interno" });
  }
};*/

exports.getCart = async (req, res) => {
  try {
    const userId = req.session.user?.id || null;
    const guestId = req.session.guestId || null;

    const cart = await Cart.findOne({
      where: userId ? { userId } : { guestId },
      include: [{ model: CartItem, as: "items" }]
    });

    if (!cart) return res.json({ items: [], subtotal: 0, frete: null, totalFinal: 0 });

    // calcula subtotal dos itens
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += parseFloat(item.preco) * item.quantidade;
    });

    // pega o frete salvo no carrinho (se tiver)
    let frete = cart.frete ? JSON.parse(cart.frete) : null;
    let freteValor = frete?.custom_price ? parseFloat(frete.custom_price) : 0;

    // total final = subtotal + frete
    const totalFinal = subtotal + freteValor;

    res.json({
      id: cart.id,
      userId: cart.userId,
      guestId: cart.guestId,
      items: cart.items,
      endereco: cart.endereco ? JSON.parse(cart.endereco) : null,
      frete,
      subtotal,
      totalFinal
    });

  } catch (err) {
    console.error("Erro ao buscar carrinho:", err);
    res.status(500).json({ error: "Erro ao buscar carrinho" });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.json({});
    const user = await User.findByPk(userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveUserData = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const data = req.body;
    await User.update(data, { where: { id: userId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveAddressFreteCart = async (req, res) => {
  try {
    const { cartId, endereco, frete } = req.body;

    if (!cartId) return res.status(400).json({ error: "cartId não fornecido" });

    const cart = await Cart.findByPk(cartId);
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado" });

    await cart.update({
      endereco: JSON.stringify(endereco),
      frete: JSON.stringify(frete)
    });

    console.log(cart);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.saveAddressFrete = async (req, res) => {
  try {
    const { endereco, frete, orderId } = req.body;

    if (!orderId) return res.status(400).json({ error: "Order ID não fornecido" });

    // Salvar endereço
    await OrderAddress.create({
      orderId,
      nome: endereco.nome,
      email: endereco.email,
      telefone: endereco.telefone,
      endereco: endereco.endereco,
      cidade: endereco.cidade,
      estado: endereco.estado,
      cep: endereco.cep
    });

    // Salvar frete
    await OrderShipping.create({
      orderId,
      company: frete.company?.name || "",
      service: frete.name || "",
      price: frete.price || 0,
      delivery_time: frete.delivery_time || 0,
      dados: JSON.stringify(frete)
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  res.json([
    { id: "credit_card", name: "Cartão de Crédito" },
    { id: "pix", name: "PIX" },
    { id: "boleto", name: "Boleto Bancário" }
  ]);
};

exports.createOrder = async (req, res) => {
  try {
    const { paymentMethod, endereco, frete } = req.body;
    const cartId = req.session.cartId;

    if (!cartId) return res.status(400).json({ error: "Carrinho não encontrado" });

    // Criação do pedido
    const order = await require("../models/order.model").create({
      paymentMethod,
      cartId,
      endereco,
      frete
    });

    res.json({ orderId: order.id, paymentMethod });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrderSummary = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await require("../models/order.model").findByPk(orderId, {
      include: [
        { model: require("../models/orderItem.model"), as: "items" },
        { model: require("../models/orderAddress.model"), as: "address" },
        { model: require("../models/orderShipping.model"), as: "shipping" }
      ]
    });

    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.gerarPix = async (req, res) => {
  try {
    const { usuarioId, total, endereco, frete, itens } = req.body;

    if (!usuarioId || !total || !endereco || !frete || !itens)
      return res.status(400).json({ error: "Dados incompletos" });

    const cliente = await User.findOne({ where: { id: usuarioId } });
    if (!cliente || !cliente.customer_asaas_id)
      return res.status(404).json({ error: "Cliente não encontrado no Asaas" });

    const externalReference = "pedido_temp_" + Date.now();

    const pedidoRef = Date.now().toString(); // ou ID temporário
    const cobranca = await cobrancaPixAsaas({
      customer: cliente.customer_asaas_id,
      value: total,
      dueDate: new Date().toISOString().split("T")[0],
      externalReference: externalReference,
      endereco,
      frete,
      itens
    });

    // Obter QR Code PIX
    const qrCode = await obterCodPix(cobranca.id);

    return res.json({
      paymentId: cobranca.id, // alterado para alinhar com o frontend
      valor: cobranca.value,
      qrCodeImageUrl: qrCode?.encodedImage,
      qrCodeText: qrCode?.payload || qrCode?.payloadContent,
      externalReference
    });
  } catch (err) {
    console.error("Erro ao gerar PIX:", err.response?.data || err.message);
    res.status(500).json({ error: "Erro ao gerar cobrança PIX" });
  }
};

exports.gerarBoleto = async (req, res) => {
  try {
    const { usuarioId, total, endereco, frete, itens } = req.body;

    if (!usuarioId || !total || !endereco || !frete || !itens || !itens.length)
      return res.status(400).json({ error: "Dados incompletos." });

    const cliente = await User.findByPk(usuarioId);
    if (!cliente || !cliente.customer_asaas_id)
      return res.status(404).json({ error: "Cliente não encontrado no ASAAS." });

    // === Criar cobrança no Asaas ===
    const externalReference = "pedido_" + Date.now();

    const cobranca = await cobrancaBoletoAsaas({
      customer: cliente.customer_asaas_id,
      value: total,
      dueDate: new Date().toISOString().split("T")[0]
    });

    const linhaDigitavel = await obterLinhaBoleto(cobranca.id);

    // === Criar pedido preenchendo todas as colunas ===
    const pedido = await Pedido.create({
      usuarioId,
      endereco: JSON.stringify(endereco),
      frete: JSON.stringify(frete),
      formaPagamento: "BOLETO",
      total: Number(total).toFixed(2),
      status: "AGUARDANDO PAGAMENTO",
      paymentId: cobranca.id,
      paymentStatus: cobranca.status || "PENDING",
      paymentType: "BOLETO",
      paymentDate: null,
      externalReference,
      qrCodePayload: null,
      qrCodeImage: null
    });

    // === Criar os itens do pedido ===
    for (const item of itens) {
      console.log(item);
      await PedidoItem.create({
        pedidoId: pedido.id,
        produtoId: item.productId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        cor: item.cor || null
      });
    }

    // === Limpar carrinho do usuário ===
    const cart = await Cart.findOne({ where: { userId: usuarioId } });
    if (cart) {
      await CartItem.destroy({ where: { cartId: cart.id } });
      await Cart.destroy({ where: { id: cart.id } });
    }

    // === Enviar e-mail de aviso ===
    try {
      await enviarEmail(
        cliente.email,
        "🎉 Pedido gerado com sucesso!",
        `
          <h2>Olá, ${cliente.nome}!</h2>
          <p>Seu pedido <strong>#${pedido.id}</strong> foi criado com sucesso e está aguardando o pagamento do boleto.</p>
          <p>Baixe seu boleto clicando no link abaixo:</p>
          <p><a href="${cobranca.bankSlipUrl}" target="_blank">Visualizar boleto</a></p>
          <p>Após o pagamento, o status do seu pedido será atualizado automaticamente.</p>
          <br>
          <p>Obrigado por comprar conosco! 💚</p>
          <p><strong>Equipe Balcão e Bandeja</strong></p>
        `
      );
    } catch (emailErr) {
      console.warn("Erro ao enviar e-mail:", emailErr.message);
    }

    // === Retorno para o frontend ===
    res.status(200).json({
      pedidoId: pedido.id,
      paymentId: cobranca.id,
      valor: cobranca.value,
      boletoUrl: cobranca.bankSlipUrl,
      linhaDigitavel: linhaDigitavel.identificationField,
      vencimento: cobranca.dueDate,
      status: cobranca.status
    });
  } catch (error) {
    console.error("Erro ao gerar boleto:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao gerar boleto." });
  }
};

exports.gerarCartao = async (req, res) => {
  try {
    const { usuarioId, total, endereco, frete, cartao } = req.body;

    if (!usuarioId || !total || !endereco || !frete || !cartao)
      return res.status(400).json({ error: "Dados incompletos" });

    const cliente = await User.findByPk(usuarioId);
    if (!cliente || !cliente.customer_asaas_id)
      return res.status(404).json({ error: "Cliente não encontrado no Asaas" });

    const cobranca = await cobrancaCartaoAsaas({
      customer: cliente.customer_asaas_id,
      value: total,
      holderName: cartao.holderName,
      number: cartao.number,
      expiryMonth: cartao.expiryMonth,
      expiryYear: cartao.expiryYear,
      ccv: cartao.ccv,
      email: cliente.email,
      cpfCnpj: cliente.cpf,
      postalCode: endereco.cep,
      addressNumber: endereco.numero,
      addressComplement: endereco.complemento,
      phone: cliente.telefone
    });

    res.status(200).json({
      paymentId: cobranca.id,
      status: cobranca.status,
      value: cobranca.value
    });
  } catch (error) {
    console.error("Erro ao gerar pagamento cartão:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao processar pagamento com cartão" });
  }
};

exports.finalizarPedido = async (req, res) => {
  const t = await sequelize.transaction();
  let novoPedido, usuario;

  try {
    let {
      usuarioId,
      endereco,
      frete,
      formaPagamento,
      total,
      itens,
      paymentId,
      paymentStatus,
      qrCodePayload,
      qrCodeImage
    } = req.body;

    if (!usuarioId || !endereco || !frete || !formaPagamento || !total || !itens || itens.length === 0) {
      return res.status(400).json({ error: "Dados incompletos para finalizar pedido" });
    }

    if(formaPagamento == "PIX") {
      descontoPix = total * 0.03;
      total -= descontoPix;
    }

    novoPedido = await Pedido.create({
      usuarioId,
      endereco: JSON.stringify(endereco),
      frete: JSON.stringify(frete),
      formaPagamento,
      total,
      status: "PAGO",
      paymentId: paymentId || null,
      paymentStatus: paymentStatus || null,
      paymentDate: new Date(),
      paymentType: formaPagamento.toUpperCase(),
      externalReference: `${formaPagamento.toLowerCase()}_${Date.now()}`,
      qrCodePayload: qrCodePayload || null,
      qrCodeImage: qrCodeImage || null
    }, { transaction: t });

    for (const item of itens) {
      if (!item.produtoId || !item.quantidade || !item.precoUnitario) {
        await t.rollback();
        return res.status(400).json({ error: "Itens do pedido incompletos" });
      }

      await PedidoItem.create({
        pedidoId: novoPedido.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        cor: item.cor || null
      }, { transaction: t });
    }

    const cart = await Cart.findOne({ where: { userId: usuarioId }, transaction: t });
    if (cart) {
      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
      await Cart.destroy({ where: { id: cart.id }, transaction: t });
    }

    await t.commit();

    usuario = await User.findByPk(usuarioId);

  } catch (error) {
    await t.rollback();
    console.error("Erro ao finalizar pedido:", error);
    return res.status(400).json({ error: error.message });
  }

  try {
    if (usuario && usuario.email) {
      await enviarEmail(
        usuario.email,
        "🎉 Pedido confirmado!",
        `
          <h2>Olá ${usuario.nome},</h2>
          <p>Seu pedido <strong>#${novoPedido.id}</strong> foi criado com sucesso!</p>
          <p>Em breve você receberá mais detalhes sobre o status do seu pedido.</p>
          <br>
          <p>Obrigado por comprar conosco!</p>
          <p><strong>Equipe Balcão e Bandeja</strong></p>
        `
      );
    }
  } catch (emailError) {
    console.error("Erro ao enviar e-mail:", emailError);
  }

  return res.status(201).json({
    message: "Pedido finalizado com sucesso",
    pedidoId: novoPedido.id
  });
};

module.exports = exports;