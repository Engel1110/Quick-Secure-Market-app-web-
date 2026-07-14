import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

/*
|--------------------------------------------------------------------------
| Valores predeterminados
|--------------------------------------------------------------------------
*/

const DEFAULT_USER = {
  firstName: "Usuario",
  lastName: "QSM",
  email: "usuario@qsm.com",

  username: "",
  phone: "",
  country: "República Dominicana",
  province: "",
  city: "",
  address: "",
  dateOfBirth: "",
  gender: "PREFER_NOT_TO_SAY",
  bio: "",

  profilePhoto: "",
  coverPhoto: "",

  trustScore: 50,

  role: "USER",
  status: "PENDING",

  buyerEnabled: true,
  sellerEnabled: true,

  isVerified: false,
  verificationStatus: "NOT_STARTED",
  securityLevel: "NORMAL"
};

const DEFAULT_SETTINGS = {
  theme: "dark",
  accentColor: "cyan",
  language: "es",
  density: "comfortable",
  animations: true,
  glassEffect: true,
  compactSidebar: false
};

const ALLOWED_PROFILE_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const MAX_PROFILE_IMAGE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_COVER_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const MAX_COVER_IMAGE_SIZE =
  8 * 1024 * 1024;

/*
|--------------------------------------------------------------------------
| Componente principal
|--------------------------------------------------------------------------
*/

