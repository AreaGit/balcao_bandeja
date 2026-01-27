const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Category = db.define("Category", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    }
}, {
    tableName: "Categories",
    timestamps: true
});

module.exports = Category;
