const Newsletter = require("../models/newsletter.model");
const Coupon = require("../models/cupom.model");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: "../../.env" });

/* === CONFIGURAR TRANSPORTER === */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/* === CADASTRAR NOVO INSCRITO === */
async function subscribe(req, res) {
  try {
    const { email, nome } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório" });

    // Cria ou encontra o registro existente
    const [record, created] = await Newsletter.findOrCreate({
      where: { email },
      defaults: { nome, ativo: true }
    });

    // Se já inscrito e ativo → só responde
    if (!created && record.ativo) {
      return res.status(200).json({ success: true, message: "E-mail já cadastrado" });
    }

    // Ativa novamente se estava desativado
    record.ativo = true;
    await record.save();

    // 🔹 Buscar cupom ativo mais recente
    const cupom = await Coupon.findOne({
      where: { active: true },
      order: [["id", "DESC"]]
    });

    // 🔹 Definir cupom padrão caso não haja nenhum ativo
    const code = cupom?.code || "BEMVINDO10";
    const desconto = cupom?.discount_percent || 10;

    // 🔹 Montar HTML de boas-vindas
    const html = `
      <div style="font-family:sans-serif;padding:20px;background:#f7f7f7">
        <h2>Bem-vindo${nome ? ", " + nome : ""} à Balcão & Bandeja! 🥂</h2>
        <p>Agora você faz parte da nossa comunidade e receberá ofertas exclusivas e novidades em primeira mão.</p>
        <p style="font-size:16px;margin-top:20px">
          🎁 <b>Seu cupom de boas-vindas:</b> <br>
          <span style="font-size:22px;color:#1E1939;font-weight:700">${code}</span><br>
          <small>Use este cupom para ganhar <b>${desconto}% de desconto</b> na sua próxima compra.</small>
        </p>
        <br>
        <p>Atenciosamente,<br><b>Equipe Balcão & Bandeja</b></p>
      </div>
    `;

    // 🔹 Envia e-mail automaticamente
    await transporter.sendMail({
      from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🎉 Bem-vindo à Balcão & Bandeja!",
      html
    });

    // Atualiza data do último envio
    record.ultimo_envio = new Date();
    await record.save();

    res.json({
      success: true,
      message: `Inscrição realizada com sucesso! Cupom de boas-vindas enviado para ${email}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao se inscrever na newsletter" });
  }
}

/* === LISTAR INSCRITOS (Admin) === */
async function listSubscribers(req, res) {
  try {
    const subscribers = await Newsletter.findAll({ order: [["createdAt", "DESC"]] });
    res.json(subscribers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar inscritos" });
  }
}

/* === ENVIAR E-MAIL GERAL === */
async function sendNewsletter(req, res) {
  try {
    const { assunto, mensagem, cupomId } = req.body;

    const subscribers = await Newsletter.findAll({ where: { ativo: true } });
    if (!subscribers.length) return res.status(404).json({ error: "Nenhum inscrito ativo." });

    let cupom = null;
    if (cupomId) {
      cupom = await Coupon.findByPk(cupomId);
    }

    for (const sub of subscribers) {
      const html = `
        <div style="font-family:sans-serif;padding:20px;background:#f7f7f7">
          <h2>Olá${sub.nome ? ", " + sub.nome : ""}!</h2>
          <p>${mensagem}</p>
          ${cupom ? `<p>Use o cupom <b>${cupom.code}</b> para ${cupom.discount_percent}% de desconto!</p>` : ""}
          <p style="font-size:13px;color:#888">Se não quiser mais receber nossas mensagens, clique aqui para cancelar.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
        to: sub.email,
        subject: assunto || "Novidades Balcão & Bandeja",
        html
      });

      sub.ultimo_envio = new Date();
      await sub.save();
    }

    res.json({ success: true, enviados: subscribers.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar newsletter." });
  }
}

/* === DESCADASTRAR === */
async function unsubscribe(req, res) {
  try {
    const { email } = req.body;
    const user = await Newsletter.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "E-mail não encontrado" });

    user.ativo = false;
    await user.save();

    res.json({ success: true, message: "Inscrição cancelada com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar inscrição" });
  }
}

/* === ESTATÍSTICAS PARA O PAINEL ADMIN === */
async function getStats(req, res) {
  try {
    const total = await Newsletter.count();
    const ativos = await Newsletter.count({ where: { ativo: true } });
    const inativos = total - ativos;
    const enviados = await Newsletter.count({ where: { ultimo_envio: { [require("sequelize").Op.not]: null } } });

    // 🔹 Histórico dos últimos 7 dias
    const { Op, fn, col } = require("sequelize");
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const logs = await Newsletter.findAll({
      attributes: [
        [fn("DATE", col("ultimo_envio")), "dia"],
        [fn("COUNT", col("id")), "total"]
      ],
      where: { ultimo_envio: { [Op.gte]: sevenDaysAgo } },
      group: [fn("DATE", col("ultimo_envio"))],
      order: [[fn("DATE", col("ultimo_envio")), "ASC"]]
    });

    res.json({
      total,
      ativos,
      inativos,
      enviados,
      logs: logs.map(l => ({
        dia: l.dataValues.dia,
        total: parseInt(l.dataValues.total)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar estatísticas da newsletter" });
  }
}

module.exports = {
  subscribe,
  listSubscribers,
  sendNewsletter,
  unsubscribe,
  getStats
};