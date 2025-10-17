const Sequelize = require("sequelize");
const db = require("../config/database");

const User = db.define("usuarios", {
  id: {
    type: Sequelize.INTEGER, 
    autoIncrement: true,
    primaryKey: true
  },
  customer_asaas_id: Sequelize.STRING(100),
  nome: {
    type: Sequelize.STRING(100),
    allowNull: false
  },
  cpf: {
    type: Sequelize.STRING(150),
    allowNull: false
  },
  celular: {
    type: Sequelize.STRING(100),
    allowNull: false
  },
  telefoneFixo: Sequelize.STRING(100),
  sexo: {
    type: Sequelize.ENUM("Masculino", "Feminino"),
    allowNull: false
  },
  dataNascimento: {
    type: Sequelize.DATE,
    allowNull: false
  },
  cep: Sequelize.STRING(150),
  rua: Sequelize.STRING(50),
  numero: Sequelize.STRING(50),
  complemento: Sequelize.STRING(50),
  referencia: Sequelize.STRING(150),
  bairro: Sequelize.STRING(150),
  cidade: Sequelize.STRING(150),
  estado: Sequelize.STRING(150),
  email: {
    type: Sequelize.STRING(255),
    allowNull: false,
    unique: true
  },
  senha: {
    type: Sequelize.STRING(255),
    allowNull: false
  }
});

//User.sync({ force: true });
User.sync(); // cria tabela se não existir

module.exports = User;