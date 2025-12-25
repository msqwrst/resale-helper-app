// src/App.jsx (PATCHED: start on /login if no token)
import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import UpdateOverlay from "./components/UpdateOverlay";
import AdminUsers from "@/pages/AdminUsers";

import Layout from "@/components/Layout";
import AppBackground from "@/components/AppBackground";

import AdminKeys from "@/pages/AdminKeys";
import Splash from "@/pages/Splash";
import Home from "@/pages/Home";
import Timer from "@/pages/Timer";
import BP from "@/pages/BP";
import Calculator from "@/pages/Calculator";
import About from "@/pages/About";
import UserNotRegisteredError from "@/pages/UserNotRegisteredError";
import Login from "@/pages/Login";

import VIP from "@/pages/VIP";
import Admin from "@/pages/Admin";

import { getToken, fetchMe } from "@/lib/auth";

// 🔐 без токена только /login
function Protected({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// 👑 VIP или ADMIN
function RequireVip({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await fetchMe();
        const allowed = me?.role === "admin" || !!me?.vip_active;
        if (!alive) return;
        setOk(allowed);
      } catch {
        if (!alive) return;
        setOk(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (ok === null) return null;
  if (!ok) return <Navigate to="/home" replace />;
  return children;
}

// 🛡️ только ADMIN
function RequireAdmin({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await fetchMe();
        const role = String(me?.role || "").toLowerCase();
        const allowed = role === "admin" || role === "staff";
        if (!alive) return;
        setOk(allowed);
      } catch {
        if (!alive) return;
        setOk(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (ok === null) return null;
  if (!ok) return <Navigate to="/home" replace />;
  return children;
}

function AppInner() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    try {
      const key = "splash_seen_session";
      const seen = sessionStorage.getItem(key);
      if (seen === "1") setShowSplash(false);
    } catch { }
  }, []);

  function onSplashDone() {
    try { sessionStorage.setItem("splash_seen_session", "1"); } catch { }
    setShowSplash(false);

    // ✅ IMPORTANT: if no token -> go to /login, else /home
    const token = getToken();
    navigate(token ? "/home" : "/login", { replace: true });
  }

  const p = pathname.toLowerCase();

  // ✅ if app opens at "/" or "/home" without token, Protected will redirect,
  // but we also ensure after splash it goes to /login.
  return (
    <>
      <UpdateOverlay />

      {showSplash ? (
        <Splash onDone={onSplashDone} />
      ) : (
        <AppBackground>
          {/* Layout should NOT wrap /login */}
          {p === "/login" ? (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : (
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />

                <Route path="/login" element={<Login />} />

                <Route
                  path="/home"
                  element={
                    <Protected>
                      <Home />
                    </Protected>
                  }
                />

                <Route
                  path="/timer"
                  element={
                    <Protected>
                      <Timer />
                    </Protected>
                  }
                />

                <Route
                  path="/bp"
                  element={
                    <Protected>
                      <BP />
                    </Protected>
                  }
                />

                <Route
                  path="/calculator"
                  element={
                    <Protected>
                      <Calculator />
                    </Protected>
                  }
                />

                <Route
                  path="/about"
                  element={
                    <Protected>
                      <About />
                    </Protected>
                  }
                />

                <Route
                  path="/vip"
                  element={
                    <Protected>
                      <VIP />
                    </Protected>
                  }
                />


                <Route
                  path="/admin"
                  element={
                    <Protected>
                      <RequireAdmin>
                        <Admin />
                      </RequireAdmin>
                    </Protected>
                  }
                />

                <Route
                  path="/admin/keys"
                  element={
                    <Protected>
                      <RequireAdmin>
                        <AdminKeys />
                      </RequireAdmin>
                    </Protected>
                  }
                />

                <Route
                  path="/admin/users"
                  element={
                    <Protected>
                      <RequireAdmin>
                        <AdminUsers />
                      </RequireAdmin>
                    </Protected>
                  }
                />

                <Route path="/not-registered" element={<UserNotRegisteredError />} />

                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Layout>
          )}
        </AppBackground>
      )}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  );
}