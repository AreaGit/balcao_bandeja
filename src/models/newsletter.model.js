const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Newsletter = db.define("Newsletter", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  nome: { type: DataTypes.STRING, allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  ultimo_envio: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: "newsletter",
  timestamps: true
});

//Newsletter.sync({ force: true });
Newsletter.sync();

module.exports = Newsletter;