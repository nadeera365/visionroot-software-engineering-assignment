import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentAccount();
  }, []);

  async function loadCurrentAccount() {
    try {
      const result = await apiRequest("/auth/me");
      setAccount(result.data.account);
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(formData) {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    setAccount(result.data.account);
    return result.data.account;
  }

  async function register(formData) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });
  }

  async function logout() {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } finally {
      setAccount(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ account, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}