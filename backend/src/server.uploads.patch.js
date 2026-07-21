/*
En server.js agrega:

const path = require("path");

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

Colócalo antes del middleware 404.

En Vercel no uses almacenamiento local permanente.
Para producción usa Cloudinary, S3, Supabase Storage o disco persistente.
*/
