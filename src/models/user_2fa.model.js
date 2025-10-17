const Sequelize = require("sequelize");
const db = require("../config/database");

const User2FA = db.define("user_2fa", {
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  code: {
    type: Sequelize.STRING(6),
    allowNull: false
  },
  expiresAt: {
    type: Sequelize.DATE,
    allowNull: false
  },
  verified: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
});

//User2FA.sync({ force: true });
User2FA.sync();

module.exports = User2FA;