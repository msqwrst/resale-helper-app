// src/pages/AdminUsers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  ChevronDown,
  Check,
  Shield,
  Crown,
  Star,
  User as UserIcon,
  RefreshCw,
  Pencil,
  X,
  CalendarDays
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

/* ================== LOCAL API (FIX JSON BODY) ================== */
const RAW_API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

function normalizeBaseUrl(raw) {
  if (!raw) return "";
  let s = String(raw).trim().replace(/^["']|["']$/g, "");
  if (/^VITE_API_URL\s*=/i.test(s)) s = s.replace(/^VITE_API_URL\s*=/i, "").trim();
  if (/^[A-Z0-9_]+\s*=\s*https?:\/\//i.test(s)) s = s.replace(/^[A-Z0-9_]+\s*=\s*/i, "").trim();
  s = s.replace(/\/+$/, "");
  return s;
}
const API_URL = normalizeBaseUrl(RAW_API_URL) || "http://127.0.0.1:3001";

function getTokenSafe() {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}
async function apiJson(path, { method = "GET", body } = {}) {
  const token = getTokenSafe();
  const res = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* ================== ROLE META ================== */
const ROLE_META = {
  free:  { label: "FREE",  icon: UserIcon, color: "text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-white/5 dark:border-white/10" },
  vip:   { label: "VIP",   icon: Star,     color: "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" },
  gold:  { label: "Gold",  icon: Crown,    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20 dark:text-yellow-300 dark:bg-yellow-500/10 dark:border-yellow-500/20" },
  admin: { label: "ADMIN", icon: Crown,    color: "text-rose-600 bg-rose-100 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20" }
};

/* ================== HELPERS ================== */
function useOnClickOutsideMulti(refs, handler, when = true) {
  useEffect(() => {
    if (!when) return;

    const listener = (e) => {
      const inside = refs.some((r) => r?.current && r.current.contains(e.target));
      if (!inside) handler();
    };

    document.addEventListener("pointerdown", listener);
    return () => document.removeEventListener("pointerdown", listener);
  }, [refs, handler, when]);
}

function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yy = x.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

function toISODateOrNull(ddmmyyyy) {
  const s = (ddmmyyyy || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yy = Number(m[3]);
  const dt = new Date(yy, mm - 1, dd, 23, 59, 59);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function calcMenuPos(btnEl, itemsLen, maxH = 320) {
  const r = btnEl.getBoundingClientRect();
  const rowH = 42;
  const menuH = Math.min(itemsLen * rowH, maxH);
  const spaceBelow = window.innerHeight - r.bottom;
  const openUp = spaceBelow < menuH + 12;
  const top = openUp ? r.top - (menuH + 8) : r.bottom + 8;
  return { left: Math.round(r.left), top: Math.round(top), width: Math.round(r.width) };
}

/* ================== DROPDOWN ================== */
function Dropdown({ value, items, onChange }) {
  const [open, setOpen] = useState(false);

  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const [pos, setPos] = useState(null);

  const close = () => {
    setOpen(false);
    setPos(null);
  };

  useOnClickOutsideMulti([rootRef, menuRef], close, open);

  const recalc = () => {
    const el = btnRef.current;
    if (!el) return;
    setPos(calcMenuPos(el, items.length, 320));
  };

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    document.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  const openNow = () => {
    recalc();
    setOpen(true);
  };

  const menu =
    open && pos ? (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: pos.width,
          zIndex: 2147483647
        }}
        className="rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {items.map((it) => {
          const active = it === value;
          return (
            <button
              key={it}
              type="button"
              onClick={() => {
                onChange(it);
                close();
              }}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between
              ${
                active
                  ? "bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/5"
              }`}
            >
              <span>{it}</span>
              {active ? (
                <Check className="w-4 h-4 text-slate-700 dark:text-white/70" />
              ) : (
                <span className="w-4 h-4" />
              )}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? close() : openNow())}
        className="h-12 min-w-[150px] px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-between"
      >
        <span className="text-sm">{value}</span>
        <ChevronDown className={`w-4 h-4 transition text-slate-500 dark:text-white/50 ${open ? "rotate-180" : ""}`} />
      </button>

      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

function ModalDropdown({ value, items, onChange }) {
  const [open, setOpen] = useState(false);

  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const [pos, setPos] = useState(null);

  const close = () => {
    setOpen(false);
    setPos(null);
  };

  useOnClickOutsideMulti([rootRef, menuRef], close, open);

  const recalc = () => {
    const el = btnRef.current;
    if (!el) return;
    setPos(calcMenuPos(el, items.length, 240));
  };

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    document.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  const openNow = () => {
    recalc();
    setOpen(true);
  };

  const menu =
    open && pos ? (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: pos.width,
          zIndex: 2147483647
        }}
        className="rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {items.map((it) => {
          const active = it === value;
          return (
            <button
              key={it}
              type="button"
              onClick={() => {
                onChange(it);
                close();
              }}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between
              ${
                active
                  ? "bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/5"
              }`}
            >
              <span>{it}</span>
              {active ? (
                <Check className="w-4 h-4 text-slate-700 dark:text-white/70" />
              ) : (
                <span className="w-4 h-4" />
              )}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? close() : openNow())}
        className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
      >
        <span className="text-sm">{value}</span>
        <ChevronDown className={`w-4 h-4 transition text-slate-500 dark:text-white/50 ${open ? "rotate-180" : ""}`} />
      </button>

      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

/* ================== OPTIONS ================== */
const ROLE_ITEMS = ["All Roles", "Free", "VIP", "Gold", "Admin"];
const VIP_ITEMS = ["All VIP", "Active VIP", "Expired", "No VIP"];
const SORT_ITEMS = ["Newest First", "Oldest First", "Email A-Z", "Name A-Z"];
const EDIT_ROLE_ITEMS = ["Free", "VIP", "Gold", "Admin"];

/* ================== EDIT MODAL ================== */
function EditUserModal({ open, user, onClose, onSaved }) {
  const panelRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Free");
  const [telegramId, setTelegramId] = useState("");
  const [note, setNote] = useState("");

  const [addDays, setAddDays] = useState("0");
  const [vipDate, setVipDate] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.username || user.full_name || "User");
    setRole(String(user.role || "free").toLowerCase().replace(/^./, (c) => c.toUpperCase()));
    setTelegramId(user.telegram_id ? String(user.telegram_id) : "");
    setNote(user.note || user.memo || user.internal_note || "");
    setAddDays("0");
    setVipDate(user.vip_until ? fmtDate(user.vip_until) : "");
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useOnClickOutsideMulti([panelRef], onClose, open);

  if (!open || !user) return null;

  async function saveEdit() {
    setSaving(true);
    try {
      const days = Math.max(0, Number(addDays || 0) || 0);
      const vipUntilIso = toISODateOrNull(vipDate);
      const trimmedNote = (note || "").trim() || null;

      // ✅ СУПЕР-СОВМЕСТИМОСТЬ С РАЗНЫМИ БЕКАМИ:
      // - заметки могут называться note/memo/internal_note
      // - дни могут называться vip_add_days/vip_days/add_days
      // Отправим все варианты — бек возьмёт то, что знает.
      const body = {
        username: fullName,
        role: role.toLowerCase(),
        telegram_id: telegramId ? String(telegramId) : null,

        // VIP days aliases
        vip_add_days: days,
        vip_days: days,
        add_days: days,

        // VIP until aliases
        vip_until: vipUntilIso,
        vipUntil: vipUntilIso,

        // Note aliases
        note: trimmedNote,
        memo: trimmedNote,
        internal_note: trimmedNote
      };

      await apiJson(`/admin/users/${user.id}`, { method: "PATCH", body });

      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      alert(`Save failed: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[2147483647]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className="w-full max-w-[560px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117] shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
            <div className="text-lg font-semibold text-slate-900 dark:text-white">Edit User</div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-white/70 mb-2">User</div>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-white/70 mb-2">Role</div>
              <ModalDropdown value={role} items={EDIT_ROLE_ITEMS} onChange={setRole} />
            </div>

            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-white/70 mb-2">Telegram ID</div>
              <Input
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="Optional"
                className="h-11 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-white/70 mb-2">Note (keywords)</div>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="FamQ / GOLD / что угодно…"
                className="h-11 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10" />

            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white/80">
              <Crown className="w-4 h-4 text-amber-500" />
              VIP Management
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-slate-600 dark:text-white/60 mb-2">Add Days</div>
                <Input
                  value={addDays}
                  onChange={(e) => setAddDays(e.target.value.replace(/[^\d]/g, ""))}
                  className="h-11 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="text-sm text-slate-600 dark:text-white/60 mb-2">Set Date</div>
                <div className="relative">
                  <Input
                    value={vipDate}
                    onChange={(e) => setVipDate(e.target.value)}
                    placeholder="dd.mm.yyyy"
                    className="h-11 pr-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
                  />
                  <CalendarDays className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/50 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-white bg-transparent"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}

/* ================== PAGE ================== */
export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [vipFilter, setVipFilter] = useState("All VIP");
  const [sort, setSort] = useState("Newest First");

  const [editUser, setEditUser] = useState(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api("/admin/users");
      setUsers(Array.isArray(res) ? res : res?.users || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const byRole = { free: 0, vip: 0, gold: 0, admin: 0 };
    for (const u of users) {
      const r = (u.role || "free").toLowerCase();
      if (byRole[r] != null) byRole[r] += 1;
    }
    return { total, ...byRole };
  }, [users]);

  const filtered = useMemo(() => {
    let list = [...users];
    const q = (search || "").toLowerCase();

    if (q) {
      list = list.filter((u) =>
        `${u.username || ""} ${u.email || ""} ${u.telegram_id || ""} ${u.id || ""} ${u.note || u.memo || u.internal_note || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (roleFilter !== "All Roles") {
      list = list.filter((u) => (u.role || "").toLowerCase() === roleFilter.toLowerCase());
    }

    const vipMs = (u) => (u.vip_until ? new Date(u.vip_until).getTime() : 0);
    const now = Date.now();

    if (vipFilter === "Active VIP") list = list.filter((u) => vipMs(u) > now);
    if (vipFilter === "Expired") list = list.filter((u) => vipMs(u) && vipMs(u) <= now);
    if (vipFilter === "No VIP") list = list.filter((u) => !vipMs(u));

    const createdMs = (u) => (u.created_at ? new Date(u.created_at).getTime() : 0);

    if (sort === "Newest First") list.sort((a, b) => createdMs(b) - createdMs(a));
    if (sort === "Oldest First") list.sort((a, b) => createdMs(a) - createdMs(b));
    if (sort === "Email A-Z") list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    if (sort === "Name A-Z") list.sort((a, b) => (a.username || "").localeCompare(b.username || ""));

    return list;
  }, [users, search, roleFilter, vipFilter, sort]);

  return (
    <div className="min-h-screen p-6 bg-slate-50 dark:bg-transparent text-slate-900 dark:text-white">
      <div className="w-full max-w-6xl mx-auto">

        {/* STATS */}
        <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl shadow-black/10 dark:shadow-black/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-white/45">Total Users</div>
                <div className="mt-1 text-2xl font-extrabold">{stats.total}</div>
              </div>
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                <Users className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl shadow-black/10 dark:shadow-black/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-white/45">Free</div>
                <div className="mt-1 text-2xl font-extrabold">{stats.free}</div>
              </div>
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-slate-500 dark:text-white/45" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl shadow-black/10 dark:shadow-black/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-white/45">VIP</div>
                <div className="mt-1 text-2xl font-extrabold text-fuchsia-600 dark:text-fuchsia-300">{stats.vip}</div>
              </div>
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                <Star className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl shadow-black/10 dark:shadow-black/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-white/45">Admins</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">{stats.admin}</div>
              </div>
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                <Crown className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH + FILTERS */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/30" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, name, or Telegram ID..."
                className="h-12 pl-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
              />
              <div className="mt-2 text-xs text-slate-500 dark:text-white/40">
                Showing {filtered.length} of {users.length} users
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Dropdown value={roleFilter} items={ROLE_ITEMS} onChange={setRoleFilter} />
              <Dropdown value={vipFilter} items={VIP_ITEMS} onChange={setVipFilter} />
              <Dropdown value={sort} items={SORT_ITEMS} onChange={setSort} />

              <Button
                type="button"
                onClick={loadUsers}
                disabled={loading}
                className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* USERS */}
        <div className="mt-6 relative z-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 justify-items-start">
          {filtered.map((u) => {
            const role = (u.role || "free").toLowerCase();
            const Meta = ROLE_META[role] || ROLE_META.free;

            return (
              <motion.div
                key={u.id}
                layout
                className="relative w-full max-w-[520px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl shadow-black/10 dark:shadow-black/20"
              >
                <button
                  type="button"
                  title="Edit user"
                  onClick={() => setEditUser(u)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <div className="flex items-start justify-between gap-4 pr-12">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${Meta.color}`}>
                      <Meta.icon className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      {(u.note || u.memo || u.internal_note) ? (
                        <div className="text-[11px] leading-snug text-slate-500 dark:text-white/45 truncate mb-0.5">
                          {String(u.note || u.memo || u.internal_note)}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{u.username || "User"}</span>
                        <Badge className={`text-[10px] ${Meta.color}`}>{Meta.label}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 dark:text-white/40">TG: {u.telegram_id || "—"}</div>

                <div className="absolute bottom-3 right-3 text-[11px] text-slate-400 dark:text-white/35 whitespace-nowrap">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <EditUserModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={loadUsers}
      />
    </div>
  );
}
