const { DataTypes } = require("sequelize");
const db = require("../config/database");
const User = require("./user.model"); // ajuste o caminho se necessário

const PasswordResetToken = db.define("PasswordResetToken", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" } },
  tokenHash: { type: DataTypes.STRING(128), allowNull: false }, // hash hex
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
  ip: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(255), allowNull: true }
}, {
  tableName: "password_reset_tokens",
  indexes: [{ fields: ["userId"] }, { fields: ["expiresAt"] }]
});

// PasswordResetToken.sync({ force: true });
PasswordResetToken.sync();

module.exports = PasswordResetToken;
