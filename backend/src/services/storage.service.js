"use strict";

const crypto = require("node:crypto");
const path = require("node:path");

if (
  !process.env.SUPABASE_URL ||
  !(
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
) {
  require("dotenv").config({
    path: path.resolve(__dirname, "..", "..", ".env"),
    quiet: true
  });
}

const {
  createClient
} = require("@supabase/supabase-js");

const PUBLIC_BUCKET =
  process.env.SUPABASE_PUBLIC_BUCKET ||
  "qsm-public";

const PRIVATE_BUCKET =
  process.env.SUPABASE_PRIVATE_BUCKET ||
  "qsm-private";

const DEFAULT_SIGNED_URL_TTL =
  Math.max(
    300,
    Number(
      process.env.SUPABASE_SIGNED_URL_TTL ||
      3600
    )
  );

let client = null;

function getSupabaseClient() {
  if (client) {
    return client;
  }

  const url = String(
    process.env.SUPABASE_URL || ""
  ).trim();

  const secretKey = String(
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!url || !secretKey) {
    throw new Error(
      "Faltan las credenciales de Supabase Storage en backend/.env."
    );
  }

  client = createClient(
    url,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  return client;
}

function sanitizeSegment(
  value,
  fallback = "file"
) {
  const clean = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 100);

  return clean || fallback;
}

function sanitizeFolder(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) =>
      sanitizeSegment(segment, "files")
    )
    .filter(Boolean)
    .join("/");
}

function buildObjectPath(
  folder,
  originalName
) {
  const safeFolder =
    sanitizeFolder(folder) ||
    "misc";

  const safeName =
    sanitizeSegment(
      originalName,
      "qsm-file"
    );

  return [
    safeFolder,
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`
  ].join("/");
}

function cleanObjectPath(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function publicObjectPathFromUrl(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const marker =
    `/storage/v1/object/public/${PUBLIC_BUCKET}/`;

  const index = text.indexOf(marker);

  if (index < 0) {
    return "";
  }

  const encodedPath =
    text
      .slice(index + marker.length)
      .split("?")[0]
      .split("#")[0];

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

function privateReferenceFromObjectPath(
  objectPath
) {
  const cleanPath =
    cleanObjectPath(objectPath);

  return cleanPath
    ? `qsm-private://${cleanPath}`
    : "";
}

function privateObjectPathFromReference(
  value
) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const privatePrefix =
    "qsm-private://";

  if (text.startsWith(privatePrefix)) {
    return cleanObjectPath(
      text.slice(privatePrefix.length)
    );
  }

  const markers = [
    `/storage/v1/object/sign/${PRIVATE_BUCKET}/`,
    `/storage/v1/object/authenticated/${PRIVATE_BUCKET}/`
  ];

  for (const marker of markers) {
    const index = text.indexOf(marker);

    if (index < 0) {
      continue;
    }

    const encodedPath = text
      .slice(index + marker.length)
      .split("?")[0]
      .split("#")[0];

    try {
      return cleanObjectPath(
        decodeURIComponent(encodedPath)
      );
    } catch {
      return cleanObjectPath(encodedPath);
    }
  }

  return "";
}

async function uploadPublicFile(
  file,
  {
    folder = "misc",
    cacheControl = "3600"
  } = {}
) {
  if (
    !file?.buffer ||
    !Buffer.isBuffer(file.buffer)
  ) {
    throw new Error(
      "El archivo no contiene un buffer válido para Supabase Storage."
    );
  }

  const supabase =
    getSupabaseClient();

  const objectPath =
    buildObjectPath(
      folder,
      file.originalname
    );

  const {
    error: uploadError
  } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(
      objectPath,
      file.buffer,
      {
        contentType:
          file.mimetype ||
          "application/octet-stream",
        cacheControl,
        upsert: false
      }
    );

  if (uploadError) {
    throw new Error(
      `No se pudo subir ${file.originalname || "el archivo"}: ${uploadError.message}`
    );
  }

  const {
    data
  } = supabase.storage
    .from(PUBLIC_BUCKET)
    .getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    await deletePublicObjectPath(
      objectPath
    );

    throw new Error(
      "Supabase no devolvió la URL pública del archivo."
    );
  }

  return {
    bucket: PUBLIC_BUCKET,
    objectPath,
    url: data.publicUrl,
    originalName:
      file.originalname || "",
    filename:
      path.posix.basename(objectPath),
    mimeType:
      file.mimetype ||
      "application/octet-stream",
    mimetype:
      file.mimetype ||
      "application/octet-stream",
    size:
      Number(file.size) ||
      file.buffer.length
  };
}

