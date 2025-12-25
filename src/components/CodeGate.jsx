import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function CodeGate({ children }) {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState(null);
  const location = useLocation();

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const me = await base44.auth.me();
        if (!alive) return;
        setUser(me);
      } catch (e) {
        if (!alive) return;
        // если у тебя есть отдельная страница "not registered"
        // можешь тут редиректить или просто оставить null
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  if (loading) return null; // или твой Loader

  // ✅ Правило: если мы НЕ на /redeem — то отправляем туда ВСЕХ при входе,
  // пока не выполнено условие "доступ разрешён".
  //
  // Вариант 1: разрешать Home только если роль не free
  const hasAccess = !!user && user.role && user.role !== "free";

  // Вариант 2 (строже): разрешать только если есть vip_until (или staff/admin)
  // const hasAccess = !!user && (
  //   user.role === "staff" || user.role === "admin" || (user.vip_until && new Date(user.vip_until) > new Date())
  // );

  const redeemPath = createPageUrl("RedeemCode");
  const isOnRedeem = location.pathname === redeemPath;

  if (!hasAccess && !isOnRedeem) {
    return <Navigate to={redeemPath} replace />;
  }

  return children;
}
