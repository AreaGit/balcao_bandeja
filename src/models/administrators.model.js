const Sequelize = require("sequelize");
const db = require("../config/database");

const Administrators = db.define("administrators", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true, 
        primaryKey: true 
    },
    name: {
        type: Sequelize.STRING(50),
        allowNull: false
    },
    email: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    password: {
        type: Sequelize.STRING(255),
        allowNull: false
    }
});

// SINCRONIZAÇÃO DA TABELA
// Administrators.sync({ force: true })
Administrators.sync();

module.exports = Administrators;