async function uploadPrivateFile(
  file,
  {
    folder = "private",
    cacheControl = "3600",
    expiresIn =
      DEFAULT_SIGNED_URL_TTL
  } = {}
) {
  if (
    !file?.buffer ||
    !Buffer.isBuffer(file.buffer)
  ) {
    throw new Error(
      "El archivo no contiene un buffer válido para Supabase Storage."
    );
  }

  const supabase =
    getSupabaseClient();

  const objectPath =
    buildObjectPath(
      folder,
      file.originalname
    );

  const {
    error: uploadError
  } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(
      objectPath,
      file.buffer,
      {
        contentType:
          file.mimetype ||
          "application/octet-stream",
        cacheControl,
        upsert: false
      }
    );

  if (uploadError) {
    throw new Error(
      `No se pudo subir ${file.originalname || "el archivo"}: ${uploadError.message}`
    );
  }

  const storageRef =
    privateReferenceFromObjectPath(
      objectPath
    );

  let signedUrl = "";

  try {
    signedUrl =
      await createPrivateSignedUrl(
        storageRef,
        expiresIn
      );
  } catch (error) {
    await deletePrivateObjectPath(
      objectPath
    );

    throw error;
  }

  return {
    bucket: PRIVATE_BUCKET,
    objectPath,
    storageRef,
    url: signedUrl,
    signedUrl,
    originalName:
      file.originalname || "",
    filename:
      path.posix.basename(objectPath),
    mimeType:
      file.mimetype ||
      "application/octet-stream",
    mimetype:
      file.mimetype ||
      "application/octet-stream",
    size:
      Number(file.size) ||
      file.buffer.length
  };
}

async function createPrivateSignedUrl(
  value,
  expiresIn =
    DEFAULT_SIGNED_URL_TTL
) {
  const objectPath =
    privateObjectPathFromReference(
      value
    );

  if (!objectPath) {
    return String(value || "");
  }

  const supabase =
    getSupabaseClient();

  const {
    data,
    error
  } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(
      objectPath,
      Math.max(
        60,
        Number(expiresIn) ||
        DEFAULT_SIGNED_URL_TTL
      )
    );

  if (error || !data?.signedUrl) {
    throw new Error(
      `No se pudo firmar ${objectPath}: ${error?.message || "URL no disponible"}`
    );
  }

  return data.signedUrl;
}

async function signPrivateReferencesDeep(
  value,
  expiresIn =
    DEFAULT_SIGNED_URL_TTL,
  key = ""
) {
  if (typeof value === "string") {
    if (
      [
        "storageRef",
        "storagePath",
        "objectPath",
        "bucket"
      ].includes(key)
    ) {
      return value;
    }

    return createPrivateSignedUrl(
      value,
      expiresIn
    );
  }

  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) =>
        signPrivateReferencesDeep(
          item,
          expiresIn
        )
      )
    );
  }

  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value)
  ) {
    const entries =
      await Promise.all(
        Object.entries(value).map(
          async ([entryKey, item]) => [
            entryKey,
            await signPrivateReferencesDeep(
              item,
              expiresIn,
              entryKey
            )
          ]
        )
      );

    return Object.fromEntries(entries);
  }

  return value;
}

function privateResponseSigningMiddleware(
  _req,
  res,
  next
) {
  const originalJson =
    res.json.bind(res);

  let started = false;

  res.json = function signedJson(
    payload
  ) {
    if (started) {
      return originalJson(
        payload
      );
    }

    started = true;

    /*
     * Restauramos res.json antes del trabajo asíncrono.
     * Así el manejador global todavía puede responder
     * normalmente si la firma de una URL falla.
     */
    res.json =
      originalJson;

    signPrivateReferencesDeep(payload)
      .then((signedPayload) =>
        originalJson(
          signedPayload
        )
      )
      .catch(next);

    return res;
  };

  next();
}

