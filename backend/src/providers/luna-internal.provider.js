"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA INTERNAL PROVIDER
|--------------------------------------------------------------------------
|
| Representa todo lo que LUNA ya conoce por medio de:
| - PostgreSQL / Supabase
| - Prisma
| - QSM AI Core
| - reglas internas
| - contexto de usuario
|--------------------------------------------------------------------------
*/

const PROVIDER_NAME =
  "INTERNAL";

async function executeInternalProvider({
  answer = null,
  context = null,
  intent = null,
  metadata = null
} = {}) {
  const cleanAnswer =
    typeof answer ===
      "string"
      ? answer.trim()
      : "";

  return {
    ok:
      Boolean(
        cleanAnswer
      ),

    provider:
      PROVIDER_NAME,

    source:
      "QSM",

    intent:
      intent ||
      null,

    answer:
      cleanAnswer ||
      null,

    context:
      context ||
      null,

    metadata: {
      ...(metadata || {}),

      external:
        false,

      generatedBy:
        "QSM_INTERNAL_ENGINE"
    }
  };
}

function getInternalProviderStatus() {
  return {
    provider:
      PROVIDER_NAME,

    enabled:
      true,

    ready:
      true,

    requiresApiKey:
      false,

    description:
      "Motor interno y datos privados de QSM."
  };
}

module.exports = {
  executeInternalProvider,
  getInternalProviderStatus
};
