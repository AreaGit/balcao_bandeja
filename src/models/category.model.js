const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Category = db.define("Category", {
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { notEmpty: true }
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "categorias",
    timestamps: true,
    underscored: false,
    freezeTableName: true
});

// Sincroniza sem forçar recriação
Category.sync();

module.exports = Category;
