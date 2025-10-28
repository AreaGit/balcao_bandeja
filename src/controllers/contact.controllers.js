const { Op } = require("sequelize");
const ContactMessage = require("../models/contactMessage.model");
// se você já tem util de e-mail no projeto, reaproveite:
const { enviarEmail } = require("../utils/email"); // ajuste o path se necessário

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "suporte@balcaoebandeja.com.br";
const BRAND_NAME = process.env.BRAND_NAME || "Balcão & Bandeja";

function mask(str = "", max = 5000) {
  return String(str).slice(0, max);
}

exports.create = async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;

    const nome = mask(req.body.nome, 120);
    const email = mask(req.body.email, 160);
    const assunto = mask(req.body.assunto, 160);
    const mensagem = mask(req.body.mensagem, 5000);

    // throttle extra: bloqueia repetição mesma pessoa/assunto em 2 minutos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existsRecent = await ContactMessage.findOne({
      where: {
        email,
        subject: assunto,
        createdAt: { [Op.gte]: twoMinutesAgo }
      }
    });
    if (existsRecent) {
      return res.status(429).json({
        success: false,
        error: "Mensagem semelhante enviada recentemente. Tente novamente em alguns minutos."
      });
    }

    // grava no banco
    const rec = await ContactMessage.create({
      name: nome,
      email,
      subject: assunto,
      message: mensagem,
      ip,
      userAgent
    });

    // e-mail para suporte
    try {
      await enviarEmail(
        SUPPORT_EMAIL,
        `📩 [Fale Conosco] ${assunto}`,
        `
          <h2>Nova mensagem de contato</h2>
          <p><strong>Nome:</strong> ${nome}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Assunto:</strong> ${assunto}</p>
          <p><strong>IP:</strong> ${ip || "-"}</p>
          <p><strong>User-Agent:</strong> ${userAgent || "-"}</p>
          <hr>
          <p style="white-space:pre-wrap">${mensagem.replace(/</g, "&lt;")}</p>
          <hr>
          <p>Protocolo: <strong>#${rec.id}</strong></p>
        `
      );
    } catch (e) {
      // não falha o fluxo para o usuário se e-mail não enviar
      console.warn("Falha ao enviar e-mail para suporte:", e.message);
    }

    // auto-resposta para o cliente
    try {
      await enviarEmail(
        email,
        `Recebemos sua mensagem — ${BRAND_NAME}`,
        `
          <h2>Olá, ${nome}!</h2>
          <p>Recebemos sua mensagem e nossa equipe vai te responder o mais breve possível.</p>
          <p><strong>Protocolo:</strong> #${rec.id}</p>
          <hr>
          <p><em>Resumo:</em></p>
          <p><strong>Assunto:</strong> ${assunto}</p>
          <p style="white-space:pre-wrap">${mensagem.replace(/</g, "&lt;")}</p>
          <br>
          <p>Abraços,<br><strong>${BRAND_NAME}</strong></p>
        `
      );

      await enviarEmail(
        "contato@balcaoebandeja.com.br",
        `Nova mensagem do Fale Conosco — ${assunto}`,
        `
          <h3>Nova mensagem recebida via site!</h3>
          <p><strong>Nome:</strong> ${nome}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Assunto:</strong> ${assunto}</p>
          <p><strong>Mensagem:</strong><br>${mensagem}</p>
        `
      );
    } catch (e) {
      console.warn("Falha ao enviar auto-resposta:", e.message);
    }

    return res.status(201).json({ success: true, id: rec.id });
  } catch (err) {
    console.error("Erro ao criar contato:", err);
    return res.status(500).json({ success: false, error: "Erro ao enviar mensagem" });
  }
};

exports.list = async (req, res) => {
  // endpoint simples para administração (proteja com auth do seu projeto)
  try {
    const { page = 1, limit = 20, q = "" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = q
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } },
            { subject: { [Op.like]: `%${q}%` } }
          ]
        }
      : undefined;

    const { rows, count } = await ContactMessage.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset
    });

    return res.json({
      success: true,
      page: Number(page),
      pages: Math.ceil(count / Number(limit)),
      total: count,
      data: rows
    });
  } catch (err) {
    console.error("Erro ao listar contatos:", err);
    return res.status(500).json({ success: false, error: "Erro ao listar mensagens" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = "READ" } = req.body;
    const allowed = ["NEW", "READ", "REPLIED", "ARCHIVED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: "Status inválido" });
    }

    const rec = await ContactMessage.findByPk(id);
    if (!rec) return res.status(404).json({ success: false, error: "Registro não encontrado" });

    rec.status = status;
    await rec.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    return res.status(500).json({ success: false, error: "Erro ao atualizar status" });
  }
};
