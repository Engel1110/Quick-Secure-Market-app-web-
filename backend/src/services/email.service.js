const nodemailer = require("nodemailer");
const dns = require("node:dns");

dns.setDefaultResultOrder("ipv4first");

const REQUIRED_EMAIL_VARIABLES = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASS"
];

const getEmailConfiguration = () => ({
  host: String(process.env.EMAIL_HOST || "").trim(),
  port: Number(process.env.EMAIL_PORT || 587),
  user: String(process.env.EMAIL_USER || "").trim(),
  pass: String(process.env.EMAIL_PASS || ""),
  fromName: String(process.env.EMAIL_FROM_NAME || "QSM Security").trim(),
  fromAddress: String(
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    ""
  ).trim()
});

const validateEmailConfiguration = () => {
  const config = getEmailConfiguration();

  const missing = REQUIRED_EMAIL_VARIABLES.filter(
    (name) => !String(process.env[name] || "").trim()
  );

  if (missing.length > 0) {
    const error = new Error(
      "Configuracion SMTP incompleta. Faltan: " +
      missing.join(", ")
    );

    error.code = "QSM_EMAIL_CONFIG_MISSING";
    error.missingVariables = missing;
    throw error;
  }

  if (
    !Number.isInteger(config.port) ||
    config.port < 1 ||
    config.port > 65535
  ) {
    const error = new Error("EMAIL_PORT no es valido.");
    error.code = "QSM_EMAIL_PORT_INVALID";
    throw error;
  }

  return config;
};

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const config = validateEmailConfiguration();

  transporter = nodemailer.createTransport({
      family: 4,
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 25000,
    tls: {
      minVersion: "TLSv1.2"
    }
  });

  return transporter;
};

const verifyEmailTransport = async () => {
  try {
    await getTransporter().verify();

    return {
      success: true,
      message: "Conexion SMTP verificada correctamente."
    };
  } catch (error) {
    const wrapped = new Error(
      "No se pudo verificar la conexion SMTP: " +
      (error?.response || error?.message || "Error desconocido")
    );

    wrapped.code = error?.code || "QSM_SMTP_VERIFY_FAILED";
    wrapped.command = error?.command;
    wrapped.responseCode = error?.responseCode;
    throw wrapped;
  }
};

const safeSendMail = async (options) => {
  const config = validateEmailConfiguration();

  try {
    const result = await getTransporter().sendMail({
      ...options,
      from:
        options.from ||
        `"${config.fromName}" <${config.fromAddress}>`
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted || [],
      rejected: result.rejected || [],
      response: result.response || ""
    };
  } catch (error) {
    const wrapped = new Error(
      "No se pudo enviar el correo: " +
      (error?.response || error?.message || "Error desconocido")
    );

    wrapped.code = error?.code || "QSM_EMAIL_SEND_FAILED";
    wrapped.command = error?.command;
    wrapped.responseCode = error?.responseCode;
    throw wrapped;
  }
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const sendPasswordResetEmail = async ({
  to,
  resetLink,
  ip = "Desconocida",
  device = "Desconocido"
}) =>
  safeSendMail({
    to,
    subject: "Restablece tu contrasena de Quick Secure Market",
    text: [
      "Quick Secure Market",
      "",
      "Recibimos una solicitud para restablecer tu contrasena.",
      resetLink,
      "",
      "El enlace vence en 15 minutos.",
      "IP: " + ip,
      "Dispositivo: " + device
    ].join("\n"),
    html: `
      <div style="font-family:Arial;padding:32px;background:#f8fafc">
        <h1 style="color:#2563eb">Quick Secure Market</h1>
        <p>Recibimos una solicitud para restablecer tu contrasena.</p>
        <p>
          <a
            href="${escapeHtml(resetLink)}"
            style="
              display:inline-block;
              padding:14px 22px;
              background:#2563eb;
              color:white;
              text-decoration:none;
              border-radius:10px;
              font-weight:bold;
            "
          >
            Restablecer contrasena
          </a>
        </p>
        <p>El enlace vence en 15 minutos.</p>
        <p><b>IP:</b> ${escapeHtml(ip)}</p>
        <p><b>Dispositivo:</b> ${escapeHtml(device)}</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      </div>
    `
  });

const sendPasswordChangedEmail = async ({
  to,
  ip = "Desconocida",
  device = "Desconocido"
}) =>
  safeSendMail({
    to,
    subject: "Tu contrasena fue cambiada",
    text: [
      "La contrasena de tu cuenta QSM fue cambiada.",
      "IP: " + ip,
      "Dispositivo: " + device
    ].join("\n"),
    html: `
      <div style="font-family:Arial;padding:32px;background:#f8fafc">
        <h1 style="color:#16a34a">Contrasena actualizada</h1>
        <p>La contrasena de tu cuenta QSM fue cambiada.</p>
        <p><b>IP:</b> ${escapeHtml(ip)}</p>
        <p><b>Dispositivo:</b> ${escapeHtml(device)}</p>
      </div>
    `
  });

const sendTestEmail = async ({ to }) =>
  safeSendMail({
    to,
    subject: "Prueba SMTP de QSM",
    text: "La configuracion SMTP de QSM funciona correctamente.",
    html: `
      <div style="font-family:Arial;padding:32px;background:#f8fafc">
        <h1 style="color:#2563eb">SMTP de QSM confirmado</h1>
        <p>La configuracion de correo funciona correctamente.</p>
      </div>
    `
  });

module.exports = {
  validateEmailConfiguration,
  verifyEmailTransport,
  sendTestEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};
