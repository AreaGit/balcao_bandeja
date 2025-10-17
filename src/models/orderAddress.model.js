const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Order = require("./order.model");

const OrderAddress = sequelize.define("OrderAddress", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: "orders",
    key: "id"
  }
},
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },
  telefone: { type: DataTypes.STRING, allowNull: true },
  endereco: { type: DataTypes.STRING, allowNull: false },
  cidade: { type: DataTypes.STRING, allowNull: false },
  estado: { type: DataTypes.STRING, allowNull: false },
  cep: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: "order_address",
  timestamps: true
});

//OrderAddress.sync({ force: true });
OrderAddress.sync();

module.exports = OrderAddress;