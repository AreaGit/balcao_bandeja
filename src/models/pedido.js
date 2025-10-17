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

    // Campos adicionados para integração ASAAS
    paymentId: { type: Sequelize.STRING, allowNull: true }, // ID da cobrança no ASAAS
    paymentStatus: { type: Sequelize.STRING, allowNull: true }, // Ex: RECEIVED, PENDING, OVERDUE, etc
    paymentDate: { type: Sequelize.DATE, allowNull: true }, // Data de pagamento
    paymentType: { type: Sequelize.STRING, allowNull: true }, // PIX, BOLETO, CREDIT_CARD, etc
    externalReference: { type: Sequelize.STRING, allowNull: true }, // ID interno de controle
    qrCodePayload: { type: Sequelize.TEXT, allowNull: true }, // Código "copia e cola" PIX
    qrCodeImage: { type: Sequelize.TEXT("long"), allowNull: true } // Imagem Base64 (pode ser grande)
});

Pedido.associate = models => {
    Pedido.hasMany(PedidoItem, { foreignKey: "pedidoId", as: "itens" });
};

// CRIAR A TABELA
//Pedido.sync({ force: true });
Pedido.sync();

module.exports = Pedido;