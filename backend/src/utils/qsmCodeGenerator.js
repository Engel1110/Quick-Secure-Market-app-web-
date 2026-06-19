const crypto = require("crypto");

const getCategoryPrefix = (category = "", title = "") => {
  const text = `${category} ${title}`.toLowerCase();

  if (text.includes("iphone")) return "IP";
  if (text.includes("laptop")) return "LT";
  if (text.includes("playstation") || text.includes("ps5")) return "PS";
  if (text.includes("tablet") || text.includes("ipad")) return "TB";
  if (text.includes("tv") || text.includes("televisor")) return "TV";
  if (text.includes("ropa")) return "RP";
  if (text.includes("zapato") || text.includes("tenis")) return "ZP";
  if (text.includes("electro")) return "EL";
  if (text.includes("mueble")) return "MB";

  return "GN";
};

const generateQsmCode = (category, title) => {
  const prefix = getCategoryPrefix(category, title);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `QSM-${prefix}-${random}`;
};

const generatePhotoHash = (imageUrl = "") => {
  return crypto
    .createHash("sha256")
    .update(imageUrl.trim().toLowerCase())
    .digest("hex");
};

module.exports = {
  generateQsmCode,
  generatePhotoHash
};