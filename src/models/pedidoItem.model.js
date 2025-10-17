const { Sequelize } = require("sequelize");
const db = require("../config/database");

const PedidoItem = db.define("pedidoItem", {
    pedidoId: { type: Sequelize.INTEGER, allowNull: false },
    produtoId: { type: Sequelize.INTEGER, allowNull: false },
    quantidade: { type: Sequelize.INTEGER, allowNull: false },
    precoUnitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    cor: { type: Sequelize.STRING, allowNull: true }
});

// CRIAR A TABELA
//PedidoItem.sync({ force: true });
PedidoItem.sync();

module.exports = PedidoItem;