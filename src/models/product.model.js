const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Product = db.define("Product", {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true }
  },

  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: { min: 0 }
  },

  valorPromocional: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },

  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ""
  },

  categoria: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "Geral"
  },

  cores: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },

  lonas: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },

  imagens: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },

  sales: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  // Campos físicos para frete e cálculo de dimensões
  largura: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },

  altura: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },

  comprimento: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },

  peso: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    defaultValue: 0.000
  },

  estoque: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 }
  },

  isLancamento: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  isMaisVendido: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }

}, {
  tableName: "produtos",
  timestamps: true,
  underscored: false,
  freezeTableName: true,
  defaultScope: {
    attributes: { exclude: [] }
  }
});

// Sincroniza sem forçar recriação
Product.sync();

module.exports = Product;