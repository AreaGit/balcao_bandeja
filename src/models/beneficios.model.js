const Sequelize = require("sequelize");
const db = require("../config/database");

const Beneficios = db.define('beneficios', {
    nome: {
        type: Sequelize.STRING(120),
        allowNull: false,
        validate: {
            notEmpty: { msg: "O nome é obrigatório." },
            len: { args: [3, 120], msg: "Nome inválido." }
        }
    },
    cpf_cnpj: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: { msg: "CPF/CNPJ obrigatório." },
            len: { args: [11, 20], msg: "CPF/CNPJ inválido." }
        }
    },
    whatsapp: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
            notEmpty: { msg: "WhatsApp obrigatório." }
        }
    },
    email: {
        type: Sequelize.STRING(120),
        allowNull: false,
        validate: {
            isEmail: { msg: "E-mail inválido." }
        }
    }
});

// SINCRONIZAR TABELA
// Beneficios.sync({ force: true });
Beneficios.sync();

module.exports = Beneficios;