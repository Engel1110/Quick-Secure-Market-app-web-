require("dotenv").config();

const {
  validateEmailConfiguration,
  verifyEmailTransport,
  sendTestEmail
} = require("../src/services/email.service");

const destination = String(process.argv[2] || "").trim();

const mask = (value) => {
  const text = String(value || "");

  if (text.length <= 4) {
    return "****";
  }

  return text.slice(0, 2) +
    "*".repeat(Math.max(text.length - 4, 4)) +
    text.slice(-2);
};

const run = async () => {
  try {
    const config = validateEmailConfiguration();

    console.log(
      JSON.stringify(
        {
          host: config.host,
          port: config.port,
          user: mask(config.user),
          fromAddress: mask(config.fromAddress)
        },
        null,
        2
      )
    );

    const verification = await verifyEmailTransport();
    console.log(verification.message);

    if (!destination) {
      console.log(
        'Para enviar prueba: node scripts/test-email.js "correo@dominio.com"'
      );
      return;
    }

    const result = await sendTestEmail({
      to: destination
    });

    console.log(
      JSON.stringify(
        {
          success: true,
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
          response: result.response
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          code: error?.code,
          message: error?.message,
          responseCode: error?.responseCode,
          command: error?.command,
          missingVariables: error?.missingVariables
        },
        null,
        2
      )
    );

    process.exit(1);
  }
};

run();
