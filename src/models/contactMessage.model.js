const { DataTypes } = require("sequelize");
const db = require("../config/database");

const ContactMessage = db.define("contact_messages", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(160), allowNull: false },
  subject: { type: DataTypes.STRING(160), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM("NEW", "READ", "REPLIED", "ARCHIVED"), defaultValue: "NEW" },
  ip: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(512), allowNull: true }
}, {
  tableName: "contact_messages",
  timestamps: true
});

// ContactMessage.sync({ force: true })
ContactMessage.sync();

module.exports = ContactMessage;