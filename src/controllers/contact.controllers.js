const { Op } = require("sequelize");
const ContactMessage = require("../models/contactMessage.model");
const Beneficio = require("../models/beneficios.model");
// se você já tem util de e-mail no projeto, reaproveite:
const { enviarEmail, wrapPremiumLayout } = require("../utils/email"); // ajuste o path se necessário

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

exports.store = async (req, res) => {
  try {
    const {
      nome,
      cpf,
      cpf_cnpj: cpfCnpjFront, // caso já venha certo
      whatsapp,
      email
    } = req.body;

    console.log(req.body);

    // Aceita "cpf" ou "cpf_cnpj"
    const cpf_cnpj = (cpfCnpjFront || cpf || "").toString();

    // =======================
    // VALIDAÇÃO DE SEGURANÇA
    // =======================
    if (!nome || !cpf_cnpj || !whatsapp || !email) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Preencha todos os campos obrigatórios."
      });
    }

    if (!email.includes("@")) {
      return res.status(400).json({
        status: "erro",
        mensagem: "E-mail inválido."
      });
    }

    // =======================
    // NORMALIZAÇÃO DOS DADOS
    // =======================
    const nomeFormatado = nome.trim();
    const cpfCnpjLimpo = cpf_cnpj.replace(/\D/g, "");
    const whatsappLimpo = whatsapp.replace(/\D/g, "").replace(/^0/, "");
    const emailLower = email.trim().toLowerCase();

    // =======================
    // SALVAMENTO
    // =======================
    const beneficio = await Beneficio.create({
      nome: nomeFormatado,
      cpf_cnpj: cpfCnpjLimpo,
      whatsapp: whatsappLimpo,
      email: emailLower
    });

    // ========= TEMPLATE DO EMAIL =========
    const htmlEmail = wrapPremiumLayout("Clube VIP", `
      <h2 style="font-size:24px; font-weight:700; color:#1E1939; margin-bottom:24px;">🎉 Bem-vindo ao grupo de elite!</h2>
      
      <p style="font-size:18px; line-height:1.6; color:#4a4a5e; margin-bottom:32px;">
        Olá, <strong style="color:#1E1939;">${nome}</strong>! <br><br>
        É uma honra ter você no <strong>Clube VIP da Balcão & Bandeja</strong>. Seu cadastro foi processado com sucesso e você acaba de desbloquear um novo nível de experiência.
      </p>

      <!-- Highlight Box -->
      <div style="background-color:#1E1939; border-left:6px solid #E7FF14; padding:24px; border-radius:12px; margin-bottom:32px;">
        <p style="color:#ffffff; margin:0; font-size:16px; line-height:1.6; font-weight:500;">
          Você agora tem acesso a <strong>benefícios exclusivos, atendimento prioritário</strong> e consultoria personalizada para elevar o padrão do seu negócio.
        </p>
      </div>

      <p style="font-size:16px; line-height:1.6; color:#6b6b7a; margin-bottom:40px;">
        Nosso time de especialistas já foi notificado e entrará em contato em breve para apresentar todas as vantagens que preparamos especialmente para você.
      </p>

      <!-- Action Button/Visual Divider -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="border-top:1px solid #edf2f7; padding-top:32px; text-align:center;">
            <p style="font-size:14px; color:#9d9db0; margin-bottom:8px;">Acompanhe nossas novidades</p>
            <div style="display:inline-block; background-color:#E7FF14; color:#1E1939; padding:12px 32px; border-radius:30px; font-weight:800; font-size:16px; text-transform:uppercase; letter-spacing:1px;">
              Excelência Garantida
            </div>
          </td>
        </tr>
      </table>
    `);

    await enviarEmail(
      email,
      `Você agora faz parte do Clube VIP da Balcão & Bandeja! 🎉`,
      `
          ${htmlEmail}
        `
    );

    return res.status(201).json({
      status: "sucesso",
      mensagem: "Benefício ativado com sucesso!",
      dados: beneficio
    });

  } catch (error) {
    console.error("Erro ao salvar benefício:", error);

    return res.status(500).json({
      status: "erro",
      mensagem: "Erro interno ao processar a solicitação.",
      detalhe: error.message
    });
  }
};

exports.index = async (req, res) => {
  try {
    const beneficios = await Beneficio.findAll({
      order: [["created_at", "DESC"]]
    });

    return res.json({
      status: "sucesso",
      quantidade: beneficios.length,
      dados: beneficios
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao buscar registros."
    });
  }
};

exports.show = async (req, res) => {
  try {
    const { id } = req.params;

    const beneficio = await Beneficio.findByPk(id);

    if (!beneficio) {
      return res.status(404).json({
        status: "erro",
        mensagem: "Registro não encontrado."
      });
    }

    return res.json({
      status: "sucesso",
      dados: beneficio
    });

  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao buscar registro."
    });
  }
}