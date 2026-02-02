const Sequelize = require("sequelize");
const db = require("../config/database");
const Product = require("./product.model");
const Cart = require("./cart.model");

const CartItem = db.define("cartItem", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  quantity: { type: Sequelize.INTEGER, defaultValue: 1, validate: { min: 1 } },
  cartId: { type: Sequelize.INTEGER, allowNull: false },
  productId: { type: Sequelize.INTEGER, allowNull: false },
  cor: { type: Sequelize.STRING, allowNull: true },
  lona: { type: Sequelize.STRING, allowNull: true },
  arteUrl: { type: Sequelize.STRING, allowNull: true }
});

// Associação com Product
CartItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

// Associação com Cart (cada Cart tem muitos CartItems)
Cart.hasMany(CartItem, { foreignKey: "cartId", as: "cartItems" });

// Associação inversa com alias único
CartItem.belongsTo(Cart, { foreignKey: "cartId", as: "cartRef" });

//CartItem.sync({ force: true });
CartItem.sync();

module.exports = CartItem;