require("dotenv").config({ path: "../../.env" });
const axios = require("axios");

const token = process.env.MELHOR_ENVIO_TOKEN;

async function calcularFrete(product) {
  try {
    const options = {
      method: "POST",
      url: "https://melhorenvio.com.br/api/v2/me/shipment/calculate",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Balcão e Bandeja (operacional@portavia.com.br)"
      },
      data: {
        from: { postal_code: "09560101" }, // CEP da origem
        to: { postal_code: product.postal_codeTo }, // CEP destino
        products: [
          {
            id: product.id || null,
            width: Number(product.largura),
            height: Number(product.altura),
            length: Number(product.comprimento),
            weight: Number(product.peso),
            insurance_value: Number(product.valor),
            quantity: Number(product.quantity || 1)
          }
        ]
      }
    };

    const response = await axios.request(options);
    console.log("Cotações de frete:", response.data);
    return response.data;
  } catch (err) {
    console.error("Erro ao calcular frete:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { calcularFrete };