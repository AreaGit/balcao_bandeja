const path = require("path");
const Cart = require("../models/cart.model");
const CartItem = require("../models/cartItem.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");

const renderPage = (res, page) => {
  res.sendFile(path.join(__dirname, `../../public/html/${page}.html`));
};

// API inicial para frontend (home)
const inicial = async (req, res, next) => {
  try {
    // Identificação do usuário
    const userId = req.session.user?.id || null;
    let usuario;
    if(userId) {
      usuario = await User.findByPk(userId);
    }

    // Cria guestId se não existir
    if (!req.session.guestId) {
      req.session.guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
    }

    // Busca carrinho pelo userId (se logado) ou pelo guestId (se visitante)
    let cart = await Cart.findOne({
      where: userId 
        ? { userId } 
        : { guestId: req.session.guestId },
      include: [
        {
          model: CartItem,
          as: "cartItems",
          include: [{ model: Product, as: "product" }]
        }
      ]
    });

    // Se não existir carrinho, cria um
    if (!cart) {
      cart = await Cart.create({
        userId: userId || null,
        guestId: userId ? null : req.session.guestId
      });
    }

    // Debug
    console.log("Session guestId:", req.session.guestId);
    console.log("Cart guestId:", cart.guestId);
    console.log("Cart userId:", cart.userId);

    const cartItemsArray = cart.cartItems || [];

    const cartData = {
      id: cart.id,
      items: cartItemsArray.map(item => ({
        id: item.id,
        productId: item.productId,
        nome: item.product?.nome,
        imagem: item.product?.imagem1,
        precoUnitario: item.product?.valor,
        quantidade: item.quantity
      })),
      subtotal: cartItemsArray.reduce((sum, i) => sum + i.quantity * i.product.valor, 0),
      desconto: Number(cart.discountValue || 0),
      totalFinal: cartItemsArray.reduce((sum, i) => sum + i.quantity * i.product.valor, 0) - Number(cart.discountValue || 0)
    };

    return res.json({
      loggedIn: !!userId,
      user: userId 
        ? { id: userId, name: req.session.user.nome, email: req.session.user.email, usuario } 
        : null,
      guestId: req.session.guestId,
      cart: cartData
    });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  home: (req, res) => renderPage(res, "home"),
  categories: (req, res) => renderPage(res, "categories"),
  checkout: (req, res) => renderPage(res, "checkout"),
  detalhesProduto: (req, res) => renderPage(res, "detalhes-produto"),
  faleConosco: (req, res) => renderPage(res, "fale_conosco"),
  login: (req, res) => renderPage(res, "login"),
  politica: (req, res) => renderPage(res, "politica"),
  profile: (req, res) => renderPage(res, "profile"),
  recover: (req, res) => renderPage(res, "recover"),
  register: (req, res) => renderPage(res, "register"),
  reset: (req, res) => renderPage(res, "reset"),
  somos: (req, res) => renderPage(res, "somos"),
  troca: (req, res) => renderPage(res, "troca"),
  autenticacao: (req, res) => renderPage(res, "verify-2fa"),
  inicial,
  administrativo: (req, res) => renderPage(res, "administrativo"),
  pedido_confirmado: (req, res) => renderPage(res, "pedido-confirmado"),
  forgot_password: (req, res) => renderPage(res, "forgot-password"),
  reset_password: (req, res) => renderPage(res, "reset-password")
};