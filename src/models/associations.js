const Cart = require("./cart.model");
const CartItem = require("./cartItem.model");
const Order = require("./order.model");
const OrderItem = require("./orderItem.model");
const OrderAddress = require("./orderAddress.model");
const OrderShipping = require("./orderShipping.model");
const Usuario = require("./user.model");
const Pedido = require('./pedido');
const PedidoItem = require("./pedidoItem.model");
const Produto = require("./product.model");

// Agora podemos criar a associação Cart ↔ CartItem
Cart.hasMany(CartItem, { foreignKey: "cartId", as: "items", onDelete: "CASCADE" });
CartItem.belongsTo(Cart, { foreignKey: "cartId", as: "cart" });

// Pedido ↔ Itens
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

// Pedido ↔ Endereço
Order.hasOne(OrderAddress, { foreignKey: "orderId", as: "address", onDelete: "CASCADE" });
OrderAddress.belongsTo(Order, { foreignKey: "orderId", as: "order" });

// Pedido ↔ Frete
Order.hasOne(OrderShipping, { foreignKey: "orderId", as: "shipping", onDelete: "CASCADE" });
OrderShipping.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Usuario.hasMany(Pedido, { as: "pedidos", foreignKey: "usuarioId" });
Pedido.belongsTo(Usuario, { as: "usuario", foreignKey: "usuarioId" });

Pedido.hasMany(PedidoItem, { as: "itens", foreignKey: "pedidoId" });
PedidoItem.belongsTo(Pedido, { as: "pedido", foreignKey: "pedidoId" });

PedidoItem.belongsTo(Produto, { as: "produto", foreignKey: "produtoId" });
Produto.hasMany(PedidoItem, { as: "pedidoItens", foreignKey: "produtoId" });