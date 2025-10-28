const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const { send2FACode } = require("./2fa.controllers");
const { criarClienteAsaas } = require("../services/asaas.services");
const { Op } = require("sequelize");
const crypto = require("crypto");
const PasswordResetToken = require("../models/passwordResetToken.model");
const { enviarEmail } = require("../utils/email");

// Configuráveis
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MIN = 15;
const BCRYPT_ROUNDS = 12;
const APP_URL = "https://balcaoebandeja.com.br"; // ajuste

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const SALT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const {
      nome,
      email,
      senha,
      cpf,
      celular,
      telefoneFixo,
      sexo,
      dataNascimento,
      cep,
      rua,
      numero,
      complemento,
      referencia,
      bairro,
      cidade,
      estado
    } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    }

    // já existe email?
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    // hash da senha
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);

    // cria usuário
    const user = await User.create({
      nome,
      email,
      senha: hash,
      cpf,
      celular,
      telefoneFixo,
      sexo,
      dataNascimento,
      cep,
      rua,
      numero,
      complemento,
      referencia,
      bairro,
      cidade,
      estado
    });

    // Criar cliente ASAAS
    const clienteAsaas = await criarClienteAsaas(user);

    // Salvar customer_asaas_id no banco
    user.customer_asaas_id = clienteAsaas.id;
    await user.save();

    return res.status(201).json({
      id: user.id,
      nome: user.nome,
      email: user.email
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "Email e senha são obrigatórios" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

    // ❗ Aqui entra o 2FA
    await send2FACode(user); // envia código por email
    req.session.tempUser = { id: user.id, email: user.email, nome: user.nome }; // guarda temporário

    return res.json({ message: "Código de verificação enviado por email" });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    return res.json({ ok: true, message: "Logout feito" });
  } catch (err) {
    next(err);
  }
}

async function requestPasswordReset (req, res) {
  try {
    const { email } = req.body || {};
    const ip = req.ip;
    const ua = req.headers["user-agent"] || "";

    if (!email) return res.status(200).json({ ok: true }); // não revela existência

    const user = await User.findOne({ where: { email } });

    // Sempre responder 200, mesmo se não existir
    if (!user) {
      return res.status(200).json({ ok: true });
    }

    // Invalida tokens antigos do usuário
    await PasswordResetToken.destroy({ where: { userId: user.id } });

    // Gera token aleatório + hash
    const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);

    await PasswordResetToken.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      ip,
      userAgent: ua
    });

    const resetLink = `${APP_URL}/reset-password?token=${rawToken}`;

    // Envia o e-mail
    await enviarEmail(
      user.email,
      "🔐 Redefinição de senha – Balcão & Bandeja",
      `
      <h2>Olá, ${user.nome || ""}</h2>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no botão abaixo (válido por ${RESET_TOKEN_TTL_MIN} minutos):</p>
      <p><a href="${resetLink}" style="background:#1E1939;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Redefinir senha</a></p>
      <p>Ou copie e cole este link no navegador:</p>
      <p>${resetLink}</p>
      <hr/>
      <p>Se não foi você, ignore este e-mail.</p>
      `
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro em requestPasswordReset:", err);
    return res.status(200).json({ ok: true }); // mesma resposta
  }
};

async function resetPassword (req, res) {
  try {
    const { token, newPassword } = req.body || {};

    // Mensagem genérica sempre
    const generic = () => res.status(200).json({ ok: true });

    if (!token || !newPassword) return generic();

    // Validação mínima de senha (ajuste sua policy)
    if (newPassword.length < 8) return generic();

    const tokenHash = sha256Hex(token);

    const record = await PasswordResetToken.findOne({
      where: {
        tokenHash,
        usedAt: { [Op.is]: null },
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!record) return generic();

    const user = await User.findByPk(record.userId);
    if (!user) return generic();

    // Atualiza a senha
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.senha = hash; // ajuste para o campo correto no seu modelo
    await user.save();

    // Marca token como usado
    record.usedAt = new Date();
    await record.save();

    // (Opcional) Revogar sessões/refresh tokens aqui

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro em resetPassword:", err);
    return res.status(200).json({ ok: true });
  }
};

module.exports = { register, login, logout, requestPasswordReset, resetPassword };