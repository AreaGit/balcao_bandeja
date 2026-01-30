const cron = require("node-cron");
const Newsletter = require("../models/newsletter.model");
const Coupon = require("../models/cupom.model");

// Enviar cupom de boas-vindas a novos inscritos
cron.schedule("0 * * * *", async () => {
  const novos = await Newsletter.findAll({
    where: { ativo: true, ultimo_envio: null }
  });
  if (!novos.length) return;

  const cupom = await Coupon.findOne({ where: { active: true }, order: [["id", "DESC"]] });

  for (const user of novos) {
    await transporter.sendMail({
      from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Bem-vindo à Balcão & Bandeja!",
      html: `<h2>Olá!</h2><p>Bem-vindo à nossa Newsletter 🎉</p>
      <p>Use o cupom <b>${cupom?.code || "BEMVINDO10"}</b> para ${cupom?.discount_percent || 10}% de desconto!</p>`
    });

    user.ultimo_envio = new Date();
    await user.save();
  }

  console.log(`✉️ Cupom enviado para ${novos.length} novos inscritos`);
});
