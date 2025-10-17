const { calcularFrete } = require("../services/melhorEnvio.services");

async function getFrete(req, res) {
  try {
    const product = req.body; // dados do produto e destino virão do body
    const frete = await calcularFrete(product);
    res.json(frete);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao calcular frete",
      error: error.response?.data || error.message
    });
  }
}

module.exports = { getFrete };