const {
  analyzeMessageSecurity
} = require("../services/messages/messageSecurity.service");

function applyMessageSecurity(messageData = {}) {
  const content =
    messageData.text ||
    messageData.content ||
    "";

  const analysis =
    analyzeMessageSecurity(content);

  return {
    ...messageData,
    isFlagged:
      analysis.flagged,
    riskLevel:
      analysis.riskLevel,
    aiReason:
      analysis.reasons
        .map(
          (reason) =>
            `${reason.title}: ${reason.recommendation}`
        )
        .join(" | "),
    securityScore:
      analysis.score
  };
}

module.exports = {
  applyMessageSecurity
};
