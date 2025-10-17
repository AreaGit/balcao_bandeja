const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Order = require("./order.model");

const OrderShipping = sequelize.define("OrderShipping", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "orders",
      key: "id"
    }
  },
  company: { type: DataTypes.STRING, allowNull: false },
  service: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  delivery_time: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: "order_shipping",
  timestamps: true
});

//OrderShipping.sync({ force:true });
OrderShipping.sync();

module.exports = OrderShipping;