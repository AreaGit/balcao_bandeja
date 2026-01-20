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

function wrapPremiumLayout(title, content) {
  const currentYear = new Date().getFullYear();
  return `
    <div style="font-family:'Montserrat', Arial, sans-serif; background-color:#f0f2f5; padding:40px 0; color:#1E1939; margin:0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 20px 40px rgba(30,25,57,0.12);">
        
        <!-- Header with Gradient and Logo -->
        <tr>
          <td style="background:linear-gradient(135deg, #1E1939 0%, #2d2654 100%); padding:40px; text-align:center;">
            <img src="https://balcaoebandeja.com.br/assets/logo-branco.png" alt="Balcão & Bandeja" style="max-height:60px; margin-bottom:20px;">
            <h1 style="color:#ffffff; font-size:28px; font-weight:800; margin:0; letter-spacing:-0.5px;">${title}</h1>
          </td>
        </tr>

        <!-- Content Area -->
        <tr>
          <td style="padding:48px 40px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8f9fa; padding:32px; text-align:center;">
            <p style="font-size:14px; color:#9d9db0; margin:0;">
              Com carinho, <br>
              <strong style="color:#1E1939;">Equipe Balcão & Bandeja</strong>
            </p>
            <p style="font-size:12px; color:#c0c0d1; margin-top:16px;">
              © ${currentYear} Balcão & Bandeja. Todos os direitos reservados.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

module.exports = { enviarEmail, wrapPremiumLayout };
