const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const REQUIRED_BREVO_VARIABLES = [
  "BREVO_API_KEY",
  "EMAIL_USER"
];

const getEmailConfiguration = () => ({
  apiKey: String(process.env.BREVO_API_KEY || "").trim(),
  fromName: String(
    process.env.EMAIL_FROM_NAME ||
    "QSM Security"
  ).trim(),
  fromAddress: String(
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    ""
  ).trim()
});

const validateEmailConfiguration = () => {
  const config = getEmailConfiguration();

  const missing = REQUIRED_BREVO_VARIABLES.filter(
    (name) => !String(process.env[name] || "").trim()
  );

  if (missing.length > 0) {
    const error = new Error(
      "Configuracion Brevo incompleta. Faltan: " +
      missing.join(", ")
    );

    error.code = "QSM_BREVO_CONFIG_MISSING";
    error.missingVariables = missing;

    throw error;
  }

  return config;
};

const normalizeRecipients = (to) => {
  const values = Array.isArray(to) ? to : [to];

  return values
    .map((item) => {
      if (typeof item === "string") {
        return { email: item.trim() };
      }

      return {
        email: String(item?.email || "").trim(),
        ...(item?.name ? { name: String(item.name).trim() } : {})
      };
    })
    .filter((item) => item.email);
};

const extractBrevoError = async (response) => {
  const raw = await response.text();

  try {
    const parsed = JSON.parse(raw);
    return parsed?.message || parsed?.code || raw || "Error desconocido";
  } catch {
    return raw || "Error desconocido";
  }
};

const safeSendMail = async (options) => {
  const config = validateEmailConfiguration();

  const payload = {
    sender: {
      name: config.fromName,
      email: config.fromAddress
    },
    to: normalizeRecipients(options.to),
    subject: String(options.subject || "").trim(),
    htmlContent: String(options.html || ""),
    textContent: String(options.text || "")
  };

  console.log("========== BREVO ==========");
  console.log({
    sender: payload.sender,
    to: payload.to,
    subject: payload.subject
  });
  console.log("===========================");

  if (payload.to.length === 0) {
    const error = new Error("No se indico un destinatario valido.");
    error.code = "QSM_BREVO_RECIPIENT_REQUIRED";
    throw error;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      const detail = await extractBrevoError(response);

      const error = new Error(
        `Brevo rechazo el correo (${response.status}): ${detail}`
      );

      error.code = "QSM_BREVO_SEND_FAILED";
      error.responseCode = response.status;
      throw error;
    }

    const result = await response.json();

    return {
      messageId: result?.messageId || null,
      accepted: payload.to.map((item) => item.email),
      rejected: [],
      response: "BREVO_API_ACCEPTED"
    };
  } catch (error) {
    if (error?.code === "QSM_BREVO_SEND_FAILED") {
      throw error;
    }

    const wrapped = new Error(
      "No se pudo enviar el correo mediante Brevo: " +
      (error?.message || "Error desconocido")
    );

    wrapped.code =
      error?.name === "TimeoutError"
        ? "QSM_BREVO_TIMEOUT"
        : "QSM_BREVO_REQUEST_FAILED";

    throw wrapped;
  }
};

const verifyEmailTransport = async () => {
  const config = validateEmailConfiguration();

  return {
    success: true,
    message: "Configuracion de Brevo API detectada correctamente.",
    provider: "BREVO_API",
    sender: config.fromAddress
  };
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
    subject: "Restablece tu contraseña de Quick Secure Market",
    text: [
      "Quick Secure Market",
      "",
      "Recibimos una solicitud para restablecer tu contraseña.",
      resetLink,
      "",
      "El enlace vence en 15 minutos.",
      "IP: " + ip,
      "Dispositivo: " + device,
      "",
      "Si no solicitaste este cambio, ignora este correo."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;padding:32px;background:#f8fafc;color:#0f172a">
        <div style="max-width:620px;margin:auto;background:#ffffff;padding:34px;border-radius:18px">
          <h1 style="color:#2563eb">Quick Secure Market</h1>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p style="margin:30px 0">
            <a
              href="${escapeHtml(resetLink)}"
              style="display:inline-block;padding:14px 22px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-weight:bold"
            >
              Restablecer contraseña
            </a>
          </p>
          <p>El enlace vence en <strong>15 minutos</strong>.</p>
          <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
          <p><strong>Dispositivo:</strong> ${escapeHtml(device)}</p>
          <p style="color:#64748b">Si no solicitaste este cambio, ignora este correo.</p>
        </div>
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
    subject: "Tu contraseña de QSM fue cambiada",
    text: [
      "La contraseña de tu cuenta QSM fue cambiada.",
      "IP: " + ip,
      "Dispositivo: " + device,
      "",
      "Si no fuiste tú, contacta con soporte."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;padding:32px;background:#f8fafc">
        <h1 style="color:#16a34a">Contraseña actualizada</h1>
        <p>La contraseña de tu cuenta QSM fue cambiada.</p>
        <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
        <p><strong>Dispositivo:</strong> ${escapeHtml(device)}</p>
      </div>
    `
  });

const sendTestEmail = async ({ to }) =>
  safeSendMail({
    to,
    subject: "Prueba Brevo API de QSM",
    text: "La integracion de QSM con Brevo API funciona correctamente.",
    html: `
      <div style="font-family:Arial,sans-serif;padding:32px;background:#f8fafc">
        <h1 style="color:#2563eb">Brevo API de QSM confirmada</h1>
        <p>La integracion de correo funciona correctamente mediante HTTPS.</p>
      </div>
    `
  });


const sendRecoveryEmailVerificationEmail = async ({
  to,
  verificationLink,
  expiresMinutes = 15
}) =>
  safeSendMail({
    to,
    subject:
      "Verifica tu correo de recuperación de QSM",
    text: [
      "Quick Secure Market",
      "",
      "Confirma este correo como método de recuperación de tu cuenta.",
      verificationLink,
      "",
      "El enlace vence en " + expiresMinutes + " minutos.",
      "",
      "Si no solicitaste este cambio, ignora este correo."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;padding:32px;background:#f8fafc;color:#0f172a">
        <div style="max-width:620px;margin:auto;background:#ffffff;padding:34px;border-radius:18px">
          <h1 style="color:#2563eb">Quick Secure Market</h1>
          <h2>Verifica tu correo de recuperación</h2>
          <p>
            Confirma que este correo será utilizado para recuperar tu cuenta QSM.
          </p>
          <p style="margin:30px 0">
            <a
              href="${escapeHtml(verificationLink)}"
              style="display:inline-block;padding:14px 22px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-weight:bold"
            >
              Verificar correo
            </a>
          </p>
          <p>
            El enlace vence en <strong>${expiresMinutes} minutos</strong>.
          </p>
          <p style="color:#64748b">
            Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>
      </div>
    `
  });

module.exports = {
  validateEmailConfiguration,
  verifyEmailTransport,
  sendTestEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendRecoveryEmailVerificationEmail
};
