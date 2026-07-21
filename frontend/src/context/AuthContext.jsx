import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  login as loginRequest,
  register as registerRequest,
  getCurrentUser
} from "../api/auth";

const AuthContext =
  createContext(null);

function safeJson(value) {
  try {
    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  return (
    localStorage.getItem(
      "token"
    ) ||
    localStorage.getItem(
      "qsm_token"
    ) ||
    sessionStorage.getItem(
      "token"
    ) ||
    sessionStorage.getItem(
      "qsm_token"
    ) ||
    null
  );
}

function getStoredUser() {
  return (
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
    safeJson(
      sessionStorage.getItem(
        "qsm_user"
      )
    ) ||
    safeJson(
      sessionStorage.getItem(
        "user"
      )
    ) ||
    null
  );
}

function persistUserSession(
  data
) {
  if (!data?.token) {
    return;
  }

  localStorage.setItem(
    "token",
    data.token
  );

  localStorage.setItem(
    "qsm_token",
    data.token
  );

  if (data.user) {
    const serializedUser =
      JSON.stringify(
        data.user
      );

    localStorage.setItem(
      "user",
      serializedUser
    );

    localStorage.setItem(
      "qsm_user",
      serializedUser
    );
  }
}

function persistCurrentUser(
  user
) {
  if (!user) {
    return;
  }

  const serializedUser =
    JSON.stringify(user);

  localStorage.setItem(
    "user",
    serializedUser
  );

  localStorage.setItem(
    "qsm_user",
    serializedUser
  );
}

function clearNormalSession() {
  const keys = [
    "token",
    "qsm_token",
    "user",
    "qsm_user"
  ];

  keys.forEach(
    (key) => {
      localStorage.removeItem(
        key
      );

      sessionStorage.removeItem(
        key
      );
    }
  );

  localStorage.removeItem(
    "qsm_settings"
  );
}

export const AuthProvider = ({
  children
}) => {
  const [
    user,
    setUser
  ] = useState(
    () =>
      getStoredUser()
  );

  const [
    token,
    setToken
  ] = useState(
    () =>
      getStoredToken()
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const login =
    useCallback(
      async (
        email,
        password
      ) => {
        const data =
          await loginRequest(
            email,
            password
          );

        persistUserSession(
          data
        );

        setToken(
          data.token
        );

        setUser(
          data.user
        );

        window.dispatchEvent(
          new CustomEvent(
            "qsm-auth-changed",
            {
              detail: {
                authenticated:
                  true,

                user:
                  data.user
              }
            }
          )
        );

        return data;
      },
      []
    );

  const register =
    useCallback(
      async (
        formData
      ) => {
        const data =
          await registerRequest(
            formData
          );

        persistUserSession(
          data
        );

        setToken(
          data.token
        );

        setUser(
          data.user
        );

        window.dispatchEvent(
          new CustomEvent(
            "qsm-auth-changed",
            {
              detail: {
                authenticated:
                  true,

                user:
                  data.user
              }
            }
          )
        );

        return data;
      },
      []
    );

  const logout =
    useCallback(() => {
      const userId =
        user?.id ||
        user?._id;

      if (userId) {
        localStorage.removeItem(
          `qsm_settings_${userId}`
        );
      }

      clearNormalSession();

      setToken(null);
      setUser(null);

      window.dispatchEvent(
        new CustomEvent(
          "qsm-auth-changed",
          {
            detail: {
              authenticated:
                false,

              user: null
            }
          }
        )
      );
    }, [
      user
    ]);

  const loadUser =
    useCallback(
      async () => {
        setLoading(true);

        const savedToken =
          getStoredToken();

        if (!savedToken) {
          clearNormalSession();

          setToken(null);
          setUser(null);
          setLoading(false);

          return null;
        }

        try {
          const data =
            await getCurrentUser();

          const currentUser =
            data?.user ||
            data?.data?.user ||
            null;

          if (!currentUser) {
            throw new Error(
              "El servidor no devolvió el usuario."
            );
          }

          setToken(
            savedToken
          );

          setUser(
            currentUser
          );

          persistCurrentUser(
            currentUser
          );

          return currentUser;
        } catch (
          error
        ) {
          clearNormalSession();

          setToken(null);
          setUser(null);

          return null;
        } finally {
          setLoading(false);
        }
      },
      []
    );

  const updateCurrentUser =
    useCallback(
      (
        updatedUser
      ) => {
        if (!updatedUser) {
          return;
        }

        setUser(
          (
            currentUser
          ) => ({
            ...(currentUser || {}),
            ...updatedUser
          })
        );

        const mergedUser = {
          ...(user || {}),
          ...updatedUser
        };

        persistCurrentUser(
          mergedUser
        );
      },
      [
        user
      ]
    );

  useEffect(() => {
    loadUser();
  }, [
    loadUser
  ]);

  const contextValue =
    useMemo(
      () => ({
        user,
        token,
        loading,

        isAuthenticated:
          Boolean(
            user &&
            token
          ),

        login,
        register,
        logout,

        loadUser,
        refreshUser:
          loadUser,

        setUser:
          updateCurrentUser
      }),
      [
        user,
        token,
        loading,
        login,
        register,
        logout,
        loadUser,
        updateCurrentUser
      ]
    );

  return (
    <AuthContext.Provider
      value={
        contextValue
      }
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider."
    );
  }

  return context;
};