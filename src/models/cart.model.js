const Sequelize = require("sequelize");
const db = require("../config/database");
const User = require("./user.model");

const Cart = db.define("cart", {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: Sequelize.INTEGER, allowNull: true },
    guestId: { type: Sequelize.STRING, allowNull: true },
    discountCode: { type: Sequelize.STRING, allowNull: true },
    discountValue: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
    endereco: { type: Sequelize.JSON, allowNull: true },
    frete: { type: Sequelize.JSON, allowNull: true }
});

// Só exportamos o model aqui, sem CartItem ainda
Cart.belongsTo(User, { foreignKey: "userId", as: "usuarios" });

//Cart.sync({ force: true });
Cart.sync();

module.exports = Cart;