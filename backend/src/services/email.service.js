const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendPasswordResetEmail = async ({ to, resetLink }) => {
  await transporter.sendMail({
    from: `"QSM Security" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Recuperación de contraseña QSM",
    html: `
      <div style="font-family:Arial;padding:20px;">
        <h2>Recuperación de contraseña QSM</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic aquí:</p>
        <a href="${resetLink}" style="background:#35d0c3;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">
          Restablecer contraseña
        </a>
        <p>Este enlace expira en 15 minutos.</p>
      </div>
    `
  });
};

module.exports = { sendPasswordResetEmail };