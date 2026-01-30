const DataTypes = require("sequelize");
const db = require("../config/database");

const Coupon = db.define("Coupon", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(100) },
  discount_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  is_free_shipping: { type: DataTypes.BOOLEAN, defaultValue: false },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  expires_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: "coupons",
  timestamps: false
});

//Coupon.sync({ force: true });
Coupon.sync({ alter: true });

module.exports = Coupon;