const nodemailer = require("nodemailer");
const User2FA = require("../models/user_2fa.model");
const User = require("../models/user.model");
require("dotenv").config();

async function send2FACode(user) {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

  await User2FA.create({ userId: user.id, code, expiresAt });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: "Seu código de verificação",
    text: `Olá ${user.nome}, seu código de verificação é: ${code}. Ele expira em 5 minutos.`
  });
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

module.exports = { send2FACode, verify2FACode };