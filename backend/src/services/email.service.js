const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const companyName = "Quick Secure Market";
const companyShort = "QSM";

const sendPasswordResetEmail = async ({
  to,
  resetLink,
  ip = "Desconocida",
  device = "Desconocido"
}) => {

  const year = new Date().getFullYear();

  await transporter.sendMail({
    from: `"${companyShort} Security" <${process.env.EMAIL_USER}>`,
    to,
    subject: "🔐 Restablece tu contraseña de Quick Secure Market",

    html: `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>QSM Security</title>
</head>

<body style="margin:0;padding:0;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="650" cellpadding="0" cellspacing="0"
style="background:white;border-radius:20px;overflow:hidden;margin:40px auto;box-shadow:0 10px 40px rgba(0,0,0,.12);">

<tr>
<td
style="padding:35px;background:linear-gradient(135deg,#35d0c3,#38bdf8,#8b5cf6);text-align:center;color:white;">

<h1 style="margin:0;font-size:34px;">
🛡 Quick Secure Market
</h1>

<p style="margin-top:12px;font-size:17px;">
Centro de Seguridad
</p>

</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#0f172a;">
Restablecer contraseña
</h2>

<p style="font-size:16px;color:#334155;line-height:30px;">

Recibimos una solicitud para cambiar la contraseña de tu cuenta de
<b>Quick Secure Market</b>.

</p>

<p style="font-size:16px;color:#334155;line-height:30px;">

Si fuiste tú, presiona el siguiente botón.

</p>

<div style="text-align:center;margin:40px 0;">

<a
href="${resetLink}"

style="
display:inline-block;
padding:18px 34px;
background:linear-gradient(135deg,#35d0c3,#38bdf8,#8b5cf6);
color:white;
font-weight:bold;
text-decoration:none;
border-radius:12px;
font-size:17px;
">

Restablecer contraseña

</a>

</div>

<table
width="100%"
style="
border-collapse:collapse;
background:#f8fafc;
border-radius:12px;
">

<tr>

<td
style="
padding:16px;
border-bottom:1px solid #e2e8f0;
font-weight:bold;
width:180px;
">

Expira en

</td>

<td
style="
padding:16px;
border-bottom:1px solid #e2e8f0;
">

15 minutos

</td>

</tr>

<tr>

<td style="padding:16px;font-weight:bold;">
Dirección IP
</td>

<td style="padding:16px;">
${ip}
</td>

</tr>

<tr>

<td style="padding:16px;font-weight:bold;">
Dispositivo
</td>

<td style="padding:16px;">
${device}
</td>

</tr>

</table>

<div
style="
margin-top:35px;
padding:22px;
background:#fff7ed;
border-left:6px solid #f59e0b;
border-radius:10px;
">

<h3 style="margin-top:0;color:#92400e;">
⚠ Aviso de seguridad
</h3>

<p style="margin:0;color:#7c2d12;line-height:28px;">

Si tú NO solicitaste este cambio,
puedes ignorar este correo.
Tu contraseña seguirá siendo la misma.

</p>

</div>

<p
style="
margin-top:40px;
font-size:14px;
color:#64748b;
line-height:28px;
">

Si el botón no funciona, copia este enlace en tu navegador:

</p>

<p
style="
font-size:13px;
word-break:break-all;
color:#2563eb;
">

${resetLink}

</p>

</td>
</tr>

<tr>

<td
style="
background:#0f172a;
color:#94a3b8;
padding:30px;
text-align:center;
font-size:13px;
">

© ${year} Quick Secure Market

<br><br>

Este es un correo automático enviado por el sistema de seguridad.

<br>

No respondas este mensaje.

</td>

</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`
  });
};

const sendPasswordChangedEmail = async ({
  to,
  ip = "Desconocida",
  device = "Desconocido"
}) => {

  const year = new Date().getFullYear();

  await transporter.sendMail({

    from: `"${companyShort} Security" <${process.env.EMAIL_USER}>`,

    to,

    subject: "✅ Tu contraseña fue cambiada",

    html: `

<div style="font-family:Arial;padding:40px;background:#f8fafc;">

<h1 style="color:#22c55e;">
Contraseña actualizada correctamente
</h1>

<p>

La contraseña de tu cuenta de
<b>Quick Secure Market</b>
ha sido cambiada.

</p>

<p>

<b>IP:</b> ${ip}

</p>

<p>

<b>Dispositivo:</b> ${device}

</p>

<div
style="
margin-top:30px;
background:#fee2e2;
padding:18px;
border-left:5px solid #dc2626;
">

<b>

¿No fuiste tú?

</b>

<br><br>

Inicia sesión inmediatamente y cambia nuevamente tu contraseña.

</div>

<hr>

<p>

© ${year} Quick Secure Market

</p>

</div>

`
  });

};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};