async function deletePublicObjectPath(
  objectPath
) {
  const cleanPath =
    cleanObjectPath(objectPath);

  if (!cleanPath) {
    return false;
  }

  const supabase =
    getSupabaseClient();

  const {
    error
  } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .remove([cleanPath]);

  if (error) {
    throw new Error(
      `No se pudo eliminar ${cleanPath}: ${error.message}`
    );
  }

  return true;
}

async function deletePrivateObjectPath(
  objectPath
) {
  const cleanPath =
    cleanObjectPath(objectPath);

  if (!cleanPath) {
    return false;
  }

  const supabase =
    getSupabaseClient();

  const {
    error
  } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .remove([cleanPath]);

  if (error) {
    throw new Error(
      `No se pudo eliminar ${cleanPath}: ${error.message}`
    );
  }

  return true;
}

async function deletePublicFileByUrl(
  value
) {
  const objectPath =
    publicObjectPathFromUrl(value);

  if (!objectPath) {
    return false;
  }

  return deletePublicObjectPath(
    objectPath
  );
}

async function deletePublicObjectPaths(
  objectPaths = []
) {
  const cleanPaths = [
    ...new Set(
      (
        Array.isArray(objectPaths)
          ? objectPaths
          : []
      )
        .map(cleanObjectPath)
        .filter(Boolean)
    )
  ];

  if (cleanPaths.length === 0) {
    return 0;
  }

  const supabase =
    getSupabaseClient();

  const {
    error
  } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .remove(cleanPaths);

  if (error) {
    throw new Error(
      `No se pudieron limpiar archivos públicos: ${error.message}`
    );
  }

  return cleanPaths.length;
}

async function deletePrivateObjectPaths(
  objectPaths = []
) {
  const cleanPaths = [
    ...new Set(
      (
        Array.isArray(objectPaths)
          ? objectPaths
          : []
      )
        .map(cleanObjectPath)
        .filter(Boolean)
    )
  ];

  if (cleanPaths.length === 0) {
    return 0;
  }

  const supabase =
    getSupabaseClient();

  const {
    error
  } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .remove(cleanPaths);

  if (error) {
    throw new Error(
      `No se pudieron limpiar archivos privados: ${error.message}`
    );
  }

  return cleanPaths.length;
}

async function assertBucket(
  name,
  expectedPublic
) {
  const supabase =
    getSupabaseClient();

  const {
    data,
    error
  } = await supabase.storage
    .listBuckets();

  if (error) {
    throw new Error(
      `No se pudo consultar Supabase Storage: ${error.message}`
    );
  }

  const bucket =
    data.find(
      (item) =>
        item.name === name
    );

  if (!bucket) {
    throw new Error(
      `No existe el bucket ${name}.`
    );
  }

  if (
    Boolean(bucket.public) !==
    Boolean(expectedPublic)
  ) {
    throw new Error(
      `El bucket ${name} tiene una privacidad incorrecta.`
    );
  }

  return {
    name: bucket.name,
    public: bucket.public
  };
}

const assertPublicBucket = () =>
  assertBucket(
    PUBLIC_BUCKET,
    true
  );

const assertPrivateBucket = () =>
  assertBucket(
    PRIVATE_BUCKET,
    false
  );

module.exports = {
  PUBLIC_BUCKET,
  PRIVATE_BUCKET,
  DEFAULT_SIGNED_URL_TTL,
  getSupabaseClient,
  uploadPublicFile,
  uploadPrivateFile,
  createPrivateSignedUrl,
  signPrivateReferencesDeep,
  privateResponseSigningMiddleware,
  deletePublicFileByUrl,
  deletePublicObjectPath,
  deletePublicObjectPaths,
  deletePrivateObjectPath,
  deletePrivateObjectPaths,
  publicObjectPathFromUrl,
  privateReferenceFromObjectPath,
  privateObjectPathFromReference,
  assertPublicBucket,
  assertPrivateBucket
};