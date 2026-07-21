/*
|--------------------------------------------------------------------------
| Quick Secure Market - Configuración de Cloudinary
|--------------------------------------------------------------------------
| Ruta:
| backend/src/config/cloudinary.js
|--------------------------------------------------------------------------
*/

const { v2: cloudinary } = require("cloudinary");

/*
|--------------------------------------------------------------------------
| Validar variables de entorno
|--------------------------------------------------------------------------
*/

const requiredEnvironmentVariables = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

const missingEnvironmentVariables =
  requiredEnvironmentVariables.filter(
    (variableName) =>
      !String(
        process.env[variableName] || ""
      ).trim()
  );

if (missingEnvironmentVariables.length > 0) {
  console.warn(
    `Cloudinary no está completamente configurado. Faltan: ${missingEnvironmentVariables.join(
      ", "
    )}`
  );
}

/*
|--------------------------------------------------------------------------
| Configuración
|--------------------------------------------------------------------------
*/

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,

  secure: true
});

/*
|--------------------------------------------------------------------------
| Comprobar configuración
|--------------------------------------------------------------------------
*/

const isCloudinaryConfigured = () => {
  return requiredEnvironmentVariables.every(
    (variableName) =>
      Boolean(
        String(
          process.env[variableName] || ""
        ).trim()
      )
  );
};

/*
|--------------------------------------------------------------------------
| Obtener estado seguro
|--------------------------------------------------------------------------
| Nunca devuelve el API Secret.
|--------------------------------------------------------------------------
*/

const getCloudinaryStatus = () => {
  return {
    configured:
      isCloudinaryConfigured(),

    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME ||
      null,

    apiKeyConfigured:
      Boolean(
        process.env.CLOUDINARY_API_KEY
      ),

    apiSecretConfigured:
      Boolean(
        process.env.CLOUDINARY_API_SECRET
      )
  };
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  getCloudinaryStatus
};