const express = require("express");
const path = require("path");
const session = require("express-session"); // ✅ importar
const cors = require("cors");
const pagesRoutes = require("./src/routes/pages.routes");
const authRoutes = require("./src/routes/auth.routes");
const twoFARoutes = require("./src/routes/2fa.routes");
const productRoutes = require("./src/routes/product.routes");
const cartRoutes = require("./src/routes/cart.routes");
const freteRoutes = require("./src/routes/frete.routes");
const checkoutRoutes = require("./src/routes/checkout.routes");
const ordersRoutes = require("./src/routes/order.routes");
const pedidosRoutes = require("./src/routes/pedidos.routes");
const userRoutes = require("./src/routes/user.routes");
const asaasRoutes = require("./src/routes/asaas.routes");
const administrativoRoutes = require("./src/routes/administrativo.routes");
require("./src/models/cart.model");
require("./src/models/cartItem.model");
require("./src/models/associations");
require("./src/jobs/verificarBoletos.job");
require("dotenv").config();

const app = express();
const PORT = 3001;

// Sessões (necessário para armazenar tempUser)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "chave-super-secreta",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 15, // 15 minutos
      httpOnly: true,
      secure: false // true apenas em produção com HTTPS
    }
  })
);

// Servir estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, "public")));

// Habilitar JSON no body
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/", pagesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/2fa", twoFARoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/frete", freteRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/users", userRoutes);
app.use("/asaas", asaasRoutes);
app.use("/api/admin", administrativoRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌐 Ou na rede: http://<SEU_IP_LOCAL>:${PORT}`);
});