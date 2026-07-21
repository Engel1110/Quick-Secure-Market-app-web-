/*
INTEGRACIÓN EN message.controller.js

1. Importa:

const {
  analyzeMessageSecurity
} = require("../../services/messages/messageSecurity.service");

2. Justo antes de crear el mensaje:

const securityAnalysis =
  analyzeMessageSecurity(
    req.body.text ||
    req.body.content ||
    ""
  );

3. Dentro de new Message({...}) agrega:

isFlagged:
  securityAnalysis.flagged,

riskLevel:
  securityAnalysis.riskLevel,

aiReason:
  securityAnalysis.reasons
    .map(
      (reason) =>
        `${reason.title}: ${reason.recommendation}`
    )
    .join(" | "),

securityScore:
  securityAnalysis.score,

securityReasons:
  securityAnalysis.reasons

4. Después de guardar, si existe Socket.IO:

const io = req.app.get("io");

if (io) {
  io.to(
    `conversation:${savedMessage.conversation}`
  ).emit(
    "message:new",
    {
      message: savedMessage
    }
  );
}

Esto no bloquea mensajes automáticamente.
Solo clasifica, alerta y guarda evidencia para revisión.
*/
