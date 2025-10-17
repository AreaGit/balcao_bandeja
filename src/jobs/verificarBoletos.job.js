const cron = require("node-cron");
const Pedido = require("../models/pedido");
const User = require("../models/user.model");
const { consultarCobranca } = require("../services/asaas.services");
const { enviarEmail } = require("../utils/email");

cron.schedule("*/1 * * * *", async () => {
  console.log("⏳ Verificando status dos boletos pendentes...");

  try {
    const boletosPendentes = await Pedido.findAll({
      where: { status: "AGUARDANDO PAGAMENTO", formaPagamento: "BOLETO" }
    });

    if (!boletosPendentes.length) {
      console.log("Nenhum boleto pendente encontrado.");
      return;
    }

    for (const pedido of boletosPendentes) {
      try {
        const cobranca = await consultarCobranca(pedido.paymentId);
        const statusAsaas = cobranca.status?.toUpperCase();

        if (["RECEIVED", "CONFIRMED"].includes(statusAsaas)) {
          await pedido.update({
            status: "PAGO",
            paymentStatus: statusAsaas,
            paymentDate: new Date()
          });

          const usuario = await User.findByPk(pedido.usuarioId);

          if (usuario && usuario.email) {
            await enviarEmail(
              usuario.email,
              "🎉 Pagamento confirmado!",
              `
              <h2>Olá ${usuario.nome},</h2>
              <p>Recebemos o pagamento do seu pedido <strong>#${pedido.id}</strong> via boleto.</p>
              <p>Seu pedido agora está sendo processado e em breve será despachado!</p>
              <br>
              <p>Obrigado por comprar conosco 💙</p>
              <p><strong>Equipe Balcão e Bandeja</strong></p>
              `
            );
          }

          console.log(`✅ Pedido ${pedido.id} confirmado como PAGO`);
        } else if (statusAsaas === "OVERDUE") {
          await pedido.update({
            status: "VENCIDO",
            paymentStatus: statusAsaas
          });
          console.log(`⚠️ Pedido ${pedido.id} está VENCIDO`);
        } else {
          console.log(`⏳ Pedido ${pedido.id} ainda pendente (${statusAsaas})`);
        }
      } catch (err) {
        console.error(`Erro ao verificar boleto ${pedido.paymentId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Erro geral ao verificar boletos:", err.message);
  }
});