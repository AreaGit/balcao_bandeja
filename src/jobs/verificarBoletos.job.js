const cron = require("node-cron");
const Pedido = require("../models/pedido");
const User = require("../models/user.model");
const { consultarCobranca } = require("../services/asaas.services");
const { enviarEmail, wrapPremiumLayout } = require("../utils/email");

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
              wrapPremiumLayout("Pagamento Confirmado", `
                <h2 style="font-size:24px; font-weight:700; color:#1E1939; margin-bottom:24px;">Olá, ${usuario.nome}!</h2>
                <p style="font-size:16px; line-height:1.6; color:#4a4a5e; margin-bottom:24px;">
                  Recebemos a confirmação de pagamento do seu pedido <strong style="color:#1E1939;">#${pedido.id}</strong> via boleto bancário.
                </p>

                <div style="background-color:#f0fcf4; border-left:4px solid #28a745; padding:16px; border-radius:8px; margin-bottom:24px;">
                  <p style="font-size:14px; color:#155724; margin:0; line-height:1.5;">
                    Seu pedido agora entrou em fase de processamento e em breve será despachado!
                  </p>
                </div>

                <div style="text-align:center; margin-top:32px;">
                  <div style="display:inline-block; border:1px solid #edf2f7; padding:12px 24px; border-radius:30px; color:#9d9db0; font-size:14px;">
                    Aguarde as próximas notificações
                  </div>
                </div>
              `)
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