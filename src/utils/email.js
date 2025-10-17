const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function enviarEmail(to, subject, html) {
  await transporter.sendMail({
    from: `"Balcão e Bandeja" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { enviarEmail };
