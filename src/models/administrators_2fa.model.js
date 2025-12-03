const Sequelize = require("sequelize");
const db = require("../config/database");

const Administrators2FA = db.define("administrators_2fa", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    admId: {
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

// SINCRONIZAR A TABELA
// Administrators2FA.sync({ force: true });
Administrators2FA.sync();

module.exports = Administrators2FA;