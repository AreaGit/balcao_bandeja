const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Order = require("./order.model");

const OrderItem = sequelize.define("OrderItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  precoUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 1 }
}, {
  tableName: "order_items",
  timestamps: true
});

//OrderItem.sync({ force: true });
OrderItem.sync();

module.exports = OrderItem;