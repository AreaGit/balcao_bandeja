const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define("Order", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "Pendente" },
  paymentMethod: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: "orders",
  timestamps: true
});

//Order.sync({ force: true });
Order.sync();

module.exports = Order;