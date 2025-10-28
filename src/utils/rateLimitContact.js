const rateLimit = require("express-rate-limit");

// limita 5 envios por IP a cada 15 min
const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Muitas mensagens em pouco tempo. Tente novamente mais tarde." }
});

module.exports = contactRateLimiter;