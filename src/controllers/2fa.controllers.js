const User2FA = require("../models/user_2fa.model");
const User = require("../models/user.model");
const Administrators2FA = require("../models/administrators_2fa.model");
const { enviarEmail, wrapPremiumLayout } = require("../utils/email");

async function send2FACode(user) {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

  await User2FA.create({ userId: user.id, code, expiresAt });

  const html = wrapPremiumLayout("Verificação", `
    <h2 style="font-size:24px; font-weight:700; color:#1E1939; margin-bottom:24px;">Olá, ${user.nome}!</h2>
    <p style="font-size:16px; line-height:1.6; color:#4a4a5e; margin-bottom:32px;">
      Para garantir a segurança da sua conta, use o código de verificação abaixo para completar o seu acesso.
    </p>

    <div style="background-color:#f8f9fa; border:2px dashed #1E1939; border-radius:16px; padding:32px; text-align:center; margin-bottom:32px;">
      <span style="font-family:'Courier New', Courier, monospace; font-size:48px; font-weight:800; color:#1E1939; letter-spacing:8px;">${code}</span>
    </div>

    <div style="background-color:#fff3cd; border-left:4px solid #ffc107; padding:16px; border-radius:8px; margin-bottom:24px;">
      <p style="font-size:14px; color:#856404; margin:0; line-height:1.5;">
        Este código expira em <strong>5 minutos</strong>. Se você não solicitou este código, por favor, altere sua senha imediatamente.
      </p>
    </div>
  `);

  await enviarEmail(
    user.email,
    "Seu código de verificação — Balcão & Bandeja",
    html
  );
}

async function verify2FACode(userId, code) {
  const record = await User2FA.findOne({
    where: { userId, code, verified: false },
    order: [["expiresAt", "DESC"]]
  });

  if (!record) throw new Error("Código inválido");
  if (new Date() > record.expiresAt) throw new Error("Código expirado");

  record.verified = true;
  await record.save();

  return true;
}

async function send2FACodeAdmin(user) {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

  await Administrators2FA.create({ admId: user.id, code, expiresAt });

  const html = wrapPremiumLayout("Administração", `
    <h2 style="font-size:24px; font-weight:700; color:#1E1939; margin-bottom:24px;">Olá, ${user.name}!</h2>
    <p style="font-size:16px; line-height:1.6; color:#4a4a5e; margin-bottom:32px;">
      Um acesso administrativo foi solicitado. Use o código abaixo para validar sua identidade.
    </p>

    <div style="background-color:#1E1939; border-radius:16px; padding:32px; text-align:center; margin-bottom:32px; border-left:6px solid #E7FF14;">
      <span style="font-family:'Courier New', Courier, monospace; font-size:48px; font-weight:800; color:#ffffff; letter-spacing:8px;">${code}</span>
    </div>

    <p style="font-size:14px; color:#9d9db0; text-align:center; margin:0;">
      Válido por 5 minutos. <br>
      Acesso solicitado de um novo dispositivo ou sessão.
    </p>
  `);

  await enviarEmail(
    user.email,
    "Código de Acesso Administrativo — Balcão & Bandeja",
    html
  );
}

async function verify2FACodeAdmin(admId, code) {
  const record = await Administrators2FA.findOne({
    where: { admId, code, verified: false },
    order: [["expiresAt", "DESC"]]
  });

  if (!record) throw new Error("Código inválido");
  if (new Date() > record.expiresAt) throw new Error("Código expirado");

  record.verified = true;
  await record.save();

  return true;
}

module.exports = { send2FACode, verify2FACode, send2FACodeAdmin, verify2FACodeAdmin };