const normalizeOrigin = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const splitOrigins = (value) =>
  String(value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const localOrigin = (port) =>
  ["http:", "", `localhost:${port}`]
    .join("/");

const DEVELOPMENT_ORIGINS = [
  localOrigin(5174),
  localOrigin(5173),
  localOrigin(3000)
];

const DEFAULT_PRODUCTION_ORIGINS = [
  "https://quick-secure-market-app-web.vercel.app"
];

const getAllowedOrigins = () => {
  const configuredOrigins = [
    ...splitOrigins(process.env.FRONTEND_URL),
    ...splitOrigins(process.env.PUBLIC_FRONTEND_URL),
    ...splitOrigins(process.env.APP_URL),
    ...splitOrigins(process.env.ALLOWED_ORIGINS)
  ];

  const defaults =
    process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_ORIGINS
      : [
          ...DEVELOPMENT_ORIGINS,
          ...DEFAULT_PRODUCTION_ORIGINS
        ];

  return Array.from(
    new Set(
      [
        ...configuredOrigins,
        ...defaults
      ].filter(Boolean)
    )
  );
};

const getFrontendUrl = () => {
  const configured = [
    ...splitOrigins(process.env.FRONTEND_URL),
    ...splitOrigins(process.env.PUBLIC_FRONTEND_URL),
    ...splitOrigins(process.env.APP_URL)
  ][0];

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_ORIGINS[0];
  }

  return DEVELOPMENT_ORIGINS[0];
};

module.exports = {
  getAllowedOrigins,
  getFrontendUrl,
  splitOrigins,
  normalizeOrigin
};