function Profile() {
  const navigate =
    useNavigate();

  /*
  |--------------------------------------------------------------------------
  | Información local de respaldo
  |--------------------------------------------------------------------------
  */

  const savedUser =
    useMemo(() => {
      return {
        ...DEFAULT_USER,
        ...(
          safeJson(
            localStorage.getItem(
              "qsm_user"
            )
          ) ||
          safeJson(
            localStorage.getItem(
              "user"
            )
          ) ||
          {}
        )
      };
    }, []);

  const savedSettings =
    useMemo(() => {
      const storedSettings =
        safeJson(
          localStorage.getItem(
            "qsm_settings"
          )
        ) || {};

      return {
        ...DEFAULT_SETTINGS,
        ...storedSettings,

        theme:
          localStorage.getItem(
            "qsm_theme"
          ) ||
          storedSettings?.theme ||
          DEFAULT_SETTINGS.theme,

        accentColor:
          localStorage.getItem(
            "qsm_accent"
          ) ||
          storedSettings?.accentColor ||
          DEFAULT_SETTINGS.accentColor,

        language:
          localStorage.getItem(
            "qsm_language"
          ) ||
          storedSettings?.language ||
          DEFAULT_SETTINGS.language
      };
    }, []);

  /*
  |--------------------------------------------------------------------------
  | Estados principales
  |--------------------------------------------------------------------------
  */

  const [
    user,
    setUser
  ] = useState(savedUser);

  const [
    settings,
    setSettings
  ] = useState(
    savedSettings
  );

  const [
    sidebarCollapsed,
    setSidebarCollapsed
  ] = useState(() => {
    return (
      localStorage.getItem(
        "qsm_sidebar_collapsed"
      ) === "true"
    );
  });

  /*
  |--------------------------------------------------------------------------
  | Imágenes
  |--------------------------------------------------------------------------
  */

  const [
    profilePreview,
    setProfilePreview
  ] = useState(() => {
    return getProfilePhotoUrl(
      savedUser?.profilePhoto ||
      savedUser?.avatar ||
      savedUser?.photo ||
      ""
    );
  });

  const [
    coverPreview,
    setCoverPreview
  ] = useState(() => {
    return getCoverPhotoUrl(
      savedUser?.coverPhoto ||
      ""
    );
  });

  const [
    profileFile,
    setProfileFile
  ] = useState(null);

  const [
    coverFile,
    setCoverFile
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Estadísticas
  |--------------------------------------------------------------------------
  */

  const [
    stats,
    setStats
  ] = useState({
    products: 0,
    sales: 0,
    purchases: 0,
    disputes: 0
  });

  /*
  |--------------------------------------------------------------------------
  | Estados de la interfaz
  |--------------------------------------------------------------------------
  */

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    uploadingProfilePhoto,
    setUploadingProfilePhoto
  ] = useState(false);

  const [
    uploadingCoverPhoto,
    setUploadingCoverPhoto
  ] = useState(false);

  const [
    deletingProfilePhoto,
    setDeletingProfilePhoto
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const [
    warnings,
    setWarnings
  ] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | Formulario compatible con User.js
  |--------------------------------------------------------------------------
  */

  const [
    form,
    setForm
  ] = useState(
    createProfileForm(
      savedUser
    )
  );

  /*
  |--------------------------------------------------------------------------
  | Tema
  |--------------------------------------------------------------------------
  */

  const theme =
    settings?.theme ||
    "dark";

  const isLight =
    theme === "light";

  const accent =
    getAccentColor(
      settings?.accentColor ||
      "cyan"
    );

  /*
  |--------------------------------------------------------------------------
  | Usuario normalizado
  |--------------------------------------------------------------------------
  */

  const displayFirstName =
    useMemo(() => {
      return (
        formatPersonName(
          form?.firstName ||
          user?.firstName
        ) ||
        "Usuario"
      );
    }, [
      form?.firstName,
      user?.firstName
    ]);

  const displayLastName =
    useMemo(() => {
      return formatPersonName(
        form?.lastName ||
        user?.lastName
      );
    }, [
      form?.lastName,
      user?.lastName
    ]);

  const displayFullName =
    useMemo(() => {
      return [
        displayFirstName,
        displayLastName
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    }, [
      displayFirstName,
      displayLastName
    ]);

  const role =
    String(
      user?.role ||
      "USER"
    ).toUpperCase();

  const trustScore =
    clampNumber(
      user?.trustScore,
      0,
      100,
      50
    );

  const isVerified =
    Boolean(
      user?.isVerified
    ) ||
    [
      "APPROVED",
      "VERIFIED"
    ].includes(
      String(
        user?.verificationStatus ||
        ""
      ).toUpperCase()
    ) ||
    String(
      user?.kycStatus ||
      ""
    ).toUpperCase() ===
      "VERIFIED";

  /*
  |--------------------------------------------------------------------------
  | Porcentaje del perfil
  |--------------------------------------------------------------------------
  */

  const completion =
    useMemo(() => {
      const checks = [
        Boolean(
          form?.firstName?.trim()
        ),

        Boolean(
          form?.lastName?.trim()
        ),

        Boolean(
          user?.email
        ),

        Boolean(
          form?.phone?.trim()
        ),

        Boolean(
          form?.country?.trim()
        ),

        Boolean(
          form?.province?.trim()
        ),

        Boolean(
          form?.city?.trim()
        ),

        Boolean(
          form?.dateOfBirth
        ),

        Boolean(
          form?.gender &&
          form?.gender !==
            "PREFER_NOT_TO_SAY"
        ),

        Boolean(
          profilePreview
        ),

        isVerified
      ];

      return Math.round(
        (
          checks.filter(
            Boolean
          ).length /
          checks.length
        ) * 100
      );
    }, [
      form,
      user?.email,
      profilePreview,
      isVerified
    ]);

  /*
  |--------------------------------------------------------------------------
  | Cargar perfil
  |--------------------------------------------------------------------------
  */

  const loadProfile =
    useCallback(
      async (
        showMainLoader = true
      ) => {
        try {
          if (
            showMainLoader
          ) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");
          setMessage("");
          setWarnings([]);

          const response =
            await api.get(
              "/users/me"
            );

          const backendUser =
            extractObject(
              response?.data,
              [
                "user",
                "data"
              ]
            );

          if (
            !backendUser ||
            typeof backendUser !==
              "object"
          ) {
            throw new Error(
              "El backend no devolvió un perfil válido."
            );
          }

          const resolvedUser = {
            ...DEFAULT_USER,
            ...backendUser
          };

          setUser(
            resolvedUser
          );

          setForm(
            createProfileForm(
              resolvedUser
            )
          );

          setProfilePreview(
            getProfilePhotoUrl(
              resolvedUser
                ?.profilePhoto ||
              resolvedUser
                ?.avatar ||
              resolvedUser
                ?.photo ||
              ""
            )
          );

          setCoverPreview(
            getCoverPhotoUrl(
              resolvedUser
                ?.coverPhoto ||
              ""
            )
          );

          setProfileFile(null);
          setCoverFile(null);

          persistUser(
            resolvedUser
          );

          await loadProfileStats(
            resolvedUser
          );
        } catch (requestError) {
          console.error(
            "Error cargando perfil:",
            requestError
          );

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message ||
            "No se pudo cargar el perfil."
          );

          setWarnings([
            "Se están mostrando los datos guardados localmente."
          ]);

          setUser(
            savedUser
          );

          setForm(
            createProfileForm(
              savedUser
            )
          );

          setProfilePreview(
            getProfilePhotoUrl(
              savedUser
                ?.profilePhoto ||
              savedUser
                ?.avatar ||
              ""
            )
          );

          setCoverPreview(
            getCoverPhotoUrl(
              savedUser
                ?.coverPhoto ||
              ""
            )
          );

          await loadProfileStats(
            savedUser
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        savedUser
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Cargar estadísticas
  |--------------------------------------------------------------------------
  */

  const loadProfileStats =
    useCallback(
      async (
        resolvedUser =
          user
      ) => {
        try {
          const response =
            await api.get(
              "/users/me/stats"
            );

          const backendStats =
            extractObject(
              response?.data,
              [
                "stats",
                "data"
              ]
            ) || {};

          setStats({
            products:
              safeNumber(
                backendStats
                  ?.products ??
                backendStats
                  ?.productsCount
              ),

            sales:
              safeNumber(
                backendStats
                  ?.sales ??
                backendStats
                  ?.salesCount
              ),

            purchases:
              safeNumber(
                backendStats
                  ?.purchases ??
                backendStats
                  ?.purchasesCount
              ),

            disputes:
              safeNumber(
                backendStats
                  ?.disputes ??
                backendStats
                  ?.disputesCount
              )
          });
        } catch {
          /*
          |--------------------------------------------------------------------------
          | Fallback con rutas existentes
          |--------------------------------------------------------------------------
          */

          const results =
            await Promise.allSettled(
              [
                api.get(
                  "/products/my-products"
                ),

                api.get(
                  "/orders/my-orders"
                ),

                api.get(
                  "/disputes"
                )
              ]
            );

          const [
            productsResult,
            ordersResult,
            disputesResult
          ] = results;

          const products =
            productsResult.status ===
            "fulfilled"
              ? extractArray(
                  productsResult.value
                    ?.data,
                  [
                    "products",
                    "myProducts",
                    "data"
                  ]
                )
              : [];

          const orders =
            ordersResult.status ===
            "fulfilled"
              ? extractArray(
                  ordersResult.value
                    ?.data,
                  [
                    "orders",
                    "myOrders",
                    "data"
                  ]
                )
              : [];

          const disputes =
            disputesResult.status ===
            "fulfilled"
              ? extractArray(
                  disputesResult.value
                    ?.data,
                  [
                    "disputes",
                    "data"
                  ]
                )
              : [];

          const userId =
            getEntityId(
              resolvedUser
            );

          const purchases =
            userId
              ? orders.filter(
                  (order) =>
                    String(
                      getEntityId(
                        order?.buyer
                      ) ||
                      order?.buyerId ||
                      ""
                    ) ===
                    String(
                      userId
                    )
                )
              : [];

          const sales =
            userId
              ? orders.filter(
                  (order) =>
                    String(
                      getEntityId(
                        order?.seller
                      ) ||
                      order?.sellerId ||
                      ""
                    ) ===
                    String(
                      userId
                    )
                )
              : [];

          setStats({
            products:
              products.length ||
              safeNumber(
                resolvedUser
                  ?.productsCount
              ),

            sales:
              sales.length ||
              safeNumber(
                resolvedUser
                  ?.salesCount
              ),

            purchases:
              purchases.length ||
              safeNumber(
                resolvedUser
                  ?.purchasesCount
              ),

            disputes:
              disputes.length ||
              safeNumber(
                resolvedUser
                  ?.disputesCount
              )
          });
        }
      },
      [
        user
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Cargar configuración
  |--------------------------------------------------------------------------
  */

  const loadSettings =
    useCallback(
      async () => {
        try {
          const response =
            await api.get(
              "/settings/me"
            );

          const backendSettings =
            extractObject(
              response?.data,
              [
                "settings",
                "data"
              ]
            );

          if (
            backendSettings &&
            typeof backendSettings ===
              "object"
          ) {
            const mergedSettings = {
              ...DEFAULT_SETTINGS,
              ...savedSettings,
              ...backendSettings
            };

            setSettings(
              mergedSettings
            );

            localStorage.setItem(
              "qsm_settings",
              JSON.stringify(
                mergedSettings
              )
            );

            return;
          }

          setSettings(
            savedSettings
          );
        } catch {
          setSettings(
            savedSettings
          );
        }
      },
      [
        savedSettings
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Cambiar campos del formulario
  |--------------------------------------------------------------------------
  */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked
    } = event.target;

    setMessage("");
    setError("");

    setForm(
      (
        currentForm
      ) => ({
        ...currentForm,

        [name]:
          type ===
          "checkbox"
            ? checked
            : value
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Seleccionar foto de perfil
  |--------------------------------------------------------------------------
  */

  const handleProfileImageChange = (
    event
  ) => {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    setError("");
    setMessage("");

    const validation =
      validateImageFile(
        file,
        {
          allowedTypes:
            ALLOWED_PROFILE_IMAGE_TYPES,

          maxSize:
            MAX_PROFILE_IMAGE_SIZE,

          label:
            "La foto de perfil"
        }
      );

    if (
      !validation.valid
    ) {
      setError(
        validation.message
      );

      return;
    }

    revokeBlobUrl(
      profilePreview
    );

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setProfileFile(file);

    setProfilePreview(
      previewUrl
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Seleccionar portada
  |--------------------------------------------------------------------------
  */

  const handleCoverImageChange = (
    event
  ) => {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    setError("");
    setMessage("");

    const validation =
      validateImageFile(
        file,
        {
          allowedTypes:
            ALLOWED_COVER_IMAGE_TYPES,

          maxSize:
            MAX_COVER_IMAGE_SIZE,

          label:
            "La portada"
        }
      );

    if (
      !validation.valid
    ) {
      setError(
        validation.message
      );

      return;
    }

    revokeBlobUrl(
      coverPreview
    );

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setCoverFile(file);

    setCoverPreview(
      previewUrl
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Cerrar sesión
  |--------------------------------------------------------------------------
  */

  const logout = () => {
    [
      "token",
      "qsm_token",
      "qsm_user",
      "user",
      "admin_token",
      "admin_user"
    ].forEach(
      (storageKey) =>
        localStorage.removeItem(
          storageKey
        )
    );

    navigate(
      "/login",
      {
        replace: true
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Efectos iniciales
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProfile(true);
    loadSettings();
  }, [
    loadProfile,
    loadSettings
  ]);

  useEffect(() => {
    applySettings(
      settings
    );
  }, [
    settings
  ]);

  /*
  |--------------------------------------------------------------------------
  | Sincronizar Sidebar completo o minimizado
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleSidebarChange = (
      event
    ) => {
      const nextValue =
        typeof event
          ?.detail
          ?.collapsed ===
        "boolean"
          ? event.detail
              .collapsed
          : localStorage.getItem(
              "qsm_sidebar_collapsed"
            ) === "true";

      setSidebarCollapsed(
        nextValue
      );
    };

    window.addEventListener(
      "qsm-sidebar-changed",
      handleSidebarChange
    );

    window.addEventListener(
      "storage",
      handleSidebarChange
    );

    return () => {
      window.removeEventListener(
        "qsm-sidebar-changed",
        handleSidebarChange
      );

      window.removeEventListener(
        "storage",
        handleSidebarChange
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Liberar vistas previas blob
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      revokeBlobUrl(
        profilePreview
      );

      revokeBlobUrl(
        coverPreview
      );
    };
  }, [
    profilePreview,
    coverPreview
  ]);
   /*
  |--------------------------------------------------------------------------
  | Validar formulario
  |--------------------------------------------------------------------------
  */

  const validateProfileForm = () => {
    const firstName =
      String(
        form?.firstName || ""
      ).trim();

    const lastName =
      String(
        form?.lastName || ""
      ).trim();

    const phone =
      String(
        form?.phone || ""
      ).trim();

    if (
      firstName.length < 2
    ) {
      return {
        valid: false,
        message:
          "El nombre debe tener al menos 2 caracteres."
      };
    }

    if (
      lastName.length < 2
    ) {
      return {
        valid: false,
        message:
          "El apellido debe tener al menos 2 caracteres."
      };
    }

    if (
      phone &&
      phone.length < 7
    ) {
      return {
        valid: false,
        message:
          "El número de teléfono no parece válido."
      };
    }

    if (
      form?.dateOfBirth
    ) {
      const selectedDate =
        new Date(
          form.dateOfBirth
        );

      if (
        Number.isNaN(
          selectedDate.getTime()
        )
      ) {
        return {
          valid: false,
          message:
            "La fecha de nacimiento no es válida."
        };
      }

      if (
        selectedDate >
        new Date()
      ) {
        return {
          valid: false,
          message:
            "La fecha de nacimiento no puede estar en el futuro."
        };
      }
    }

    return {
      valid: true,
      message: ""
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Guardar datos personales
  |--------------------------------------------------------------------------
  */

  const saveProfileData =
    async () => {
      const validation =
        validateProfileForm();

      if (
        !validation.valid
      ) {
        throw new Error(
          validation.message
        );
      }

      const payload = {
        firstName:
          formatPersonName(
            form.firstName
          ),

        lastName:
          formatPersonName(
            form.lastName
          ),

        phone:
          String(
            form.phone || ""
          ).trim(),

        documentId:
          String(
            form.documentId || ""
          ).trim(),

        dateOfBirth:
          form.dateOfBirth ||
          null,

        gender:
          form.gender ||
          "PREFER_NOT_TO_SAY",

        country:
          String(
            form.country ||
            "República Dominicana"
          ).trim(),

        province:
          String(
            form.province || ""
          ).trim(),

        city:
          String(
            form.city || ""
          ).trim(),

        address:
          String(
            form.address || ""
          ).trim(),

        language:
          settings?.language ||
          "es",

        timezone:
          user?.timezone ||
          "America/Santo_Domingo",

        notificationsEnabled:
          user
            ?.notificationsEnabled !==
          false,

        emailNotificationsEnabled:
          user
            ?.emailNotificationsEnabled !==
          false
      };

      /*
      |--------------------------------------------------------------------------
      | Campos opcionales
      |--------------------------------------------------------------------------
      | Estos se enviarán si ya fueron agregados al modelo User.js y al
      | controlador updateMe.
      |--------------------------------------------------------------------------
      */

      if (
        form?.username !==
        undefined
      ) {
        payload.username =
          String(
            form.username || ""
          )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");
      }

      if (
        form?.bio !==
        undefined
      ) {
        payload.bio =
          String(
            form.bio || ""
          )
            .trim()
            .slice(0, 500);
      }

      const response =
        await api.patch(
          "/users/me",
          payload
        );

      const updatedUser =
        extractObject(
          response?.data,
          [
            "user",
            "data"
          ]
        );

      if (
        !updatedUser
      ) {
        throw new Error(
          "El backend no devolvió el perfil actualizado."
        );
      }

      return {
        ...user,
        ...updatedUser
      };
    };

  /*
  |--------------------------------------------------------------------------
  | Subir foto de perfil
  |--------------------------------------------------------------------------
  */

  const uploadProfilePhoto =
    async () => {
      if (
        !profileFile
      ) {
        return user;
      }

      try {
        setUploadingProfilePhoto(
          true
        );

        const formData =
          new FormData();

        formData.append(
          "profilePhoto",
          profileFile
        );

        /*
        |--------------------------------------------------------------------------
        | No se establece manualmente Content-Type
        |--------------------------------------------------------------------------
        | El navegador añade automáticamente el boundary correcto.
        |--------------------------------------------------------------------------
        */

        const response =
          await api.patch(
            "/users/me/avatar",
            formData
          );

        const updatedUser =
          extractObject(
            response?.data,
            [
              "user",
              "data"
            ]
          );

        const profilePhoto =
          response?.data
            ?.profilePhoto ||
          updatedUser
            ?.profilePhoto ||
          "";

        const finalUser = {
          ...user,
          ...(updatedUser || {}),
          profilePhoto:
            profilePhoto ||
            updatedUser
              ?.profilePhoto ||
            user?.profilePhoto ||
            ""
        };

        setUser(
          finalUser
        );

        persistUser(
          finalUser
        );

        revokeBlobUrl(
          profilePreview
        );

        setProfilePreview(
          getProfilePhotoUrl(
            finalUser
              ?.profilePhoto ||
            ""
          )
        );

        setProfileFile(
          null
        );

        window.dispatchEvent(
          new CustomEvent(
            "qsm-user-updated",
            {
              detail:
                finalUser
            }
          )
        );

        return finalUser;
      } finally {
        setUploadingProfilePhoto(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Eliminar foto de perfil
  |--------------------------------------------------------------------------
  */

  const deleteProfilePhoto =
    async () => {
      if (
        deletingProfilePhoto
      ) {
        return;
      }

      try {
        setDeletingProfilePhoto(
          true
        );

        setError("");
        setMessage("");

        const response =
          await api.delete(
            "/users/me/avatar"
          );

        const updatedUser =
          extractObject(
            response?.data,
            [
              "user",
              "data"
            ]
          );

        const finalUser = {
          ...user,
          ...(updatedUser || {}),
          profilePhoto: "",
          avatar: ""
        };

        revokeBlobUrl(
          profilePreview
        );

        setProfilePreview("");
        setProfileFile(null);
        setUser(finalUser);

        persistUser(
          finalUser
        );

        window.dispatchEvent(
          new CustomEvent(
            "qsm-user-updated",
            {
              detail:
                finalUser
            }
          )
        );

        setMessage(
          "Foto de perfil eliminada correctamente."
        );
      } catch (
        requestError
      ) {
        console.error(
          "Error eliminando foto:",
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "No se pudo eliminar la foto de perfil."
        );
      } finally {
        setDeletingProfilePhoto(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Cancelar cambio de foto
  |--------------------------------------------------------------------------
  */

  const cancelProfilePhotoChange =
    () => {
      revokeBlobUrl(
        profilePreview
      );

      setProfileFile(null);

      setProfilePreview(
        getProfilePhotoUrl(
          user?.profilePhoto ||
          user?.avatar ||
          ""
        )
      );

      setError("");
    };

  /*
  |--------------------------------------------------------------------------
  | Cancelar cambio de portada
  |--------------------------------------------------------------------------
  */

  const cancelCoverPhotoChange =
    () => {
      revokeBlobUrl(
        coverPreview
      );

      setCoverFile(null);

      setCoverPreview(
        getCoverPhotoUrl(
          user?.coverPhoto ||
          ""
        )
      );

      setError("");
    };

  /*
  |--------------------------------------------------------------------------
  | Subir portada
  |--------------------------------------------------------------------------
  | Esta función utilizará:
  |
  | PATCH /api/users/me/cover
  |
  | campo FormData:
  |
  | coverPhoto
  |
  | La ruta debe crearse en el backend para que la portada sea persistente.
  |--------------------------------------------------------------------------
  */

  const uploadCoverPhoto =
    async (
      baseUser = user
    ) => {
      if (
        !coverFile
      ) {
        return baseUser;
      }

      try {
        setUploadingCoverPhoto(
          true
        );

        const formData =
          new FormData();

        formData.append(
          "coverPhoto",
          coverFile
        );

        const response =
          await api.patch(
            "/users/me/cover",
            formData
          );

        const updatedUser =
          extractObject(
            response?.data,
            [
              "user",
              "data"
            ]
          );

        const coverPhoto =
          response?.data
            ?.coverPhoto ||
          updatedUser
            ?.coverPhoto ||
          "";

        const finalUser = {
          ...baseUser,
          ...(updatedUser || {}),
          coverPhoto:
            coverPhoto ||
            updatedUser
              ?.coverPhoto ||
            baseUser
              ?.coverPhoto ||
            ""
        };

        revokeBlobUrl(
          coverPreview
        );

        setCoverPreview(
          getCoverPhotoUrl(
            finalUser
              ?.coverPhoto ||
            ""
          )
        );

        setCoverFile(null);

        return finalUser;
      } finally {
        setUploadingCoverPhoto(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Eliminar portada
  |--------------------------------------------------------------------------
  | Requiere:
  |
  | DELETE /api/users/me/cover
  |--------------------------------------------------------------------------
  */

  const deleteCoverPhoto =
    async () => {
      try {
        setUploadingCoverPhoto(
          true
        );

        setError("");
        setMessage("");

        const response =
          await api.delete(
            "/users/me/cover"
          );

        const updatedUser =
          extractObject(
            response?.data,
            [
              "user",
              "data"
            ]
          );

        const finalUser = {
          ...user,
          ...(updatedUser || {}),
          coverPhoto: ""
        };

        revokeBlobUrl(
          coverPreview
        );

        setCoverPreview("");
        setCoverFile(null);
        setUser(finalUser);

        persistUser(
          finalUser
        );

        window.dispatchEvent(
          new CustomEvent(
            "qsm-user-updated",
            {
              detail:
                finalUser
            }
          )
        );

        setMessage(
          "Portada eliminada correctamente."
        );
      } catch (
        requestError
      ) {
        console.error(
          "Error eliminando portada:",
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "No se pudo eliminar la portada."
        );
      } finally {
        setUploadingCoverPhoto(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Guardar perfil completo
  |--------------------------------------------------------------------------
  */

  const saveProfile =
    async () => {
      if (
        saving
      ) {
        return;
      }

      try {
        setSaving(true);
        setError("");
        setMessage("");

        /*
        |--------------------------------------------------------------------------
        | 1. Guardar datos personales
        |--------------------------------------------------------------------------
        */

        let finalUser =
          await saveProfileData();

        /*
        |--------------------------------------------------------------------------
        | 2. Guardar foto de perfil
        |--------------------------------------------------------------------------
        */

        if (
          profileFile
        ) {
          const formData =
            new FormData();

          formData.append(
            "profilePhoto",
            profileFile
          );

          setUploadingProfilePhoto(
            true
          );

          try {
            const photoResponse =
              await api.patch(
                "/users/me/avatar",
                formData
              );

            const photoUser =
              extractObject(
                photoResponse?.data,
                [
                  "user",
                  "data"
                ]
              );

            finalUser = {
              ...finalUser,
              ...(photoUser || {}),

              profilePhoto:
                photoResponse
                  ?.data
                  ?.profilePhoto ||
                photoUser
                  ?.profilePhoto ||
                finalUser
                  ?.profilePhoto ||
                ""
            };
          } finally {
            setUploadingProfilePhoto(
              false
            );
          }
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Guardar portada
        |--------------------------------------------------------------------------
        */

        if (
          coverFile
        ) {
          try {
            finalUser =
              await uploadCoverPhoto(
                finalUser
              );
          } catch (
            coverError
          ) {
            console.error(
              "Portada no guardada:",
              coverError
            );

            setWarnings(
              (
                currentWarnings
              ) => [
                ...new Set([
                  ...currentWarnings,
                  "Los datos y la foto de perfil fueron guardados, pero la portada todavía no pudo guardarse."
                ])
              ]
            );
          }
        }

        /*
        |--------------------------------------------------------------------------
        | 4. Guardar usuario final localmente
        |--------------------------------------------------------------------------
        */

        setUser(
          finalUser
        );

        setForm(
          createProfileForm(
            finalUser
          )
        );

        persistUser(
          finalUser
        );

        revokeBlobUrl(
          profilePreview
        );

        revokeBlobUrl(
          coverPreview
        );

        setProfilePreview(
          getProfilePhotoUrl(
            finalUser
              ?.profilePhoto ||
            finalUser
              ?.avatar ||
            ""
          )
        );

        setCoverPreview(
          getCoverPhotoUrl(
            finalUser
              ?.coverPhoto ||
            ""
          )
        );

        setProfileFile(null);
        setCoverFile(null);

        /*
        |--------------------------------------------------------------------------
        | Actualizar Sidebar, Topbar y otros componentes
        |--------------------------------------------------------------------------
        */

        window.dispatchEvent(
          new CustomEvent(
            "qsm-user-updated",
            {
              detail:
                finalUser
            }
          )
        );

        setMessage(
          "Perfil actualizado correctamente."
        );
      } catch (
        requestError
      ) {
        console.error(
          "Error guardando perfil:",
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "No se pudo guardar el perfil."
        );

        /*
        |--------------------------------------------------------------------------
        | No guardamos URLs blob en localStorage
        |--------------------------------------------------------------------------
        */

        const safeLocalUser = {
          ...user,

          firstName:
            formatPersonName(
              form.firstName
            ),

          lastName:
            formatPersonName(
              form.lastName
            ),

          phone:
            form.phone,

          country:
            form.country,

          province:
            form.province,

          city:
            form.city,

          address:
            form.address,

          dateOfBirth:
            form.dateOfBirth,

          gender:
            form.gender,

          username:
            form.username,

          bio:
            form.bio
        };

        setUser(
          safeLocalUser
        );

        persistUser(
          safeLocalUser
        );
      } finally {
        setSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Restablecer formulario
  |--------------------------------------------------------------------------
  */

  const resetProfileForm =
    () => {
      setForm(
        createProfileForm(
          user
        )
      );

      cancelProfilePhotoChange();
      cancelCoverPhotoChange();

      setMessage("");
      setError("");
    };

  /*
  |--------------------------------------------------------------------------
  | Estado global de guardado
  |--------------------------------------------------------------------------
  */

  const isBusy =
    saving ||
    refreshing ||
    uploadingProfilePhoto ||
    uploadingCoverPhoto ||
    deletingProfilePhoto;

  const hasPendingChanges =
    Boolean(
      profileFile ||
      coverFile
    ) ||
    hasProfileFormChanges(
      form,
      user
    );
     return (
    <div style={page(isLight)}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background:
            ${isLight
              ? "#f8fafc"
              : "#020617"};
          font-family:
            Inter,
            "Plus Jakarta Sans",
            system-ui,
            sans-serif;
        }

        input,
        select,
        textarea,
        button,
        a {
          font-family: inherit;
        }

        input::placeholder,
        textarea::placeholder {
          color:
            ${isLight
              ? "#94a3b8"
              : "#64748b"};
        }

        button,
        a,
        label {
          transition:
            ${settings?.animations === false
              ? "none"
              : "transform .22s ease, opacity .22s ease, border-color .22s ease, background .22s ease"};
        }

        button:hover,
        a:hover,
        label:hover {
          transform:
            ${settings?.animations === false
              ? "none"
              : "translateY(-2px)"};
        }

        button:disabled {
          opacity: .62;
          cursor: not-allowed;
          transform: none !important;
        }

        @keyframes profileFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes profilePulse {
          0% {
            opacity: .65;
          }

          50% {
            opacity: 1;
          }

          100% {
            opacity: .65;
          }
        }

        @media (max-width: 1320px) {
          .profile-content-grid {
            grid-template-columns:
              1fr !important;
          }

          .profile-side-column {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }
        }

        @media (max-width: 1160px) {
          .profile-page-layout {
            grid-template-columns:
              1fr !important;
          }

          .profile-sidebar-wrapper {
            display:
              none !important;
          }

          .profile-header-content {
            grid-template-columns:
              1fr !important;
          }

          .profile-main-actions {
            justify-content:
              flex-start !important;
          }
        }

        @media (max-width: 850px) {
          .profile-main-content {
            padding:
              80px 18px 40px !important;
          }

          .profile-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .profile-form-grid {
            grid-template-columns:
              1fr !important;
          }

          .profile-side-column {
            grid-template-columns:
              1fr !important;
          }

          .profile-photo-section {
            flex-direction:
              column !important;
            align-items:
              flex-start !important;
          }

          .profile-main-actions {
            display:
              grid !important;
            grid-template-columns:
              1fr 1fr !important;
            width:
              100% !important;
          }

          .profile-main-actions > * {
            width:
              100% !important;
          }
        }

        @media (max-width: 580px) {
          .profile-stats-grid {
            grid-template-columns:
              1fr !important;
          }

          .profile-main-actions {
            grid-template-columns:
              1fr !important;
          }

          .profile-cover-actions {
            left:
              14px !important;
            right:
              14px !important;
            bottom:
              14px !important;
            justify-content:
              stretch !important;
          }

          .profile-cover-actions > * {
            flex:
              1 !important;
          }

          .profile-photo-card {
            width:
              116px !important;
            height:
              116px !important;
            border-radius:
              30px !important;
          }

          .profile-identity-name {
            font-size:
              34px !important;
          }

          .profile-form-actions {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>

      <div
        className="profile-page-layout"
        style={layout(
          settings,
          sidebarCollapsed
        )}
      >
        <div className="profile-sidebar-wrapper">
          <Sidebar
            counts={{
              purchases:
                stats.purchases,
              sales:
                stats.sales,
              favorites:
                Array.isArray(
                  user?.favorites
                )
                  ? user.favorites.length
                  : 0,
              messages:
                safeNumber(
                  user?.messagesCount
                ),
              disputes:
                stats.disputes
            }}
          />
        </div>

        <main
          className="profile-main-content"
          style={main(settings)}
        >
          <Topbar />

          <div style={contentContainer}>
            <section style={pageToolbar}>
              <div>
                <p style={eyebrow(accent)}>
                  PERFIL PERSONAL
                </p>

                <h1 style={pageTitle(isLight)}>
                  Administra tu identidad QSM
                </h1>

                <p style={pageDescription(isLight)}>
                  Actualiza tus datos, foto, portada,
                  información de contacto y nivel de
                  seguridad.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadProfile(false)
                }
                disabled={
                  loading ||
                  refreshing ||
                  saving
                }
                style={refreshButton(
                  isLight,
                  accent
                )}
              >
                {refreshing
                  ? "Actualizando..."
                  : "↻ Actualizar perfil"}
              </button>
            </section>

            {message && (
              <div style={successBox}>
                <span style={messageIcon}>
                  ✓
                </span>

                <div>
                  <strong>
                    Operación completada
                  </strong>

                  <p>
                    {message}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div style={errorBox}>
                <span style={messageIcon}>
                  !
                </span>

                <div>
                  <strong>
                    No se pudo completar la operación
                  </strong>

                  <p>
                    {error}
                  </p>
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div style={warningBox(isLight)}>
                <span style={messageIcon}>
                  ⚠
                </span>

                <div>
                  <strong>
                    Información importante
                  </strong>

                  <ul style={warningList}>
                    {warnings.map(
                      (
                        warning,
                        index
                      ) => (
                        <li
                          key={`${warning}-${index}`}
                        >
                          {warning}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}

            {loading ? (
              <div style={loadingCard(isLight)}>
                <div style={loadingSymbol}>
                  ◌
                </div>

                <h2>
                  Cargando tu perfil
                </h2>

                <p>
                  QSM está consultando tus datos,
                  operaciones y configuración.
                </p>
              </div>
            ) : (
              <>
                <section
                  style={profileHero(
                    isLight,
                    settings
                  )}
                >
                  <div
                    style={coverContainer(
                      isLight,
                      accent
                    )}
                  >
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Portada del perfil"
                        style={coverImage}
                      />
                    ) : (
                      <div
                        style={defaultCover(
                          accent
                        )}
                      >
                        <div style={coverGridPattern} />

                        <div style={coverIdentityBox}>
                          <span>
                            🛡 Identidad protegida
                          </span>

                          <span>
                            💰 Pago Protegido
                          </span>

                          <span>
                            🤖 QSM AI
                          </span>

                          <span>
                            📦 Historial seguro
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className="profile-cover-actions"
                      style={coverActions}
                    >
                      <label
                        style={coverActionButton(
                          accent
                        )}
                      >
                        📷{" "}
                        {coverPreview
                          ? "Cambiar portada"
                          : "Agregar portada"}

                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={
                            handleCoverImageChange
                          }
                          disabled={isBusy}
                          style={{
                            display:
                              "none"
                          }}
                        />
                      </label>

                      {coverFile && (
                        <button
                          type="button"
                          onClick={
                            cancelCoverPhotoChange
                          }
                          disabled={isBusy}
                          style={coverSecondaryButton}
                        >
                          Cancelar cambio
                        </button>
                      )}

                      {!coverFile &&
                        user?.coverPhoto && (
                          <button
                            type="button"
                            onClick={
                              deleteCoverPhoto
                            }
                            disabled={isBusy}
                            style={coverDangerButton}
                          >
                            Eliminar portada
                          </button>
                        )}
                    </div>
                  </div>

                  <div
                    className="profile-header-content"
                    style={profileHeaderContent}
                  >
                    <div
                      className="profile-photo-section"
                      style={profilePhotoSection}
                    >
                      <div
                        className="profile-photo-card"
                        style={profilePhotoFrame(
                          accent
                        )}
                      >
                        {profilePreview ? (
                          <img
                            src={profilePreview}
                            alt={`Foto de perfil de ${displayFullName}`}
                            style={profilePhotoImage}
                          />
                        ) : (
                          <span>
                            {getInitials(
                              displayFullName
                            )}
                          </span>
                        )}

                        <label
                          style={profilePhotoButton(
                            accent
                          )}
                          title="Cambiar foto de perfil"
                        >
                          📷

                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            onChange={
                              handleProfileImageChange
                            }
                            disabled={isBusy}
                            style={{
                              display:
                                "none"
                            }}
                          />
                        </label>

                        {isVerified && (
                          <span
                            style={profileVerifiedMark}
                            title="Identidad verificada"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <div style={identityInformation}>
                        <p style={eyebrow(accent)}>
                          MI PERFIL QSM
                        </p>

                        <h2
                          className="profile-identity-name"
                          style={identityName(isLight)}
                        >
                          {displayFullName}
                        </h2>

                        <p style={identityEmail(isLight)}>
                          {user?.email ||
                            "usuario@qsm.com"}
                        </p>

                        {form?.username && (
                          <p style={usernameText(accent)}>
                            @
                            {String(
                              form.username
                            ).replace(
                              /^@/,
                              ""
                            )}
                          </p>
                        )}

                        <div style={identityBadges}>
                          <span
                            style={verifiedBadge(
                              isVerified
                            )}
                          >
                            {isVerified
                              ? "✓ Identidad verificada"
                              : "● Pendiente de verificación"}
                          </span>

                          <span
                            style={trustBadge(accent)}
                          >
                            Confianza{" "}
                            {trustScore}/100
                          </span>

                          <span style={roleBadge}>
                            {formatRole(role)}
                          </span>
                        </div>

                        {profileFile && (
                          <div style={pendingImageNotice}>
                            <span>
                              📷
                            </span>

                            <div>
                              <strong>
                                Nueva foto seleccionada
                              </strong>

                              <p>
                                Guarda el perfil para conservarla
                                permanentemente.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={
                                cancelProfilePhotoChange
                              }
                              disabled={isBusy}
                              style={smallCancelButton}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="profile-main-actions"
                      style={profileMainActions}
                    >
                      <Link
                        to="/complete-profile"
                        style={secondaryActionButton(
                          isLight
                        )}
                      >
                        🛡 Verificación
                      </Link>

                      <Link
                        to="/settings"
                        style={secondaryActionButton(
                          isLight
                        )}
                      >
                        ⚙ Configuración
                      </Link>

                      {user?.profilePhoto &&
                        !profileFile && (
                          <button
                            type="button"
                            onClick={
                              deleteProfilePhoto
                            }
                            disabled={isBusy}
                            style={removePhotoButton}
                          >
                            {deletingProfilePhoto
                              ? "Eliminando..."
                              : "🗑 Eliminar foto"}
                          </button>
                        )}

                      <button
                        type="button"
                        onClick={logout}
                        disabled={isBusy}
                        style={logoutProfileButton}
                      >
                        🚪 Cerrar sesión
                      </button>
                    </div>
                  </div>
                </section>

                <section
                  className="profile-stats-grid"
                  style={statsGrid}
                >
                  <ProfileStatCard
                    icon="📦"
                    title="Productos"
                    value={stats.products}
                    description="Publicaciones registradas"
                    isLight={isLight}
                    accent={accent}
                  />

                  <ProfileStatCard
                    icon="💰"
                    title="Ventas"
                    value={stats.sales}
                    description="Operaciones como vendedor"
                    isLight={isLight}
                    accent={accent}
                  />

                  <ProfileStatCard
                    icon="🛒"
                    title="Compras"
                    value={stats.purchases}
                    description="Órdenes protegidas"
                    isLight={isLight}
                    accent={accent}
                  />

                  <ProfileStatCard
                    icon="⚖"
                    title="Reclamos"
                    value={stats.disputes}
                    description="Casos registrados"
                    isLight={isLight}
                    accent={accent}
                  />
                </section>

                <section
                  className="profile-content-grid"
                  style={profileContentGrid}
                >
                  <section
                    style={formPanel(
                      isLight,
                      settings
                    )}
                  >
                    <div style={panelHeader}>
                      <div>
                        <p style={eyebrow(accent)}>
                          DATOS PERSONALES
                        </p>

                        <h2 style={panelTitle(isLight)}>
                          Información del perfil
                        </h2>

                        <p style={panelDescription(isLight)}>
                          Estos datos se utilizan para proteger
                          tus operaciones, mejorar tu reputación
                          y facilitar las entregas.
                        </p>
                      </div>

                      {hasPendingChanges && (
                        <span style={pendingChangesBadge}>
                          Cambios pendientes
                        </span>
                      )}
                    </div>

                    <div
                      className="profile-form-grid"
                      style={formGrid}
                    >
                      <ProfileField
                        label="Nombre"
                        required
                        isLight={isLight}
                      >
                        <input
                          type="text"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                          maxLength={50}
                          disabled={isBusy}
                          autoComplete="given-name"
                          style={formInput(isLight)}
                        />
                      </ProfileField>

                      <ProfileField
                        label="Apellido"
                        required
                        isLight={isLight}
                      >
                        <input
                          type="text"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleChange}
                          maxLength={50}
                          disabled={isBusy}
                          autoComplete="family-name"
                          style={formInput(isLight)}
                        />
                      </ProfileField>

                      <ProfileField
                        label="Nombre de usuario"
                        hint="Visible para otros usuarios"
                        isLight={isLight}
                      >
                        <div style={inputPrefixContainer(isLight)}>
                          <span style={inputPrefix}>
                            @
                          </span>

                          <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="usuarioqsm"
                            maxLength={40}
                            disabled={isBusy}
                            autoComplete="username"
                            style={prefixedInput(isLight)}
                          />
                        </div>
                      </ProfileField>

                      <ProfileField
                        label="Teléfono / WhatsApp"
                        hint="Solo se compartirá cuando corresponda"
                        isLight={isLight}
                      >
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="809-000-0000"
                          maxLength={30}
                          disabled={isBusy}
                          autoComplete="tel"
                          style={formInput(isLight)}
                        />
                      </ProfileField>

                      <ProfileField
                        label="Documento"
                        hint="Utilizado para validación interna"
                        isLight={isLight}
                      >
                        <input
                          type="text"
                          name="documentId"
                          value={form.documentId}
                          onChange={handleChange}
                          placeholder="Cédula o documento"
                          maxLength={50}
                          disabled={isBusy}
                          style={formInput(isLight)}
                        />
                      </ProfileField>

                      <ProfileField
                        label="Fecha de nacimiento"
                        isLight={isLight}
                      >
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={form.dateOfBirth}
                          onChange={handleChange}
                          disabled={isBusy}
                          style={formInput(isLight)}
                        />
                      </ProfileField>

                      <ProfileField
                        label="Género"
                        isLight={isLight}
                      >
                        <select
                          name="gender"
                          value={form.gender}
                          onChange={handleChange}
                          disabled={isBusy}
                          style={formInput(isLight)}
                        >
                          <option value="PREFER_NOT_TO_SAY">
                            Prefiero no indicarlo
                          </option>

                          <option value="MALE">
                            Masculino
                          </option>

                          <option value="FEMALE">
                            Femenino
                          </option>

                          <option value="OTHER">
                            Otro
                          </option>
                        </select>
                      </ProfileField>

                      <ProfileField
                        label="País"
                        isLight={isLight}
                      >
                        <input
                          type="text"
                          name="country"
                          value={form.country}
                          onChange={handleChange}
                          placeholder="República Dominicana"
                          maxLength={100}
                          disabled={isBusy}
                          autoComplete="country-name"
                          style={formInput(isLight)}
                        />
                      </ProfileField>

                      <ProfileField
                        label="Provincia"
                        isLight={isLight}
                      >
                        <input
                          type="text"
                          name="province"
                          value={form.province}
                          onChange={handleChange}
                          placeholder="Distrito Nacional"
                          maxLength={100}
                          disabled={isBusy}
                          autoComplete="address-level1"
                          style={formInput(isLight)}
                        />
                      </ProfileField>

                      <ProfileField
                        label="Ciudad o municipio"
                        isLight={isLight}
                      >
                        <input
                          type="text"
                          name="city"
                          value={form.city}
                          onChange={handleChange}
                          placeholder="Santo Domingo"
                          maxLength={100}
                          disabled={isBusy}
                          autoComplete="address-level2"
                          style={formInput(isLight)}
                        />
                      </ProfileField>
                    </div>

                    <ProfileField
                      label="Dirección general"
                      hint="No se mostrará públicamente"
                      isLight={isLight}
                    >
                      <input
                        type="text"
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Sector, calle o referencia"
                        maxLength={500}
                        disabled={isBusy}
                        autoComplete="street-address"
                        style={formInput(isLight)}
                      />
                    </ProfileField>

                    <ProfileField
                      label="Biografía"
                      hint={`${String(
                        form.bio || ""
                      ).length}/500 caracteres`}
                      isLight={isLight}
                    >
                      <textarea
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        placeholder="Describe qué vendes, tu experiencia o la forma en que trabajas dentro de QSM."
                        maxLength={500}
                        disabled={isBusy}
                        style={formTextarea(isLight)}
                      />
                    </ProfileField>

                    <div
                      className="profile-form-actions"
                      style={formActions}
                    >
                      <button
                        type="button"
                        onClick={resetProfileForm}
                        disabled={
                          isBusy ||
                          !hasPendingChanges
                        }
                        style={resetButton(isLight)}
                      >
                        Restablecer
                      </button>

                      <button
                        type="button"
                        onClick={saveProfile}
                        disabled={
                          isBusy ||
                          !hasPendingChanges
                        }
                        style={saveButton(accent)}
                      >
                        {saving ||
                        uploadingProfilePhoto ||
                        uploadingCoverPhoto
                          ? "Guardando cambios..."
                          : "Guardar perfil →"}
                      </button>
                    </div>
                  </section>

                  <aside
                    className="profile-side-column"
                    style={profileSideColumn}
                  >
                    <section
                      style={sideCard(
                        isLight,
                        settings
                      )}
                    >
                      <p style={eyebrow(accent)}>
                        PROGRESO
                      </p>

                      <h2 style={sideCardTitle(isLight)}>
                        Perfil QSM
                      </h2>

                      <div style={completionRing(accent)}>
                        <div style={completionRingInner(isLight)}>
                          <strong>
                            {completion}%
                          </strong>

                          <span>
                            completado
                          </span>
                        </div>
                      </div>

                      <div style={progressBar(isLight)}>
                        <div
                          style={{
                            ...progressBarFill(
                              accent
                            ),
                            width:
                              `${completion}%`
                          }}
                        />
                      </div>

                      <ProfileCheck
                        done={Boolean(
                          form.firstName &&
                          form.lastName
                        )}
                        text="Nombre completo"
                        isLight={isLight}
                      />

                      <ProfileCheck
                        done={Boolean(
                          form.phone
                        )}
                        text="Teléfono o WhatsApp"
                        isLight={isLight}
                      />

                      <ProfileCheck
                        done={Boolean(
                          form.city &&
                          form.province
                        )}
                        text="Ubicación registrada"
                        isLight={isLight}
                      />

                      <ProfileCheck
                        done={Boolean(
                          profilePreview
                        )}
                        text="Foto de perfil"
                        isLight={isLight}
                      />

                      <ProfileCheck
                        done={isVerified}
                        text="Verificación de identidad"
                        isLight={isLight}
                      />

                      {!isVerified && (
                        <Link
                          to="/complete-profile"
                          style={sidePrimaryLink(accent)}
                        >
                          Completar verificación
                        </Link>
                      )}
                    </section>

                    <section
                      style={sideCard(
                        isLight,
                        settings
                      )}
                    >
                      <p style={eyebrow(accent)}>
                        ESTADO DE CUENTA
                      </p>

                      <h2 style={sideCardTitle(isLight)}>
                        Seguridad y permisos
                      </h2>

                      <ProfileInfoRow
                        label="Estado"
                        value={formatAccountStatus(
                          user?.status
                        )}
                        isLight={isLight}
                        accent={accent}
                      />

                      <ProfileInfoRow
                        label="Compras"
                        value={
                          user?.buyerEnabled ===
                          false
                            ? "Deshabilitadas"
                            : "Habilitadas"
                        }
                        isLight={isLight}
                        accent={accent}
                      />

                      <ProfileInfoRow
                        label="Ventas"
                        value={
                          user?.sellerEnabled ===
                          false
                            ? "Deshabilitadas"
                            : "Habilitadas"
                        }
                        isLight={isLight}
                        accent={accent}
                      />

                      <ProfileInfoRow
                        label="Seguridad"
                        value={formatSecurityLevel(
                          user?.securityLevel
                        )}
                        isLight={isLight}
                        accent={accent}
                      />

                      <ProfileInfoRow
                        label="Rol"
                        value={formatRole(role)}
                        isLight={isLight}
                        accent={accent}
                      />

                      <Link
                        to="/settings"
                        style={sideSecondaryLink(
                          isLight
                        )}
                      >
                        Administrar seguridad
                      </Link>
                    </section>

                    <section
                      style={sideCard(
                        isLight,
                        settings
                      )}
                    >
                      <p style={eyebrow(accent)}>
                        PREFERENCIAS
                      </p>

                      <h2 style={sideCardTitle(isLight)}>
                        Apariencia aplicada
                      </h2>

                      <ProfileInfoRow
                        label="Tema"
                        value={
                          settings?.theme ===
                          "light"
                            ? "Claro"
                            : "Oscuro"
                        }
                        isLight={isLight}
                        accent={accent}
                      />

                      <ProfileInfoRow
                        label="Color"
                        value={formatAccent(
                          settings?.accentColor
                        )}
                        isLight={isLight}
                        accent={accent}
                      />

                      <ProfileInfoRow
                        label="Idioma"
                        value={
                          settings?.language ===
                          "en"
                            ? "English"
                            : "Español"
                        }
                        isLight={isLight}
                        accent={accent}
                      />

                      <ProfileInfoRow
                        label="Densidad"
                        value={formatDensity(
                          settings?.density
                        )}
                        isLight={isLight}
                        accent={accent}
                      />

                      <Link
                        to="/settings"
                        style={sideSecondaryLink(
                          isLight
                        )}
                      >
                        Cambiar preferencias
                      </Link>
                    </section>

                    <section style={securityNotice(isLight)}>
                      <div style={securityNoticeIcon}>
                        🛡
                      </div>

                      <div>
                        <h3>
                          Protege tu información
                        </h3>

                        <p>
                          Evita compartir contraseñas,
                          códigos PIN o información bancaria
                          mediante el chat.
                        </p>
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <AiAssistant
        pageContext="profile"
      />
    </div>
  );
}
/*
|--------------------------------------------------------------------------
| Campo reutilizable del formulario
|--------------------------------------------------------------------------
*/

function ProfileField({
  label,
  hint = "",
  required = false,
  isLight,
  children
}) {
  return (
    <label style={fieldWrapper}>
      <div style={fieldHeader}>
        <span style={fieldLabel(isLight)}>
          {label}

          {required && (
            <span style={requiredMark}>
              *
            </span>
          )}
        </span>

        {hint && (
          <span style={fieldHint(isLight)}>
            {hint}
          </span>
        )}
      </div>

      {children}
    </label>
  );
}

/*
|--------------------------------------------------------------------------
| Tarjeta de estadística
|--------------------------------------------------------------------------
*/

function ProfileStatCard({
  icon,
  title,
  value,
  description,
  isLight,
  accent
}) {
  return (
    <article style={profileStatCard(isLight)}>
      <div style={profileStatIcon(accent)}>
        {icon}
      </div>

      <div style={profileStatContent}>
        <span style={profileStatTitle(isLight)}>
          {title}
        </span>

        <strong style={profileStatValue(isLight)}>
          {safeNumber(value)}
        </strong>

        <p style={profileStatDescription(isLight)}>
          {description}
        </p>
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Línea de progreso del perfil
|--------------------------------------------------------------------------
*/

function ProfileCheck({
  done,
  text,
  isLight
}) {
  return (
    <div style={profileCheckRow(isLight)}>
      <span
        style={
          done
            ? profileCheckDone
            : profileCheckPending
        }
      >
        {done
          ? "✓"
          : "•"}
      </span>

      <span style={profileCheckText(isLight)}>
        {text}
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Fila informativa
|--------------------------------------------------------------------------
*/

function ProfileInfoRow({
  label,
  value,
  isLight,
  accent
}) {
  return (
    <div style={profileInfoRow(isLight)}>
      <span style={profileInfoLabel(isLight)}>
        {label}
      </span>

      <strong style={profileInfoValue(accent)}>
        {value}
      </strong>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Crear formulario a partir del usuario
|--------------------------------------------------------------------------
*/

function createProfileForm(
  user = {}
) {
  return {
    firstName:
      user?.firstName ||
      "",

    lastName:
      user?.lastName ||
      "",

    username:
      user?.username ||
      "",

    phone:
      user?.phone ||
      "",

    documentId:
      user?.documentId ||
      "",

    country:
      user?.country ||
      "República Dominicana",

    province:
      user?.province ||
      "",

    city:
      user?.city ||
      "",

    address:
      user?.address ||
      "",

    dateOfBirth:
      normalizeDateInput(
        user?.dateOfBirth ||
        user?.birthDate ||
        ""
      ),

    gender:
      normalizeGender(
        user?.gender
      ),

    bio:
      user?.bio ||
      ""
  };
}

/*
|--------------------------------------------------------------------------
| Detectar cambios del formulario
|--------------------------------------------------------------------------
*/

function hasProfileFormChanges(
  form,
  user
) {
  if (
    !form ||
    !user
  ) {
    return false;
  }

  const currentForm =
    createProfileForm(user);

  const normalizedForm = {
    firstName:
      String(
        form?.firstName ||
        ""
      ).trim(),

    lastName:
      String(
        form?.lastName ||
        ""
      ).trim(),

    username:
      String(
        form?.username ||
        ""
      )
        .trim()
        .toLowerCase()
        .replace(
          /^@/,
          ""
        ),

    phone:
      String(
        form?.phone ||
        ""
      ).trim(),

    documentId:
      String(
        form?.documentId ||
        ""
      ).trim(),

    country:
      String(
        form?.country ||
        ""
      ).trim(),

    province:
      String(
        form?.province ||
        ""
      ).trim(),

    city:
      String(
        form?.city ||
        ""
      ).trim(),

    address:
      String(
        form?.address ||
        ""
      ).trim(),

    dateOfBirth:
      normalizeDateInput(
        form?.dateOfBirth
      ),

    gender:
      normalizeGender(
        form?.gender
      ),

    bio:
      String(
        form?.bio ||
        ""
      ).trim()
  };

  const normalizedCurrent = {
    firstName:
      String(
        currentForm?.firstName ||
        ""
      ).trim(),

    lastName:
      String(
        currentForm?.lastName ||
        ""
      ).trim(),

    username:
      String(
        currentForm?.username ||
        ""
      )
        .trim()
        .toLowerCase()
        .replace(
          /^@/,
          ""
        ),

    phone:
      String(
        currentForm?.phone ||
        ""
      ).trim(),

    documentId:
      String(
        currentForm?.documentId ||
        ""
      ).trim(),

    country:
      String(
        currentForm?.country ||
        ""
      ).trim(),

    province:
      String(
        currentForm?.province ||
        ""
      ).trim(),

    city:
      String(
        currentForm?.city ||
        ""
      ).trim(),

    address:
      String(
        currentForm?.address ||
        ""
      ).trim(),

    dateOfBirth:
      normalizeDateInput(
        currentForm?.dateOfBirth
      ),

    gender:
      normalizeGender(
        currentForm?.gender
      ),

    bio:
      String(
        currentForm?.bio ||
        ""
      ).trim()
  };

  return (
    JSON.stringify(
      normalizedForm
    ) !==
    JSON.stringify(
      normalizedCurrent
    )
  );
}

/*
|--------------------------------------------------------------------------
| Guardar usuario localmente
|--------------------------------------------------------------------------
*/

function persistUser(
  user
) {
  if (
    !user ||
    typeof user !==
      "object"
  ) {
    return;
  }

  const safeUser = {
    ...user
  };

  delete safeUser.password;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpires;
  delete safeUser.twoFactorSecret;

  /*
  |--------------------------------------------------------------------------
  | No persistir enlaces temporales
  |--------------------------------------------------------------------------
  */

  if (
    String(
      safeUser?.profilePhoto ||
      ""
    ).startsWith(
      "blob:"
    )
  ) {
    safeUser.profilePhoto =
      "";
  }

  if (
    String(
      safeUser?.coverPhoto ||
      ""
    ).startsWith(
      "blob:"
    )
  ) {
    safeUser.coverPhoto =
      "";
  }

  localStorage.setItem(
    "qsm_user",
    JSON.stringify(
      safeUser
    )
  );

  localStorage.setItem(
    "user",
    JSON.stringify(
      safeUser
    )
  );
}

/*
|--------------------------------------------------------------------------
| JSON seguro
|--------------------------------------------------------------------------
*/

function safeJson(
  value
) {
  try {
    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Extraer objeto de distintas respuestas
|--------------------------------------------------------------------------
*/

function extractObject(
  source,
  preferredKeys = []
) {
  if (
    !source ||
    typeof source !==
      "object"
  ) {
    return null;
  }

  for (
    const key of
    preferredKeys
  ) {
    const value =
      source?.[key];

    if (
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
    ) {
      return value;
    }
  }

  if (
    !Array.isArray(source)
  ) {
    return source;
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Extraer arreglo
|--------------------------------------------------------------------------
*/

function extractArray(
  source,
  preferredKeys = []
) {
  if (
    Array.isArray(source)
  ) {
    return source;
  }

  if (
    !source ||
    typeof source !==
      "object"
  ) {
    return [];
  }

  for (
    const key of
    preferredKeys
  ) {
    const value =
      source?.[key];

    if (
      Array.isArray(value)
    ) {
      return value;
    }
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| Obtener ID genérico
|--------------------------------------------------------------------------
*/

function getEntityId(
  entity
) {
  if (!entity) {
    return "";
  }

  if (
    typeof entity ===
    "string"
  ) {
    return entity;
  }

  return (
    entity?._id ||
    entity?.id ||
    entity?.userId ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| Número seguro
|--------------------------------------------------------------------------
*/

function safeNumber(
  value,
  fallback = 0
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
}

/*
|--------------------------------------------------------------------------
| Limitar número
|--------------------------------------------------------------------------
*/

function clampNumber(
  value,
  minimum,
  maximum,
  fallback = 0
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      parsed
    )
  );
}

/*
|--------------------------------------------------------------------------
| Nombre capitalizado
|--------------------------------------------------------------------------
*/

function formatPersonName(
  value
) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .toLocaleLowerCase(
      "es-DO"
    )
    .replace(
      /(^|[\s'-])\p{L}/gu,
      (letter) =>
        letter.toLocaleUpperCase(
          "es-DO"
        )
    );
}

/*
|--------------------------------------------------------------------------
| Iniciales del usuario
|--------------------------------------------------------------------------
*/

function getInitials(
  value
) {
  const words =
    String(
      value || ""
    )
      .trim()
      .split(
        /\s+/
      )
      .filter(Boolean);

  if (
    words.length === 0
  ) {
    return "U";
  }

  if (
    words.length === 1
  ) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    words[0]
      .charAt(0)
      .toUpperCase() +
    words[
      words.length - 1
    ]
      .charAt(0)
      .toUpperCase()
  );
}

/*
|--------------------------------------------------------------------------
| Normalizar fecha para input date
|--------------------------------------------------------------------------
*/

function normalizeDateInput(
  value
) {
  if (!value) {
    return "";
  }

  const raw =
    String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      raw
    )
  ) {
    return raw;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

/*
|--------------------------------------------------------------------------
| Normalizar género
|--------------------------------------------------------------------------
*/

function normalizeGender(
  value
) {
  const normalized =
    String(
      value || ""
    ).toUpperCase();

  const aliases = {
    MASCULINO:
      "MALE",

    MALE:
      "MALE",

    FEMENINO:
      "FEMALE",

    FEMALE:
      "FEMALE",

    OTRO:
      "OTHER",

    OTHER:
      "OTHER",

    PREFER_NOT_TO_SAY:
      "PREFER_NOT_TO_SAY",

    NO_ESPECIFICADO:
      "PREFER_NOT_TO_SAY",

    "":
      "PREFER_NOT_TO_SAY"
  };

  return (
    aliases[normalized] ||
    "PREFER_NOT_TO_SAY"
  );
}

/*
|--------------------------------------------------------------------------
| Validar archivo de imagen
|--------------------------------------------------------------------------
*/

function validateImageFile(
  file,
  {
    allowedTypes,
    maxSize,
    label
  }
) {
  if (!file) {
    return {
      valid: false,
      message:
        `${label} no fue seleccionada.`
    };
  }

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    return {
      valid: false,
      message:
        `${label} debe ser JPG, PNG o WEBP.`
    };
  }

  if (
    file.size >
    maxSize
  ) {
    return {
      valid: false,
      message:
        `${label} supera el tamaño máximo permitido de ${formatFileSize(
          maxSize
        )}.`
    };
  }

  return {
    valid: true,
    message: ""
  };
}

/*
|--------------------------------------------------------------------------
| Formato de tamaño
|--------------------------------------------------------------------------
*/

function formatFileSize(
  bytes
) {
  const size =
    Number(bytes || 0);

  if (
    size < 1024
  ) {
    return `${size} bytes`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${Math.round(
      size / 1024
    )} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

/*
|--------------------------------------------------------------------------
| Liberar URL blob
|--------------------------------------------------------------------------
*/

function revokeBlobUrl(
  value
) {
  if (
    typeof value ===
      "string" &&
    value.startsWith(
      "blob:"
    )
  ) {
    URL.revokeObjectURL(
      value
    );
  }
}

/*
|--------------------------------------------------------------------------
| URL de foto de perfil
|--------------------------------------------------------------------------
*/

function getProfilePhotoUrl(
  value
) {
  return resolveImageUrl(
    value,
    "profiles"
  );
}

/*
|--------------------------------------------------------------------------
| URL de portada
|--------------------------------------------------------------------------
*/

function getCoverPhotoUrl(
  value
) {
  return resolveImageUrl(
    value,
    "covers"
  );
}

/*
|--------------------------------------------------------------------------
| Resolver URL de imagen
|--------------------------------------------------------------------------
*/

function resolveImageUrl(
  value,
  defaultFolder = ""
) {
  if (!value) {
    return "";
  }

  const rawValue =
    typeof value ===
    "string"
      ? value
      : value?.url ||
        value?.path ||
        value
          ?.secure_url ||
        value
          ?.imageUrl ||
        value
          ?.publicUrl ||
        "";

  if (!rawValue) {
    return "";
  }

  const cleanValue =
    String(
      rawValue
    )
      .trim()
      .replaceAll(
        "&#x2F;",
        "/"
      )
      .replaceAll(
        "&amp;",
        "&"
      )
      .replace(
        /\\/g,
        "/"
      );

  if (
    cleanValue.startsWith(
      "http://"
    ) ||
    cleanValue.startsWith(
      "https://"
    ) ||
    cleanValue.startsWith(
      "data:image/"
    ) ||
    cleanValue.startsWith(
      "blob:"
    )
  ) {
    return cleanValue;
  }

  const apiOrigin =
    getApiOrigin();

  if (
    cleanValue.startsWith(
      "/uploads/"
    )
  ) {
    return `${apiOrigin}${cleanValue}`;
  }

  if (
    cleanValue.startsWith(
      "uploads/"
    )
  ) {
    return `${apiOrigin}/${cleanValue}`;
  }

  const cleanFolder =
    String(
      defaultFolder || ""
    )
      .replace(
        /^\/+|\/+$/g,
        ""
      );

  if (
    cleanFolder
  ) {
    return `${apiOrigin}/uploads/${cleanFolder}/${cleanValue}`;
  }

  return `${apiOrigin}/uploads/${cleanValue}`;
}

/*
|--------------------------------------------------------------------------
| Obtener origen del backend
|--------------------------------------------------------------------------
*/

function getApiOrigin() {
  const configuredUrl =
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:5000/api";

  return String(
    configuredUrl
  )
    .trim()
    .replace(
      /\/api\/?$/,
      ""
    )
    .replace(
      /\/$/,
      ""
    );
}

/*
|--------------------------------------------------------------------------
| Color principal
|--------------------------------------------------------------------------
*/

function getAccentColor(
  color
) {
  const map = {
    cyan:
      "#35d0c3",

    purple:
      "#8b5cf6",

    pink:
      "#ec4899",

    blue:
      "#38bdf8",

    green:
      "#22c55e",

    orange:
      "#f59e0b"
  };

  return (
    map[
      String(
        color || ""
      ).toLowerCase()
    ] ||
    "#35d0c3"
  );
}

/*
|--------------------------------------------------------------------------
| Nombre del color
|--------------------------------------------------------------------------
*/

function formatAccent(
  color
) {
  const map = {
    cyan:
      "Cian",

    purple:
      "Morado",

    pink:
      "Rosado",

    blue:
      "Azul",

    green:
      "Verde",

    orange:
      "Naranja"
  };

  return (
    map[
      String(
        color || ""
      ).toLowerCase()
    ] ||
    "Cian"
  );
}

/*
|--------------------------------------------------------------------------
| Densidad
|--------------------------------------------------------------------------
*/

function formatDensity(
  density
) {
  const map = {
    comfortable:
      "Cómodo",

    compact:
      "Compacto",

    spacious:
      "Espacioso"
  };

  return (
    map[
      String(
        density || ""
      ).toLowerCase()
    ] ||
    "Cómodo"
  );
}

/*
|--------------------------------------------------------------------------
| Rol legible
|--------------------------------------------------------------------------
*/

function formatRole(
  value
) {
  const role =
    String(
      value || "USER"
    ).toUpperCase();

  const map = {
    USER:
      "Usuario QSM",

    ADMIN:
      "Administrador",

    SENIOR_ADMIN:
      "Senior Admin",

    AUDITOR:
      "Auditor",

    DISPUTE_AGENT:
      "Agente de disputas",

    VERIFICATION_AGENT:
      "Agente de verificación",

    WAREHOUSE:
      "Agente de almacén",

    WAREHOUSE_MANAGER:
      "Encargado de almacén",

    DELIVERY:
      "Agente de delivery",

    DELIVERY_MANAGER:
      "Encargado de delivery",

    FINANCE:
      "Agente de finanzas",

    FINANCE_MANAGER:
      "Encargado de finanzas",

    SECURITY:
      "Seguridad",

    SUPPORT:
      "Soporte"
  };

  return (
    map[role] ||
    role
  );
}

/*
|--------------------------------------------------------------------------
| Estado de la cuenta
|--------------------------------------------------------------------------
*/

function formatAccountStatus(
  value
) {
  const status =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    ACTIVE:
      "Activa",

    PENDING:
      "Pendiente",

    SUSPENDED:
      "Suspendida",

    BANNED:
      "Bloqueada",

    DELETED:
      "Eliminada"
  };

  return (
    map[status] ||
    "Pendiente"
  );
}

/*
|--------------------------------------------------------------------------
| Nivel de seguridad
|--------------------------------------------------------------------------
*/

function formatSecurityLevel(
  value
) {
  const level =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    NORMAL:
      "Normal",

    ELEVATED:
      "Elevado",

    LOCKED:
      "Bloqueado",

    CRITICAL:
      "Crítico"
  };

  return (
    map[level] ||
    "Normal"
  );
}

/*
|--------------------------------------------------------------------------
| Aplicar preferencias
|--------------------------------------------------------------------------
*/

function applySettings(
  settings
) {
  const safeSettings = {
    ...DEFAULT_SETTINGS,
    ...(
      settings || {}
    )
  };

  const accent =
    getAccentColor(
      safeSettings
        ?.accentColor
    );

  document
    .documentElement
    .style
    .setProperty(
      "--qsm-accent",
      accent
    );

  document.body.dataset.qsmTheme =
    safeSettings?.theme ||
    "dark";

  localStorage.setItem(
    "qsm_theme",
    safeSettings?.theme ||
    "dark"
  );

  localStorage.setItem(
    "qsm_accent",
    safeSettings
      ?.accentColor ||
    "cyan"
  );

  localStorage.setItem(
    "qsm_language",
    safeSettings
      ?.language ||
    "es"
  );

  localStorage.setItem(
    "qsm_settings",
    JSON.stringify(
      safeSettings
    )
  );
}
/*
|--------------------------------------------------------------------------
| Página general
|--------------------------------------------------------------------------
*/

const page = (isLight) => ({
  width: "100%",
  minHeight: "100vh",

  color:
    isLight
      ? "#0f172a"
      : "#f8fafc",

  background:
    isLight
      ? `
        radial-gradient(
          circle at 92% 3%,
          rgba(53, 208, 195, .14),
          transparent 30%
        ),
        radial-gradient(
          circle at 8% 18%,
          rgba(56, 189, 248, .10),
          transparent 26%
        ),
        #f8fafc
      `
      : `
        radial-gradient(
          circle at 92% 3%,
          rgba(139, 92, 246, .16),
          transparent 31%
        ),
        radial-gradient(
          circle at 10% 16%,
          rgba(53, 208, 195, .10),
          transparent 27%
        ),
        #020617
      `
});

/*
|--------------------------------------------------------------------------
| Layout principal
|--------------------------------------------------------------------------
*/

const layout = (
  settings,
  sidebarCollapsed
) => ({
  width: "100%",
  minHeight: "100vh",

  display: "grid",

  gridTemplateColumns:
    sidebarCollapsed
      ? "96px minmax(0, 1fr)"
      : settings?.compactSidebar
      ? "230px minmax(0, 1fr)"
      : "300px minmax(0, 1fr)",

  overflowX: "hidden",

  transition:
    "grid-template-columns .28s ease"
});

const main = (settings) => ({
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",

  padding:
    settings?.density === "compact"
      ? "18px 24px 44px"
      : settings?.density === "spacious"
      ? "34px 44px 72px"
      : "24px 32px 62px",

  overflowX: "hidden"
});

const contentContainer = {
  width: "100%",
  maxWidth: "1640px",

  margin: "0 auto"
};

/*
|--------------------------------------------------------------------------
| Encabezado de página
|--------------------------------------------------------------------------
*/

const pageToolbar = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "24px",

  margin: "22px 0 18px"
};

const eyebrow = (accent) => ({
  margin: 0,

  color: accent,

  fontSize: "10px",
  fontWeight: "950",

  letterSpacing: "3.4px",
  textTransform: "uppercase"
});

const pageTitle = (isLight) => ({
  margin: "8px 0 6px",

  color:
    isLight
      ? "#0f172a"
      : "#f8fafc",

  fontSize:
    "clamp(25px, 2.2vw, 34px)",

  lineHeight: "1.1",
  letterSpacing: "-.7px"
});

const pageDescription = (isLight) => ({
  maxWidth: "760px",

  margin: 0,

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "13px",
  lineHeight: "21px"
});

const refreshButton = (
  isLight,
  accent
) => ({
  minHeight: "46px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "11px 17px",

  borderRadius: "14px",

  border:
    `1px solid ${accent}55`,

  background:
    isLight
      ? `${accent}10`
      : `${accent}16`,

  color: accent,

  fontSize: "11px",
  fontWeight: "950",

  whiteSpace: "nowrap",

  cursor: "pointer"
});

/*
|--------------------------------------------------------------------------
| Hero del perfil
|--------------------------------------------------------------------------
*/

const profileHero = (
  isLight,
  settings
) => ({
  width: "100%",

  overflow: "hidden",

  marginBottom: "18px",

  borderRadius: "29px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .15)",

  background:
    isLight
      ? "rgba(255, 255, 255, .90)"
      : "rgba(15, 23, 42, .76)",

  boxShadow:
    isLight
      ? "0 24px 70px rgba(15, 23, 42, .07)"
      : "0 26px 85px rgba(0, 0, 0, .24)",

  backdropFilter:
    settings?.glassEffect === false
      ? "none"
      : "blur(16px)",

  animation:
    settings?.animations === false
      ? "none"
      : "profileFadeUp .35s ease"
});

/*
|--------------------------------------------------------------------------
| Portada
|--------------------------------------------------------------------------
*/

const coverContainer = (
  isLight,
  accent
) => ({
  position: "relative",

  width: "100%",
  height: "270px",

  overflow: "hidden",

  background:
    `linear-gradient(
      135deg,
      ${accent}34,
      rgba(139, 92, 246, .28),
      ${isLight ? "#e2e8f0" : "#020617"}
    )`
});

const coverImage = {
  width: "100%",
  height: "100%",

  display: "block",

  objectFit: "cover",
  objectPosition: "center"
};

const defaultCover = (accent) => ({
  position: "relative",

  width: "100%",
  height: "100%",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "hidden",

  background:
    `
      radial-gradient(
        circle at 18% 28%,
        ${accent}60,
        transparent 30%
      ),
      radial-gradient(
        circle at 82% 24%,
        rgba(139, 92, 246, .52),
        transparent 30%
      ),
      radial-gradient(
        circle at 54% 86%,
        rgba(56, 189, 248, .24),
        transparent 28%
      ),
      linear-gradient(
        135deg,
        rgba(2, 6, 23, .98),
        rgba(15, 23, 42, .88)
      )
    `
});

const coverGridPattern = {
  position: "absolute",
  inset: 0,

  opacity: 0.22,

  backgroundImage:
    `
      linear-gradient(
        rgba(255,255,255,.07) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255,255,255,.07) 1px,
        transparent 1px
      )
    `,

  backgroundSize: "36px 36px",

  pointerEvents: "none"
};

const coverIdentityBox = {
  position: "relative",
  zIndex: 2,

  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "12px",

  maxWidth: "900px",

  padding: "19px 22px",

  borderRadius: "22px",

  border:
    "1px solid rgba(255, 255, 255, .17)",

  background:
    "rgba(2, 6, 23, .42)",

  color: "#ffffff",

  fontSize: "11px",
  fontWeight: "900",

  backdropFilter: "blur(17px)",

  boxShadow:
    "0 20px 60px rgba(0, 0, 0, .28)"
};

const coverActions = {
  position: "absolute",

  right: "20px",
  bottom: "18px",

  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: "9px"
};

const coverActionButton = (accent) => ({
  minHeight: "42px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    `1px solid ${accent}60`,

  background:
    "rgba(2, 6, 23, .68)",

  color: "#ffffff",

  fontSize: "10px",
  fontWeight: "950",

  cursor: "pointer",

  backdropFilter: "blur(14px)"
});

const coverSecondaryButton = {
  minHeight: "42px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    "1px solid rgba(148, 163, 184, .23)",

  background:
    "rgba(15, 23, 42, .72)",

  color: "#cbd5e1",

  fontSize: "10px",
  fontWeight: "900",

  cursor: "pointer",

  backdropFilter: "blur(14px)"
};

const coverDangerButton = {
  minHeight: "42px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    "1px solid rgba(239, 68, 68, .30)",

  background:
    "rgba(127, 29, 29, .42)",

  color: "#fecaca",

  fontSize: "10px",
  fontWeight: "900",

  cursor: "pointer",

  backdropFilter: "blur(14px)"
};

/*
|--------------------------------------------------------------------------
| Encabezado inferior del perfil
|--------------------------------------------------------------------------
*/

const profileHeaderContent = {
  position: "relative",

  display: "grid",

  gridTemplateColumns:
    "minmax(0, 1fr) auto",

  alignItems: "end",
  gap: "24px",

  padding: "0 26px 26px"
};

const profilePhotoSection = {
  minWidth: 0,

  display: "flex",
  alignItems: "flex-end",
  gap: "20px",

  marginTop: "-62px"
};

/*
|--------------------------------------------------------------------------
| Foto de perfil
|--------------------------------------------------------------------------
*/

const profilePhotoFrame = (accent) => ({
  position: "relative",

  width: "140px",
  height: "140px",
  minWidth: "140px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "visible",

  borderRadius: "37px",

  border:
    "5px solid rgba(255, 255, 255, .94)",

  background:
    `linear-gradient(
      135deg,
      ${accent},
      #38bdf8,
      #8b5cf6
    )`,

  color: "#ffffff",

  fontSize: "43px",
  fontWeight: "950",

  boxShadow:
    `0 0 0 1px ${accent}42,
     0 18px 50px ${accent}30`
});

const profilePhotoImage = {
  width: "100%",
  height: "100%",

  display: "block",

  borderRadius: "32px",

  objectFit: "cover",
  objectPosition: "center"
};

const profilePhotoButton = (accent) => ({
  position: "absolute",

  right: "-5px",
  bottom: "9px",

  width: "40px",
  height: "40px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  border:
    "3px solid rgba(255, 255, 255, .94)",

  background: accent,

  color: "#ffffff",

  fontSize: "15px",

  cursor: "pointer",

  boxShadow:
    "0 10px 26px rgba(0, 0, 0, .28)"
});

const profileVerifiedMark = {
  position: "absolute",

  left: "-4px",
  bottom: "8px",

  width: "28px",
  height: "28px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  border:
    "3px solid rgba(255, 255, 255, .94)",

  background: "#35d0c3",

  color: "#020617",

  fontSize: "11px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Identidad del usuario
|--------------------------------------------------------------------------
*/

const identityInformation = {
  minWidth: 0,

  paddingBottom: "4px"
};

const identityName = (isLight) => ({
  margin: "8px 0 5px",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize:
    "clamp(37px, 3vw, 53px)",

  lineHeight: "1",
  letterSpacing: "-1.5px",

  wordBreak: "break-word"
});

const identityEmail = (isLight) => ({
  margin: 0,

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "12px",
  lineHeight: "18px",

  wordBreak: "break-word"
});

const usernameText = (accent) => ({
  margin: "5px 0 0",

  color: accent,

  fontSize: "11px",
  fontWeight: "850"
});

const identityBadges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",

  marginTop: "13px"
};

const verifiedBadge = (
  verified
) => ({
  minHeight: "31px",

  display: "inline-flex",
  alignItems: "center",

  padding: "7px 11px",

  borderRadius: "999px",

  border:
    verified
      ? "1px solid rgba(34, 197, 94, .32)"
      : "1px solid rgba(245, 158, 11, .32)",

  background:
    verified
      ? "rgba(34, 197, 94, .13)"
      : "rgba(245, 158, 11, .13)",

  color:
    verified
      ? "#86efac"
      : "#fde68a",

  fontSize: "9px",
  fontWeight: "900"
});

const trustBadge = (accent) => ({
  minHeight: "31px",

  display: "inline-flex",
  alignItems: "center",

  padding: "7px 11px",

  borderRadius: "999px",

  border:
    `1px solid ${accent}50`,

  background:
    `${accent}16`,

  color: accent,

  fontSize: "9px",
  fontWeight: "900"
});

const roleBadge = {
  minHeight: "31px",

  display: "inline-flex",
  alignItems: "center",

  padding: "7px 11px",

  borderRadius: "999px",

  border:
    "1px solid rgba(139, 92, 246, .33)",

  background:
    "rgba(139, 92, 246, .14)",

  color: "#ddd6fe",

  fontSize: "9px",
  fontWeight: "900"
};

/*
|--------------------------------------------------------------------------
| Aviso de imagen pendiente
|--------------------------------------------------------------------------
*/

const pendingImageNotice = {
  maxWidth: "520px",

  display: "grid",

  gridTemplateColumns:
    "34px minmax(0, 1fr) 30px",

  alignItems: "center",
  gap: "10px",

  marginTop: "13px",
  padding: "10px 11px",

  borderRadius: "13px",

  border:
    "1px solid rgba(245, 158, 11, .24)",

  background:
    "rgba(120, 53, 15, .14)",

  color: "#fde68a",

  fontSize: "9px"
};

const smallCancelButton = {
  width: "30px",
  height: "30px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "9px",

  border:
    "1px solid rgba(248, 113, 113, .24)",

  background:
    "rgba(127, 29, 29, .20)",

  color: "#fca5a5",

  fontSize: "17px",

  cursor: "pointer"
};

/*
|--------------------------------------------------------------------------
| Acciones principales del perfil
|--------------------------------------------------------------------------
*/

const profileMainActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: "9px"
};

const secondaryActionButton = (
  isLight
) => ({
  minHeight: "43px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .10)"
      : "1px solid rgba(148, 163, 184, .15)",

  background:
    isLight
      ? "rgba(255, 255, 255, .80)"
      : "rgba(15, 23, 42, .60)",

  color:
    isLight
      ? "#0f172a"
      : "#e2e8f0",

  textDecoration: "none",

  fontSize: "10px",
  fontWeight: "900"
});

const removePhotoButton = {
  minHeight: "43px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    "1px solid rgba(239, 68, 68, .26)",

  background:
    "rgba(127, 29, 29, .15)",

  color: "#fca5a5",

  fontSize: "10px",
  fontWeight: "900",

  cursor: "pointer"
};

const logoutProfileButton = {
  minHeight: "43px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    "1px solid rgba(248, 113, 113, .28)",

  background:
    "linear-gradient(135deg, rgba(127, 29, 29, .22), rgba(76, 5, 25, .16))",

  color: "#fecaca",

  fontSize: "10px",
  fontWeight: "900",

  cursor: "pointer"
};
/*
|--------------------------------------------------------------------------
| Mensajes de estado
|--------------------------------------------------------------------------
*/

const successBox = {
  display: "grid",

  gridTemplateColumns:
    "38px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "11px",

  marginBottom: "16px",
  padding: "14px 16px",

  borderRadius: "15px",

  border:
    "1px solid rgba(34, 197, 94, .30)",

  background:
    "rgba(20, 83, 45, .18)",

  color: "#bbf7d0",

  fontSize: "11px",
  lineHeight: "18px"
};

const errorBox = {
  display: "grid",

  gridTemplateColumns:
    "38px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "11px",

  marginBottom: "16px",
  padding: "14px 16px",

  borderRadius: "15px",

  border:
    "1px solid rgba(248, 113, 113, .30)",

  background:
    "rgba(127, 29, 29, .22)",

  color: "#fecaca",

  fontSize: "11px",
  lineHeight: "18px"
};

const warningBox = (
  isLight
) => ({
  display: "grid",

  gridTemplateColumns:
    "38px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "11px",

  marginBottom: "16px",
  padding: "14px 16px",

  borderRadius: "15px",

  border:
    "1px solid rgba(245, 158, 11, .28)",

  background:
    isLight
      ? "rgba(255, 251, 235, .90)"
      : "rgba(120, 53, 15, .16)",

  color:
    isLight
      ? "#92400e"
      : "#fde68a",

  fontSize: "11px",
  lineHeight: "18px"
});

const warningList = {
  margin: "6px 0 0",
  paddingLeft: "17px"
};

const messageIcon = {
  width: "38px",
  height: "38px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "12px",

  background:
    "rgba(255, 255, 255, .08)",

  fontSize: "17px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Estado de carga
|--------------------------------------------------------------------------
*/

const loadingCard = (
  isLight
) => ({
  minHeight: "330px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  padding: "38px",

  borderRadius: "25px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .14)",

  background:
    isLight
      ? "rgba(255, 255, 255, .88)"
      : "rgba(15, 23, 42, .72)",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  textAlign: "center",

  boxShadow:
    isLight
      ? "0 20px 60px rgba(15, 23, 42, .06)"
      : "0 22px 70px rgba(0, 0, 0, .18)"
});

const loadingSymbol = {
  width: "64px",
  height: "64px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  marginBottom: "13px",

  borderRadius: "19px",

  background:
    "linear-gradient(135deg, rgba(53,208,195,.16), rgba(139,92,246,.18))",

  fontSize: "30px",

  animation:
    "profilePulse 1.5s infinite"
};

/*
|--------------------------------------------------------------------------
| Estadísticas
|--------------------------------------------------------------------------
*/

const statsGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",

  gap: "14px",

  marginBottom: "18px"
};

const profileStatCard = (
  isLight
) => ({
  minWidth: 0,
  minHeight: "118px",

  display: "grid",

  gridTemplateColumns:
    "52px minmax(0, 1fr)",

  alignItems: "center",
  gap: "13px",

  padding: "18px",

  borderRadius: "20px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .13)",

  background:
    isLight
      ? "rgba(255, 255, 255, .88)"
      : "rgba(15, 23, 42, .72)",

  boxShadow:
    isLight
      ? "0 17px 46px rgba(15, 23, 42, .05)"
      : "0 18px 50px rgba(0, 0, 0, .13)"
});

const profileStatIcon = (
  accent
) => ({
  width: "52px",
  height: "52px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "16px",

  border:
    `1px solid ${accent}35`,

  background:
    `${accent}17`,

  fontSize: "23px"
});

const profileStatContent = {
  minWidth: 0
};

const profileStatTitle = (
  isLight
) => ({
  display: "block",

  marginBottom: "3px",

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "10px",
  fontWeight: "850"
});

const profileStatValue = (
  isLight
) => ({
  display: "block",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "27px",
  lineHeight: "31px"
});

const profileStatDescription = (
  isLight
) => ({
  margin: "5px 0 0",

  color:
    isLight
      ? "#94a3b8"
      : "#64748b",

  fontSize: "9px",
  lineHeight: "15px"
});

/*
|--------------------------------------------------------------------------
| Cuadrícula principal
|--------------------------------------------------------------------------
*/

const profileContentGrid = {
  display: "grid",

  gridTemplateColumns:
    "minmax(0, 1.35fr) minmax(330px, .65fr)",

  alignItems: "start",
  gap: "18px"
};

const formPanel = (
  isLight,
  settings
) => ({
  minWidth: 0,

  padding: "24px",

  borderRadius: "25px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .14)",

  background:
    isLight
      ? "rgba(255, 255, 255, .88)"
      : "rgba(15, 23, 42, .72)",

  boxShadow:
    isLight
      ? "0 20px 60px rgba(15, 23, 42, .06)"
      : "0 22px 70px rgba(0, 0, 0, .17)",

  backdropFilter:
    settings?.glassEffect === false
      ? "none"
      : "blur(15px)"
});

const panelHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",

  marginBottom: "21px"
};

const panelTitle = (
  isLight
) => ({
  margin: "7px 0 6px",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "21px",
  lineHeight: "26px"
});

const panelDescription = (
  isLight
) => ({
  maxWidth: "760px",

  margin: 0,

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "11px",
  lineHeight: "18px"
});

const pendingChangesBadge = {
  flexShrink: 0,

  minHeight: "30px",

  display: "inline-flex",
  alignItems: "center",

  padding: "6px 10px",

  borderRadius: "999px",

  border:
    "1px solid rgba(245, 158, 11, .28)",

  background:
    "rgba(245, 158, 11, .11)",

  color: "#fde68a",

  fontSize: "8px",
  fontWeight: "950",

  whiteSpace: "nowrap"
};

/*
|--------------------------------------------------------------------------
| Formulario
|--------------------------------------------------------------------------
*/

const formGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",

  gap: "14px"
};

const fieldWrapper = {
  minWidth: 0,

  display: "grid",
  gap: "8px",

  marginBottom: "14px"
};

const fieldHeader = {
  minWidth: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px"
};

const fieldLabel = (
  isLight
) => ({
  color:
    isLight
      ? "#1e293b"
      : "#e2e8f0",

  fontSize: "10px",
  fontWeight: "900"
});

const requiredMark = {
  marginLeft: "3px",

  color: "#f87171"
};

const fieldHint = (
  isLight
) => ({
  color:
    isLight
      ? "#94a3b8"
      : "#64748b",

  fontSize: "8px",
  textAlign: "right"
});

const formInput = (
  isLight
) => ({
  width: "100%",
  minWidth: 0,
  minHeight: "52px",

  padding: "0 14px",

  borderRadius: "14px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .11)"
      : "1px solid rgba(148, 163, 184, .15)",

  background:
    isLight
      ? "rgba(248, 250, 252, .94)"
      : "rgba(2, 6, 23, .52)",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "11px",

  outline: "none"
});

const formTextarea = (
  isLight
) => ({
  ...formInput(isLight),

  minHeight: "132px",

  padding: "13px 14px",

  resize: "vertical",

  lineHeight: "19px"
});

/*
|--------------------------------------------------------------------------
| Campo con prefijo
|--------------------------------------------------------------------------
*/

const inputPrefixContainer = (
  isLight
) => ({
  width: "100%",
  minHeight: "52px",

  display: "grid",

  gridTemplateColumns:
    "38px minmax(0, 1fr)",

  alignItems: "center",

  overflow: "hidden",

  borderRadius: "14px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .11)"
      : "1px solid rgba(148, 163, 184, .15)",

  background:
    isLight
      ? "rgba(248, 250, 252, .94)"
      : "rgba(2, 6, 23, .52)"
});

const inputPrefix = {
  height: "100%",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRight:
    "1px solid rgba(148, 163, 184, .12)",

  color: "#35d0c3",

  fontSize: "13px",
  fontWeight: "950"
};

const prefixedInput = (
  isLight
) => ({
  width: "100%",
  minWidth: 0,
  height: "50px",

  padding: "0 13px",

  border: "none",
  outline: "none",

  background:
    "transparent",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "11px"
});

/*
|--------------------------------------------------------------------------
| Acciones del formulario
|--------------------------------------------------------------------------
*/

const formActions = {
  display: "grid",

  gridTemplateColumns:
    "minmax(130px, .6fr) minmax(190px, 1.4fr)",

  gap: "10px",

  marginTop: "18px"
};

const resetButton = (
  isLight
) => ({
  minHeight: "48px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "11px 15px",

  borderRadius: "14px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .11)"
      : "1px solid rgba(148, 163, 184, .15)",

  background:
    isLight
      ? "rgba(248, 250, 252, .88)"
      : "rgba(15, 23, 42, .65)",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "10px",
  fontWeight: "900",

  cursor: "pointer"
});

const saveButton = (
  accent
) => ({
  minHeight: "48px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "11px 17px",

  border: "none",
  borderRadius: "14px",

  background:
    `linear-gradient(
      135deg,
      ${accent},
      #38bdf8,
      #8b5cf6
    )`,

  color: "#ffffff",

  fontSize: "10px",
  fontWeight: "950",

  cursor: "pointer",

  boxShadow:
    `0 16px 46px ${accent}2c`
});
 /*
|--------------------------------------------------------------------------
| Columna lateral
|--------------------------------------------------------------------------
*/

const profileSideColumn = {
  display: "grid",
  gap: "18px",

  alignSelf: "start"
};

const sideCard = (
  isLight,
  settings
) => ({
  minWidth: 0,

  padding: "22px",

  borderRadius: "23px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .14)",

  background:
    isLight
      ? "rgba(255, 255, 255, .88)"
      : "rgba(15, 23, 42, .72)",

  boxShadow:
    isLight
      ? "0 18px 52px rgba(15, 23, 42, .06)"
      : "0 20px 60px rgba(0, 0, 0, .16)",

  backdropFilter:
    settings?.glassEffect === false
      ? "none"
      : "blur(14px)"
});

const sideCardTitle = (
  isLight
) => ({
  margin: "7px 0 10px",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "19px",
  lineHeight: "24px"
});

/*
|--------------------------------------------------------------------------
| Círculo de progreso
|--------------------------------------------------------------------------
*/

const completionRing = (
  accent
) => ({
  width: "142px",
  height: "142px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  margin: "20px auto 16px",

  borderRadius: "50%",

  background:
    `
      conic-gradient(
        ${accent} 0deg,
        #38bdf8 145deg,
        #8b5cf6 250deg,
        rgba(148, 163, 184, .15) 250deg
      )
    `,

  boxShadow:
    `0 16px 44px ${accent}24`
});

const completionRingInner = (
  isLight
) => ({
  width: "110px",
  height: "110px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  background:
    isLight
      ? "#ffffff"
      : "#081325",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(148, 163, 184, .10)",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  textAlign: "center"
});

const progressBar = (
  isLight
) => ({
  width: "100%",
  height: "9px",

  overflow: "hidden",

  marginBottom: "15px",

  borderRadius: "999px",

  background:
    isLight
      ? "rgba(15, 23, 42, .09)"
      : "rgba(148, 163, 184, .14)"
});

const progressBarFill = (
  accent
) => ({
  height: "100%",

  borderRadius: "999px",

  background:
    `linear-gradient(
      90deg,
      ${accent},
      #38bdf8,
      #8b5cf6
    )`,

  transition:
    "width .4s ease"
});

/*
|--------------------------------------------------------------------------
| Checks del perfil
|--------------------------------------------------------------------------
*/

const profileCheckRow = (
  isLight
) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",

  padding: "10px 0",

  borderBottom:
    isLight
      ? "1px solid rgba(15, 23, 42, .07)"
      : "1px solid rgba(148, 163, 184, .09)"
});

const profileCheckDone = {
  width: "25px",
  height: "25px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  background: "#35d0c3",

  color: "#020617",

  fontSize: "10px",
  fontWeight: "950"
};

const profileCheckPending = {
  ...profileCheckDone,

  background:
    "rgba(148, 163, 184, .15)",

  color: "#64748b"
};

const profileCheckText = (
  isLight
) => ({
  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "10px"
});

/*
|--------------------------------------------------------------------------
| Enlaces laterales
|--------------------------------------------------------------------------
*/

const sidePrimaryLink = (
  accent
) => ({
  minHeight: "44px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  marginTop: "16px",
  padding: "10px 14px",

  borderRadius: "13px",

  border: "none",

  background:
    `linear-gradient(
      135deg,
      ${accent},
      #38bdf8,
      #8b5cf6
    )`,

  color: "#ffffff",

  textDecoration: "none",

  fontSize: "10px",
  fontWeight: "950",

  boxShadow:
    `0 14px 40px ${accent}28`
});

const sideSecondaryLink = (
  isLight
) => ({
  minHeight: "44px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  marginTop: "15px",
  padding: "10px 14px",

  borderRadius: "13px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .10)"
      : "1px solid rgba(148, 163, 184, .15)",

  background:
    isLight
      ? "rgba(248, 250, 252, .88)"
      : "rgba(15, 23, 42, .64)",

  color:
    isLight
      ? "#0f172a"
      : "#e2e8f0",

  textDecoration: "none",

  fontSize: "10px",
  fontWeight: "900"
});

/*
|--------------------------------------------------------------------------
| Información del perfil
|--------------------------------------------------------------------------
*/

const profileInfoRow = (
  isLight
) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",

  padding: "11px 0",

  borderBottom:
    isLight
      ? "1px solid rgba(15, 23, 42, .07)"
      : "1px solid rgba(148, 163, 184, .09)"
});

const profileInfoLabel = (
  isLight
) => ({
  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "10px"
});

const profileInfoValue = (
  accent
) => ({
  color: accent,

  fontSize: "10px",
  textAlign: "right"
});

/*
|--------------------------------------------------------------------------
| Aviso de seguridad
|--------------------------------------------------------------------------
*/

const securityNotice = (
  isLight
) => ({
  display: "grid",

  gridTemplateColumns:
    "46px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "12px",

  padding: "19px",

  borderRadius: "21px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(53, 208, 195, .22)",

  background:
    isLight
      ? "rgba(255, 255, 255, .88)"
      : "linear-gradient(135deg, rgba(53, 208, 195, .09), rgba(139, 92, 246, .08))",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  boxShadow:
    isLight
      ? "0 16px 46px rgba(15, 23, 42, .05)"
      : "0 18px 52px rgba(0, 0, 0, .14)"
});

const securityNoticeIcon = {
  width: "46px",
  height: "46px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "14px",

  border:
    "1px solid rgba(53, 208, 195, .20)",

  background:
    "rgba(53, 208, 195, .11)",

  fontSize: "21px"
};
 /*
|--------------------------------------------------------------------------
| Ajustes complementarios del perfil
|--------------------------------------------------------------------------
*/

const profileSectionDivider = (
  isLight
) => ({
  width: "100%",
  height: "1px",

  margin: "18px 0",

  background:
    isLight
      ? "linear-gradient(90deg, transparent, rgba(15, 23, 42, .12), transparent)"
      : "linear-gradient(90deg, transparent, rgba(148, 163, 184, .14), transparent)"
});

/*
|--------------------------------------------------------------------------
| Texto auxiliar
|--------------------------------------------------------------------------
*/

const helperText = (
  isLight
) => ({
  margin: "5px 0 0",

  color:
    isLight
      ? "#94a3b8"
      : "#64748b",

  fontSize: "8px",
  lineHeight: "14px"
});

/*
|--------------------------------------------------------------------------
| Etiqueta de privacidad
|--------------------------------------------------------------------------
*/

const privacyBadge = (
  accent
) => ({
  width: "fit-content",

  display: "inline-flex",
  alignItems: "center",
  gap: "5px",

  padding: "5px 8px",

  borderRadius: "999px",

  border:
    `1px solid ${accent}35`,

  background:
    `${accent}10`,

  color: accent,

  fontSize: "8px",
  fontWeight: "850"
});

/*
|--------------------------------------------------------------------------
| Estado deshabilitado
|--------------------------------------------------------------------------
*/

const disabledField = {
  opacity: 0.58,
  cursor: "not-allowed"
};

/*
|--------------------------------------------------------------------------
| Tarjeta de privacidad
|--------------------------------------------------------------------------
*/

const privacyCard = (
  isLight
) => ({
  display: "grid",
  gap: "9px",

  padding: "15px",

  borderRadius: "16px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(148, 163, 184, .10)",

  background:
    isLight
      ? "rgba(248, 250, 252, .82)"
      : "rgba(2, 6, 23, .28)"
});

/*
|--------------------------------------------------------------------------
| Fila de privacidad
|--------------------------------------------------------------------------
*/

const privacyRow = (
  isLight
) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",

  padding: "8px 0",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "9px"
});

/*
|--------------------------------------------------------------------------
| Estado destacado
|--------------------------------------------------------------------------
*/

const statusPill = (
  type = "default"
) => {
  const variants = {
    success: {
      border:
        "1px solid rgba(34, 197, 94, .30)",

      background:
        "rgba(34, 197, 94, .12)",

      color:
        "#86efac"
    },

    warning: {
      border:
        "1px solid rgba(245, 158, 11, .30)",

      background:
        "rgba(245, 158, 11, .12)",

      color:
        "#fde68a"
    },

    danger: {
      border:
        "1px solid rgba(239, 68, 68, .30)",

      background:
        "rgba(239, 68, 68, .12)",

      color:
        "#fca5a5"
    },

    default: {
      border:
        "1px solid rgba(53, 208, 195, .28)",

      background:
        "rgba(53, 208, 195, .11)",

      color:
        "#5eead4"
    }
  };

  return {
    minHeight: "27px",

    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "5px 9px",

    borderRadius: "999px",

    fontSize: "8px",
    fontWeight: "900",

    whiteSpace: "nowrap",

    ...(variants[type] ||
      variants.default)
  };
};

/*
|--------------------------------------------------------------------------
| Indicador de campo válido
|--------------------------------------------------------------------------
*/

const validFieldIndicator = {
  width: "20px",
  height: "20px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  background:
    "rgba(34, 197, 94, .14)",

  color: "#86efac",

  fontSize: "8px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Indicador de campo pendiente
|--------------------------------------------------------------------------
*/

const pendingFieldIndicator = {
  ...validFieldIndicator,

  background:
    "rgba(245, 158, 11, .14)",

  color: "#fde68a"
};

/*
|--------------------------------------------------------------------------
| Botón pequeño
|--------------------------------------------------------------------------
*/

const smallActionButton = (
  isLight
) => ({
  minHeight: "34px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "7px 10px",

  borderRadius: "10px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .10)"
      : "1px solid rgba(148, 163, 184, .14)",

  background:
    isLight
      ? "rgba(248, 250, 252, .85)"
      : "rgba(15, 23, 42, .62)",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "8px",
  fontWeight: "900",

  cursor: "pointer"
});

/*
|--------------------------------------------------------------------------
| Botón pequeño peligroso
|--------------------------------------------------------------------------
*/

const smallDangerButton = {
  minHeight: "34px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "7px 10px",

  borderRadius: "10px",

  border:
    "1px solid rgba(239, 68, 68, .25)",

  background:
    "rgba(127, 29, 29, .15)",

  color: "#fca5a5",

  fontSize: "8px",
  fontWeight: "900",

  cursor: "pointer"
};

/*
|--------------------------------------------------------------------------
| Acciones de imágenes
|--------------------------------------------------------------------------
*/

const imageActionsRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",

  marginTop: "10px"
};

/*
|--------------------------------------------------------------------------
| Vista previa de archivo
|--------------------------------------------------------------------------
*/

const filePreviewInformation = (
  isLight
) => ({
  display: "grid",
  gap: "3px",

  marginTop: "8px",

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "8px",
  lineHeight: "14px"
});

/*
|--------------------------------------------------------------------------
| Texto del círculo de progreso
|--------------------------------------------------------------------------
*/

const completionValue = {
  display: "block",

  color: "#35d0c3",

  fontSize: "27px",
  lineHeight: "29px",
  fontWeight: "950"
};

const completionLabel = {
  display: "block",

  marginTop: "3px",

  color: "#94a3b8",

  fontSize: "8px",
  fontWeight: "800"
};

/*
|--------------------------------------------------------------------------
| Cabecera de tarjeta secundaria
|--------------------------------------------------------------------------
*/

const sideCardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",

  marginBottom: "10px"
};

/*
|--------------------------------------------------------------------------
| Información del estado de seguridad
|--------------------------------------------------------------------------
*/

const securityLevelDescription = (
  isLight
) => ({
  margin: "7px 0 0",

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "9px",
  lineHeight: "16px"
});

/*
|--------------------------------------------------------------------------
| Lista de seguridad
|--------------------------------------------------------------------------
*/

const securityList = {
  display: "grid",
  gap: "7px",

  margin: "12px 0 0",
  padding: 0,

  listStyle: "none"
};

const securityListItem = (
  isLight
) => ({
  display: "grid",

  gridTemplateColumns:
    "22px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "8px",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "9px",
  lineHeight: "15px"
});

/*
|--------------------------------------------------------------------------
| Icono pequeño de seguridad
|--------------------------------------------------------------------------
*/

const securityListIcon = {
  width: "22px",
  height: "22px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "7px",

  background:
    "rgba(53, 208, 195, .10)",

  color: "#5eead4",

  fontSize: "9px"
};

/*
|--------------------------------------------------------------------------
| Mensaje informativo
|--------------------------------------------------------------------------
*/

const informationMessage = (
  isLight
) => ({
  display: "grid",

  gridTemplateColumns:
    "34px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "10px",

  marginTop: "13px",
  padding: "11px",

  borderRadius: "13px",

  border:
    isLight
      ? "1px solid rgba(56, 189, 248, .16)"
      : "1px solid rgba(56, 189, 248, .18)",

  background:
    isLight
      ? "rgba(224, 242, 254, .52)"
      : "rgba(14, 116, 144, .08)",

  color:
    isLight
      ? "#0c4a6e"
      : "#bae6fd",

  fontSize: "9px",
  lineHeight: "15px"
});

/*
|--------------------------------------------------------------------------
| Botón de WhatsApp
|--------------------------------------------------------------------------
*/

const whatsappButton = {
  minHeight: "42px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    "1px solid rgba(34, 197, 94, .28)",

  background:
    "rgba(34, 197, 94, .12)",

  color: "#86efac",

  textDecoration: "none",

  fontSize: "9px",
  fontWeight: "900"
};

/*
|--------------------------------------------------------------------------
| Estado visual de conexión
|--------------------------------------------------------------------------
*/

const connectedStatus = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",

  color: "#86efac",

  fontSize: "8px",
  fontWeight: "900"
};

const connectedDot = {
  width: "7px",
  height: "7px",

  borderRadius: "50%",

  background: "#22c55e",

  boxShadow:
    "0 0 10px rgba(34, 197, 94, .65)"
};

/*
|--------------------------------------------------------------------------
| Ajustes de selección y foco
|--------------------------------------------------------------------------
*/

const focusRing = (
  accent
) => ({
  borderColor: accent,

  boxShadow:
    `0 0 0 3px ${accent}18`
});

/*
|--------------------------------------------------------------------------
| Compatibilidad de tarjetas vacías
|--------------------------------------------------------------------------
*/

const emptyProfileState = (
  isLight
) => ({
  minHeight: "130px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  gap: "8px",

  padding: "18px",

  borderRadius: "16px",

  border:
    isLight
      ? "1px dashed rgba(15, 23, 42, .13)"
      : "1px dashed rgba(148, 163, 184, .16)",

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  textAlign: "center",

  fontSize: "9px",
  lineHeight: "15px"
});

/*
|--------------------------------------------------------------------------
| Ajustes para impresión
|--------------------------------------------------------------------------
*/

const printOnlyInformation = {
  display: "none"
};

/*
|--------------------------------------------------------------------------
| Exportación
|--------------------------------------------------------------------------
*/

export default Profile;