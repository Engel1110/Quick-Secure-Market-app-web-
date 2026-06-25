import { createContext, useContext, useEffect, useState } from "react";
import { login as loginRequest, register as registerRequest, getCurrentUser } from "../api/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    const data = await loginRequest(email, password);

    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);

    return data;
  };

  const register = async (formData) => {
    const data = await registerRequest(formData);

    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);

    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const loadUser = async () => {
    try {
      const savedToken = localStorage.getItem("token");

      if (!savedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await getCurrentUser();
      setUser(data.user);
      setToken(savedToken);
    } catch {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};