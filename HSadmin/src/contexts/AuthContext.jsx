/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getMe, login as loginRequest } from "../api/auth";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(window.localStorage.getItem("himsetu-admin-user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => window.localStorage.getItem("himsetu-admin-token"));

  const login = useCallback(async (credentials) => {
    const payload = await loginRequest(credentials);
    const nextToken = payload?.access_token || payload?.token;
    if (!nextToken) throw new Error("The shared backend did not return an access token.");

    window.localStorage.setItem("himsetu-admin-token", nextToken);
    setToken(nextToken);
    try {
      const nextUser = await getMe();
      if (nextUser?.role !== "admin" && !nextUser?.is_admin) {
        throw new Error("This account does not have admin access.");
      }
      window.localStorage.setItem("himsetu-admin-user", JSON.stringify(nextUser));
      setUser(nextUser);
      return { ...payload, user: nextUser };
    } catch (error) {
      window.localStorage.removeItem("himsetu-admin-token");
      window.localStorage.removeItem("himsetu-admin-user");
      setToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem("himsetu-admin-token");
    window.localStorage.removeItem("himsetu-admin-user");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => logout();
    window.addEventListener("himsetu-auth-expired", handleExpiredSession);
    return () => window.removeEventListener("himsetu-auth-expired", handleExpiredSession);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return context;
}
