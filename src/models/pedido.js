const { Sequelize } = require("sequelize");
const db = require("../config/database");
const PedidoItem = require("./pedidoItem.model");

const Pedido = db.define("pedido", {
  usuarioId: { type: Sequelize.INTEGER, allowNull: true },
  endereco: { type: Sequelize.JSON, allowNull: false },
  frete: { type: Sequelize.JSON, allowNull: false },
  formaPagamento: { type: Sequelize.STRING, allowNull: false },
  total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
  status: { type: Sequelize.STRING, defaultValue: "pendente" },

  // 💳 Campos ASAAS
  paymentId: { type: Sequelize.STRING, allowNull: true },
  paymentStatus: { type: Sequelize.STRING, allowNull: true },
  paymentDate: { type: Sequelize.DATE, allowNull: true },
  paymentType: { type: Sequelize.STRING, allowNull: true },
  externalReference: { type: Sequelize.STRING, allowNull: true },
  qrCodePayload: { type: Sequelize.TEXT, allowNull: true },
  qrCodeImage: { type: Sequelize.TEXT("long"), allowNull: true },

  // 🏷️ Cupom e desconto
  cupom: {
    type: Sequelize.STRING,
    allowNull: true,
    comment: "Código do cupom de desconto aplicado"
  },
  descontoCupom: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: "Valor em reais do desconto aplicado pelo cupom"
  }
});

// Relacionamento
Pedido.associate = models => {
  Pedido.hasMany(PedidoItem, { foreignKey: "pedidoId", as: "itens" });
};

// Cria a tabela caso não exista
Pedido.sync();

module.exports = Pedido;