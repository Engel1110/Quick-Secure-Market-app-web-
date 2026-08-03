import {
  useEffect,
  useState
} from "react";

import {
  Link,
  useSearchParams
} from "react-router-dom";

import api from "../api/axios";

function VerifyRecoveryEmail() {
  const [
    searchParams
  ] = useSearchParams();

  const token =
    String(
      searchParams.get("token") || ""
    ).trim();

  const [
    state,
    setState
  ] = useState({
    loading: true,
    success: false,
    message: ""
  });

  useEffect(
    () => {
      const verify =
        async () => {
          if (!token) {
            setState({
              loading: false,
              success: false,
              message:
                "El enlace no contiene un token válido."
            });

            return;
          }

          try {
            const response =
              await api.post(
                "/auth/recovery-email/verify",
                {
                  token
                }
              );

            setState({
              loading: false,
              success: true,
              message:
                response.data
                  ?.message ||
                "Correo de recuperación verificado correctamente."
            });
          } catch (
            requestError
          ) {
            setState({
              loading: false,
              success: false,
              message:
                requestError
                  ?.response
                  ?.data
                  ?.message ||
                "El enlace es inválido o expiró."
            });
          }
        };

      verify();
    },
    [
      token
    ]
  );

  return (
    <main style={page}>
      <section style={card}>
        <div style={icon}>
          {state.loading
            ? "⏳"
            : state.success
              ? "✅"
              : "⚠️"}
        </div>

        <p style={label}>
          SEGURIDAD QSM
        </p>

        <h1 style={title}>
          Verificar correo de recuperación
        </h1>

        <div
          style={
            state.loading
              ? infoBox
              : state.success
                ? successBox
                : errorBox
          }
        >
          {state.loading
            ? "Verificando enlace..."
            : state.message}
        </div>

        <Link
          to={
            state.success
              ? "/settings"
              : "/login"
          }
          style={button}
        >
          {state.success
            ? "Volver a Configuración"
            : "Ir al inicio de sesión"}
        </Link>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  color: "#ffffff",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.22), transparent 32%), radial-gradient(circle at 20% 20%, rgba(53,208,195,.16), transparent 28%), #020617",
  fontFamily:
    'Inter, "Plus Jakarta Sans", system-ui, sans-serif'
};

const card = {
  width: "100%",
  maxWidth: "560px",
  padding: "36px",
  borderRadius: "30px",
  textAlign: "center",
  background:
    "rgba(15,23,42,.80)",
  border:
    "1px solid rgba(53,208,195,.22)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,.35)",
  backdropFilter:
    "blur(18px)"
};

const icon = {
  width: "76px",
  height: "76px",
  margin: "0 auto 18px",
  display: "grid",
  placeItems: "center",
  borderRadius: "24px",
  fontSize: "34px",
  background:
    "linear-gradient(135deg, #35d0c3, #8b5cf6)"
};

const label = {
  margin: 0,
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: 950
};

const title = {
  margin: "12px 0 22px",
  fontSize:
    "clamp(30px, 5vw, 42px)"
};

const infoBox = {
  padding: "15px",
  borderRadius: "15px",
  background:
    "rgba(56,189,248,.12)",
  border:
    "1px solid rgba(56,189,248,.25)",
  color: "#bae6fd",
  lineHeight: "25px"
};

const successBox = {
  ...infoBox,
  background:
    "rgba(34,197,94,.14)",
  border:
    "1px solid rgba(34,197,94,.30)",
  color: "#bbf7d0"
};

const errorBox = {
  ...infoBox,
  background:
    "rgba(127,29,29,.24)",
  border:
    "1px solid rgba(248,113,113,.30)",
  color: "#fecaca"
};

const button = {
  display: "inline-flex",
  marginTop: "22px",
  minHeight: "50px",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 20px",
  borderRadius: "14px",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 950,
  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)"
};

export default VerifyRecoveryEmail;
