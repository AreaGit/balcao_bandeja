const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const OrderAddress = require("../models/orderAddress.model");
const OrderShipping = require("../models/orderShipping.model");
const Cart = require("../models/cart.model");
const CartItem = require("../models/cartItem.model");
const Product = require("../models/product.model");

async function createOrder(req, res) {
  try {
    const { userId, guestId, address, shipping, cartId } = req.body;

    // 1. Buscar carrinho
    const cart = await Cart.findByPk(cartId, {
      include: [{ model: CartItem, as: "items", include: [{ model: Product, as: "product" }] }]
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Carrinho vazio ou não encontrado." });
    }

    // 2. Calcular total
    const subtotal = cart.items.reduce((sum, item) => {
      const valorProduto = item.product.valorPromocional || item.product.valor;
      return sum + parseFloat(valorProduto) * item.quantity;
    }, 0);

    const total = subtotal + parseFloat(shipping.price);

    // 3. Criar pedido
    const order = await Order.create({
      userId,
      guestId,
      total,
      status: "pending"
    });

    // 4. Criar itens
    for (const item of cart.items) {
      const valorProduto = item.product.valorPromocional || item.product.valor;
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: valorProduto
      });
    }

    // 5. Criar endereço
    await OrderAddress.create({
      orderId: order.id,
      ...address
    });

    // 6. Criar frete
    await OrderShipping.create({
      orderId: order.id,
      company: shipping.company,
      service: shipping.service,
      price: shipping.price,
      prazo: shipping.prazo
    });

    // (Opcional) Limpar carrinho após fechar pedido
    await CartItem.destroy({ where: { cartId } });

    res.status(201).json({ message: "Pedido criado com sucesso!", orderId: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar pedido", error: err.message });
  }
}

async function getOrders(req, res) {
  try {
    const orders = await Order.findAll({
      include: [
        { model: OrderItem, as: "itens", include: [{ model: Product, as: "produto" }] },
        { model: OrderAddress, as: "endereco" },
        { model: OrderShipping, as: "frete" }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar pedidos", error: err.message });
  }
}

async function getOrderById(req, res) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: "itens", include: [{ model: Product, as: "produto" }] },
        { model: OrderAddress, as: "endereco" },
        { model: OrderShipping, as: "frete" }
      ]
    });

    if (!order) return res.status(404).json({ message: "Pedido não encontrado" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar pedido", error: err.message });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) return res.status(404).json({ message: "Pedido não encontrado" });

    order.status = status;
    await order.save();

    res.json({ message: "Status atualizado com sucesso", order });
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar pedido", error: err.message });
  }
}

async function deleteOrder(req, res) {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) return res.status(404).json({ message: "Pedido não encontrado" });

    await order.destroy();

    res.json({ message: "Pedido excluído com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao excluir pedido", error: err.message });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder
};