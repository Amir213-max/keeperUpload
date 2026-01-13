"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { setAuthToken } from "../lib/graphqlClient";
import { getDynamicUserId } from "../lib/mutations";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // 🟢 تحميل البيانات من localStorage لو فيه تسجيل قديم
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    console.log(savedToken)
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

const login = (userData, token) => {
  setUser(userData);
  setToken(token);
  localStorage.setItem("user", JSON.stringify(userData));
  localStorage.setItem("token", token);

  // إزالة guest_id لأنه خلاص بقى عنده كارت باسم حسابه
  localStorage.removeItem("guest_id");
};




const logout = () => {
  // مسح بيانات المستخدم
  setUser(null);
  setToken(null);
  localStorage.removeItem("user");
  localStorage.removeItem("token");

  // إزالة التوكن من GraphQLClient
  setAuthToken(null);

  // توليد guest_id جديد للكارت
  getDynamicUserId();

  // optional: redirect للهوم
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};


  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
