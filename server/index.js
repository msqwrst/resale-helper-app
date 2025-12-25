import express from "express";
import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// ===== Supabase client (SERVICE ROLE) =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== Auth: verify token + check admin role =====
async function authAdmin(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";

  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: "BAD_TOKEN" });

  const userId = userData.user.id;

  // users table: id(uuid)=auth.users.id, role text
  const { data: profile, error: profErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (profErr) return res.status(500).json({ error: profErr.message });
  if ((profile?.role || "free") !== "admin") return res.status(403).json({ error: "NOT_ADMIN" });

  req.user = userData.user;
  next();
}

// ===== Health check =====
app.get("/health", (_req, res) => res.json({ ok: true }));

// ===== List keys =====
app.get("/admin/keys", authAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("vip_keys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Приведём к формату, который ждёт UI: id, key, duration, used
  const mapped = (data || []).map((k) => ({
    id: k.id,
    key: k.key,
    duration: k.is_lifetime ? "lifetime" : k.duration_days,
    used: !!k.used,
    created_at: k.created_at
  }));

  res.json(mapped);
});

// ===== Create key =====
app.post("/admin/keys/create", authAdmin, async (req, res) => {
  const duration = req.body?.duration;

  const vipKey = crypto.randomBytes(16).toString("hex").toUpperCase();

  const payload = {
    key: vipKey,
    duration_days: duration === "lifetime" ? null : Number(duration),
    is_lifetime: duration === "lifetime",
    used: false
  };

  const { error } = await supabase.from("vip_keys").insert(payload);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, key: vipKey });
});

// ===== Delete key =====
app.delete("/admin/keys/:id", authAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("vip_keys").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
