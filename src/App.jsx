import React from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import UpdateOverlay from "./components/UpdateOverlay";

import Layout from "@/components/Layout";
import Splash from "@/pages/Splash";
import Home from "@/pages/Home";
import Timer from "@/pages/Timer";
import BP from "@/pages/BP";
import Calculator from "@/pages/Calculator";
import About from "@/pages/About";
import UserNotRegisteredError from "@/pages/UserNotRegisteredError";

function AppInner() {
  const { pathname } = useLocation();
  const p = pathname.toLowerCase();

  const currentPageName =
    p === "/" ? "Splash" :
    p.startsWith("/home") ? "Home" :
    p.startsWith("/timer") ? "Timer" :
    p.startsWith("/bp") ? "BP" :
    p.startsWith("/calculator") ? "Calculator" :
    p.startsWith("/about") ? "About" :
    p.startsWith("/usernotregisterederror") ? "UserNotRegisteredError" :
    "Home";

  return (
    <>
      {/* Основное приложение */}
      <Layout currentPageName={currentPageName}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/home" element={<Home />} />
          <Route path="/bp" element={<BP />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/about" element={<About />} />
          <Route path="/usernotregisterederror" element={<UserNotRegisteredError />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Layout>

      {/* 🔒 Update Overlay — ВСЕГДА поверх всего */}
      <UpdateOverlay />
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
