import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useParams
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

import {
  formatUser,
  getAvatar,
  getInitials,
  resolveMediaUrl
} from "../utils/message.utils";

import "../styles/public-profile.css";

export default function PublicProfile() {
  const {
    id
  } = useParams();

  const [
    profile,
    setProfile
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/users/${id}/public`
          );

        if (!active) {
          return;
        }

        setProfile(
          response?.data?.profile ||
          null
        );
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError?.response
            ?.data?.message ||
          "No se pudo cargar el perfil."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [id]);

  const name =
    useMemo(
      () =>
        formatUser(
          profile,
          "Usuario QSM"
        ),
      [profile]
    );

  const avatar =
    getAvatar(profile);

  const products =
    Array.isArray(
      profile?.products
    )
      ? profile.products
      : [];

  const reviews =
    Array.isArray(
      profile?.reviewsReceived
    )
      ? profile.reviewsReceived
      : [];

  const location =
    [
      profile?.city,
      profile?.province,
      profile?.country
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <div className="public-profile-page">
      <aside className="public-profile-sidebar">
        <Sidebar />
      </aside>

      <main className="public-profile-main">
        <Topbar />

        <div className="public-profile-shell">
          <Link
            to="/messages"
            className="public-profile-back"
          >
            ← Volver a mensajes
          </Link>

          {loading && (
            <div className="public-profile-state">
              Cargando perfil...
            </div>
          )}

          {!loading && error && (
            <div className="public-profile-state is-error">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            profile && (
              <>
                <section className="public-profile-hero">
                  <div className="public-profile-cover" />

                  <div className="public-profile-identity">
                    <div className="public-profile-avatar">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={`Foto de ${name}`}
                        />
                      ) : (
                        <span>
                          {getInitials(name)}
                        </span>
                      )}
                    </div>

                    <div className="public-profile-copy">
                      <p>
                        PERFIL PÚBLICO QSM
                      </p>

                      <h1>{name}</h1>

                      <div className="public-profile-badges">
                        <span
                          className={
                            profile.isVerified
                              ? "is-verified"
                              : ""
                          }
                        >
                          {profile.isVerified
                            ? "✓ Usuario verificado"
                            : "Verificación pendiente"}
                        </span>

                        <span>
                          Confianza{" "}
                          {Number(
                            profile.trustScore ||
                              50
                          )}
                          /100
                        </span>

                        {location && (
                          <span>
                            {location}
                          </span>
                        )}
                      </div>

                      <small>
                        Miembro desde{" "}
                        {formatDate(
                          profile.createdAt
                        )}
                      </small>
                    </div>

                    <Link
                      to="/messages"
                      className="public-profile-message"
                    >
                      Enviar mensaje
                    </Link>
                  </div>
                </section>

                <section className="public-profile-stats">
                  <Stat
                    label="Productos"
                    value={
                      profile?.stats
                        ?.products || 0
                    }
                  />

                  <Stat
                    label="Ventas completadas"
                    value={
                      profile?.stats
                        ?.completedSales || 0
                    }
                  />

                  <Stat
                    label="Compras completadas"
                    value={
                      profile?.stats
                        ?.completedPurchases ||
                      0
                    }
                  />

                  <Stat
                    label="Calificación"
                    value={
                      profile?.stats
                        ?.reviews
                        ? `${profile.stats.ratingAverage}/5`
                        : "Sin reseñas"
                    }
                  />
                </section>

                <section className="public-profile-section">
                  <header>
                    <div>
                      <p>PUBLICACIONES</p>
                      <h2>
                        Productos recientes
                      </h2>
                    </div>
                  </header>

                  {products.length === 0 ? (
                    <div className="public-profile-empty">
                      Este usuario todavía no tiene productos visibles.
                    </div>
                  ) : (
                    <div className="public-profile-products">
                      {products.map(
                        (product) => {
                          const image =
                            resolveMediaUrl(
                              product.imageUrl ||
                                product
                                  .images?.[0] ||
                                ""
                            );

                          return (
                            <Link
                              key={product.id}
                              to={`/product/${product.id}`}
                              className="public-profile-product"
                            >
                              <div>
                                {image ? (
                                  <img
                                    src={image}
                                    alt={
                                      product.title
                                    } loading="lazy" decoding="async" />
                                ) : (
                                  <span>
                                    📦
                                  </span>
                                )}
                              </div>

                              <strong>
                                {product.title}
                              </strong>

                              <small>
                                {formatMoney(
                                  product.price
                                )}
                              </small>
                            </Link>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>

                <section className="public-profile-section">
                  <header>
                    <div>
                      <p>REPUTACIÓN</p>
                      <h2>
                        Opiniones recibidas
                      </h2>
                    </div>
                  </header>

                  {reviews.length === 0 ? (
                    <div className="public-profile-empty">
                      Este usuario todavía no tiene reseñas.
                    </div>
                  ) : (
                    <div className="public-profile-reviews">
                      {reviews.map(
                        (review) => {
                          const reviewerName =
                            formatUser(
                              review.reviewer,
                              "Usuario QSM"
                            );

                          const reviewerAvatar =
                            getAvatar(
                              review.reviewer
                            );

                          return (
                            <article
                              key={review.id}
                              className="public-profile-review"
                            >
                              <div className="public-profile-review-avatar">
                                {reviewerAvatar ? (
                                  <img
                                    src={
                                      reviewerAvatar
                                    }
                                    alt={
                                      reviewerName
                                    }
                                  />
                                ) : (
                                  <span>
                                    {getInitials(
                                      reviewerName
                                    )}
                                  </span>
                                )}
                              </div>

                              <div>
                                <strong>
                                  {reviewerName}
                                </strong>

                                <span>
                                  {"★".repeat(
                                    Math.max(
                                      0,
                                      Math.min(
                                        5,
                                        Number(
                                          review.rating ||
                                            0
                                        )
                                      )
                                    )
                                  )}
                                </span>

                                <p>
                                  {review.comment ||
                                    "Calificación sin comentario."}
                                </p>

                                <small>
                                  {formatDate(
                                    review.createdAt
                                  )}
                                </small>
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>
              </>
            )}
        </div>
      </main>

      <AiAssistant pageContext="public-profile" />
    </div>
  );
}

function Stat({
  label,
  value
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat(
    "es-DO",
    {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}

function formatDate(value) {
  if (!value) {
    return "Fecha no disponible";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat(
    "es-DO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  ).format(date);
}
