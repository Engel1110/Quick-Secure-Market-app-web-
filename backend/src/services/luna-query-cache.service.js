"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA QUERY CACHE
|--------------------------------------------------------------------------
| Fase 17 Bloque 9
|
| Cache efímero en memoria.
|
| NO usa Redis.
| NO usa servicios externos.
| NO genera costo.
| NO almacena información permanentemente.
|--------------------------------------------------------------------------
*/

const DEFAULT_TTL_MS =
  15000;

const MAX_ENTRIES =
  250;

const cache =
  new Map();

function now() {
  return Date.now();
}

function normalizeKeyPart(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .slice(
      0,
      500
    );
}

function buildLunaCacheKey({
  namespace =
    "default",

  userId =
    "anonymous",

  query =
    "",

  extra =
    ""
} = {}) {
  return [
    normalizeKeyPart(
      namespace
    ),

    normalizeKeyPart(
      userId
    ),

    normalizeKeyPart(
      query
    ),

    normalizeKeyPart(
      extra
    )
  ].join(
    "::"
  );
}

function cleanupExpired() {
  const current =
    now();

  for (
    const [
      key,
      entry
    ]
    of cache.entries()
  ) {
    if (
      !entry ||
      entry.expiresAt <=
        current
    ) {
      cache.delete(
        key
      );
    }
  }
}

function enforceLimit() {
  if (
    cache.size <=
      MAX_ENTRIES
  ) {
    return;
  }

  const excess =
    cache.size -
    MAX_ENTRIES;

  const keys =
    Array.from(
      cache.keys()
    );

  for (
    let index = 0;
    index < excess;
    index += 1
  ) {
    cache.delete(
      keys[index]
    );
  }
}

function setLunaCache(
  key,
  value,
  ttlMs =
    DEFAULT_TTL_MS
) {
  if (!key) {
    return;
  }

  cleanupExpired();

  cache.set(
    key,
    {
      value,

      createdAt:
        now(),

      expiresAt:
        now() +
        Math.max(
          1000,
          Number(
            ttlMs
          ) ||
          DEFAULT_TTL_MS
        )
    }
  );

  enforceLimit();
}

function getLunaCache(
  key
) {
  if (!key) {
    return null;
  }

  const entry =
    cache.get(
      key
    );

  if (!entry) {
    return null;
  }

  if (
    entry.expiresAt <=
      now()
  ) {
    cache.delete(
      key
    );

    return null;
  }

  return entry.value;
}

function deleteLunaCache(
  key
) {
  return cache.delete(
    key
  );
}

function clearLunaCache() {
  cache.clear();
}

function getLunaCacheStats() {
  cleanupExpired();

  return {
    entries:
      cache.size,

    maximum:
      MAX_ENTRIES,

    defaultTtlMs:
      DEFAULT_TTL_MS,

    persistent:
      false,

    externalService:
      false
  };
}

async function withLunaCache({
  key,
  ttlMs =
    DEFAULT_TTL_MS,

  loader
} = {}) {
  if (
    typeof loader !==
      "function"
  ) {
    throw new Error(
      "withLunaCache requiere loader."
    );
  }

  const cached =
    getLunaCache(
      key
    );

  if (
    cached !==
      null
  ) {
    return {
      value:
        cached,

      cached:
        true
    };
  }

  const value =
    await loader();

  setLunaCache(
    key,
    value,
    ttlMs
  );

  return {
    value,

    cached:
      false
  };
}

module.exports = {
  buildLunaCacheKey,
  setLunaCache,
  getLunaCache,
  deleteLunaCache,
  clearLunaCache,
  getLunaCacheStats,
  withLunaCache
};
