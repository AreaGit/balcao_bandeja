const { Sequelize } = require("sequelize");
const db = require("../config/database");

const Product = db.define("Product", {
  nome: { type: Sequelize.STRING, allowNull: false },
  valor: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
  valorPromocional: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
  descricao: { type: Sequelize.TEXT, allowNull: false },
  categoria: { type: Sequelize.STRING, allowNull: false },
  cores: {
    type: Sequelize.JSON,
    allowNull: true
  },
  imagens: {
    type: Sequelize.JSON,
    allowNull: true
  },
  sales: { type: Sequelize.INTEGER, defaultValue: 0 },

  // 🔽 Campos necessários para cálculo de frete 🔽
  largura: { type: Sequelize.DECIMAL(10, 2), allowNull: false },   // cm
  altura: { type: Sequelize.DECIMAL(10, 2), allowNull: false },    // cm
  comprimento: { type: Sequelize.DECIMAL(10, 2), allowNull: false }, // cm
  peso: { type: Sequelize.DECIMAL(10, 3), allowNull: false },      // kg

  // quantidade pode ser controlada no carrinho, mas se quiser default:
  estoque: { type: Sequelize.INTEGER, defaultValue: 0 },

  isLancamento: { type: Sequelize.BOOLEAN, defaultValue: false },
  isMaisVendido: { type: Sequelize.BOOLEAN, defaultValue: false }

}, {
  tableName: "produtos",
  timestamps: true
});

//Product.sync({ force: true });
Product.sync();

module.exports = Product;