import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME";
const BOT_API_KEY = process.env.BOT_API_KEY || "";
const TG_CODE_TTL_MIN = Number(process.env.TG_CODE_TTL_MIN || 5);


const corsOptions = {
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Bot-Key", "X-Session-Id"],
};
app.use(cors(corsOptions));

// Express 5: "*" ломается
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "8mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function genCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O/1/I
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// =====================================================
// 💬 SMALLTALK / GREETINGS (ChatGPT-like, no RAG)
// Purpose: user can chat naturally ("привет", "как дела", "спасибо", "ты кто", etc.)
// and we should not answer "в памятке этого нет".
// This block uses robust RU/EN patterns + light heuristics.
// =====================================================

function normalizeChatText(s = "") {
  return String(s || "")
    .trim()
    .replace(/\u00A0/g, " ")
    .replace(/[“”„«»]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripEdgePunct(s = "") {
  return String(s || "")
    .trim()
    .replace(/^[\s"'.!?,:;()\[\]{}<>]+/g, "")
    .replace(/[\s"'.!?,:;()\[\]{}<>]+$/g, "")
    .trim();
}

function lc(s = "") { return String(s || "").toLowerCase(); }

function isVeryShort(s = "") {
  const t = stripEdgePunct(normalizeChatText(s));
  // emojis-only or 1-2 chars -> short
  if (!t) return true;
  if (t.length <= 2) return true;
  if (/^[\p{Extended_Pictographic}\s]+$/u.test(t)) return true;
  return false;
}

// A very large set of smalltalk triggers (RU/EN + slang). Not exhaustive, but broad.
const ST = {
  greeting: [
    /^(привет|прив|приветик|приветики|приветствую|хай|хэй|хей|йо|yo|yo+|ку|кУ|куку|qq|q+|зд(р|а)ав(о|а)в?а?|здаров(а|)|здраст(е|)|здравствуйте|добр(ое|ый)\s+(утро|день|вечер)|доброй\s+ночи|салют|алло|але|эй|ау|дратути)$/iu,
    /^(hi|hello|hey|hiya|howdy|sup|wassup|good\s+(morning|afternoon|evening))$/iu
  ],
  wellbeing: [
    /(как\s+дела|как\s+ты|как\s+жизнь|как\s+оно|как\s+вообще|как\s+сам|как\s+сама|как\s+поживаешь|что\s+как|чо\s+как|ну\s+как\s+ты|ты\s+как|как\s+настроение|как\s+денек|как\s+день|как\s+вечер|как\s+утро)/iu,
    /(how\s+are\s+you|how's\s+it\s+going|how\s+you\s+doing|what's\s+up|how\s+is\s+life)/iu
  ],
  thanks: [
    /^(спс|спасибо|спасиб|благодарю|сенкс|thx|thanks|thank\s+you|мерси|пасиба)(\s+тебе|\s+бро|\s+брат|\s+дружище)?[!.]*$/iu,
    /(очень\s+спасибо|огромное\s+спасибо|спасибо\s+большое|спасибо\s+огромное)/iu
  ],
  apology: [
    /(извини|сорри|пардон|my\s+bad|sorry)(\s+бро|\s+брат)?/iu
  ],
  farewell: [
    /^(пока|всё|увидимся|до\s+встречи|до\s+связи|спокойной\s+ночи|добр(ой|ой)\s+ночи|бай|бай-бай|чао|адьос|покедова|bye|goodbye|see\s+ya|see\s+you|later|cya)([!.]*)$/iu
  ],
  who: [
    /(кто\s+ты|ты\s+кто|что\s+ты\s+такое|ты\s+чё\s+такое|ты\s+бот|ты\s+ии|ты\s+искусственный\s+интеллект|ты\s+реальный|ты\s+живой|ты\s+настоящий|ты\s+человек)/iu,
    /(what\s+are\s+you|who\s+are\s+you|are\s+you\s+a\s+bot|are\s+you\s+real)/iu
  ],
  capability: [
    /(что\s+ты\s+умеешь|что\s+можешь|как\s+работаешь|как\s+пользоваться|как\s+тобой\s+пользоваться|помоги\s+разобраться|как\s+спросить|что\s+спросить)/iu,
    /(what\s+can\s+you\s+do|how\s+do\s+you\s+work|how\s+to\s+use)/iu
  ],
  profanity_vent: [
    /(заебал|сука|блять|пиздец|нахуй|ебан|хуйн|долбоеб|идиот|туп(ой|ишь)|ненавижу|бесит|горит|жопа|пизда)/iu
  ],
  small_lol: [
    /^(аха+|ахах+|лол+|кек+|ржу|ору|haha+|lol+|lmao+|rofl+)([!.]*)$/iu
  ],
  confirm: [
    /^(ок|окей|ладно|понял|поняла|ясно|ага|да|неа|нет|хорошо|го|погнали|окей\s+бро|пон)/iu
  ]
};

function detectSmallTalkIntent(text) {
  const raw = normalizeChatText(text);
  const t = lc(stripEdgePunct(raw));

  // Very short and non-informational -> treat as smalltalk
  if (isVeryShort(raw)) return { intent: "greeting", score: 0.7 };

  const checks = [
    ["greeting", ST.greeting],
    ["wellbeing", ST.wellbeing],
    ["thanks", ST.thanks],
    ["apology", ST.apology],
    ["farewell", ST.farewell],
    ["who", ST.who],
    ["capability", ST.capability],
    ["small_lol", ST.small_lol],
    ["confirm", ST.confirm],
    ["profanity_vent", ST.profanity_vent],
  ];

  for (const [intent, arr] of checks) {
    for (const re of arr) {
      if (re.test(t) || re.test(raw)) return { intent, score: 0.9 };
    }
  }

  // If user message looks like pure social chatter (no question marks about rules)
  // and is short-ish, treat as smalltalk.
  const len = t.length;
  const looksSocial =
    len <= 60 &&
    !/\b(стать(я|и)|пункт|ук\b|ак\b|коап|закон|правил|памятк|ref|штраф|тюрьм|срок|наказан)\b/iu.test(t) &&
    /[?!]/.test(raw) === false;

  if (looksSocial) return { intent: "smalltalk", score: 0.55 };

  return { intent: null, score: 0 };
}

function smallTalkReply(intent, userText) {
  // Slightly varied, friendly but not childish.
  const t = lc(stripEdgePunct(normalizeChatText(userText)));

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (intent === "greeting") {
    return pick([
      "Привет 🙂 Чем помочь? Можешь написать номер статьи (например: 12.8 УК / 6.8 АК) или задать вопрос словами — отвечу со ссылкой на пункт.",
      "Йо! Пиши, что нужно 🙂 Если это про статьи/пункты — кидай номер (12.8 УК / 6.8 АК) или ситуацию словами.",
      "Привет! Я тут. Что ищем — пункт/статья или разбор ситуации?"
    ]);
  }

  if (intent === "wellbeing") {
    return pick([
      "Нормально 🙂 Я на месте и готов помочь. Что именно нужно по правилам/статьям?",
      "Всё ок! Давай разберёмся. Напиши вопрос (или статью типа 12.8 УК / 6.8 АК).",
      "Отлично. Ты как? Что надо найти в памятке/правилах?"
    ]);
  }

  if (intent === "thanks") {
    return pick([
      "Пожалуйста 🙂 Если ещё что-то нужно по статьям/правилам — пиши.",
      "Всегда пожалуйста. Кидай следующий вопрос 🙂",
      "Рад помочь. Что дальше проверяем?"
    ]);
  }

  if (intent === "apology") {
    return pick([
      "Всё норм 🙂 Давай продолжим. Что нужно найти?",
      "Ок, без проблем. Пиши вопрос/статью — разберём.",
      "Забей 🙂 Говори, что дальше."
    ]);
  }

  if (intent === "farewell") {
    return pick([
      "Окей, на связи 🙂 Если что — пиши.",
      "Пока! Возвращайся, если нужно будет найти статью или пункт.",
      "До связи 🙂"
    ]);
  }

  if (intent === "who") {
    return "Я VIP AI‑помощник по твоей базе правил/памятки. Могу искать пункты по номеру (12.8 УК / 6.8 АК и т.д.) и отвечать по тексту из файлов со ссылкой на источник.";
  }

  if (intent === "capability") {
    return "Я умею: (1) искать пункты по номеру (12.8 / 12-8 / 12 8 / 12.8 УК/АК), (2) отвечать на вопросы словами, подтягивая самые релевантные фрагменты из твоих rules/*.txt, (3) всегда показывать источник. Напиши вопрос или номер статьи 🙂";
  }

  if (intent === "small_lol") {
    return pick([
      "🙂 Ок. Что дальше по делу?",
      "Ахах, понял 🙂 Пиши вопрос по правилам/статьям.",
      "Окей 🙂 Чем помочь?"
    ]);
  }

  if (intent === "confirm") {
    return pick([
      "Ок 🙂 Что именно нужно найти?",
      "Понял. Давай вопрос/статью.",
      "Окей, продолжай."
    ]);
  }

  if (intent === "profanity_vent") {
    return pick([
      "Понял, бесит 😅 Давай спокойно: напиши, что именно не работает или какую статью/пункт надо найти — починим/разберём.",
      "Окей, вижу горит. Скажи конкретно: что спросил, что он ответил, и какой пункт ты ожидал — и я поправлю логику.",
      "Давай по фактам: вопрос → какой ответ → что должно быть. Тогда сделаем нормально."
    ]);
  }

  // fallback
  return "Я тут 🙂 Напиши, что нужно: номер статьи/пункта или вопрос словами.";
}

// =====================================================
// ✅ Health
// =====================================================
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    port: PORT
  })
);

// =====================================================
// ===== Rules base (rules / law memo / project rules) =====
// 1) Prefer ./rules folder (many files)
// 2) Fallback to single file ./game_rules.txt
// =====================================================

// folder: src/electron/backend/rules
const RULES_DIR = process.env.AI_RULES_DIR
  ? path.resolve(process.env.AI_RULES_DIR)
  : path.join(__dirname, "rules");

// single file fallback: src/electron/backend/game_rules.txt (or cwd/game_rules.txt)
const RULES_FILE = process.env.AI_RULES_FILE || path.resolve(process.cwd(), "game_rules.txt");

// RAG embeddings store (saved next to backend by default)
const RAG_STORE_PATH = process.env.RAG_STORE_PATH || path.join(__dirname, "rag_store.json");

// Law priority files (edit if needed)
const LAW_FILES = ["uk.txt", "ak.txt", "road.txt", "police.txt"];

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

let _rulesCache = { mtimeMs: 0, text: "" };
function loadRulesTextFile() {
  try {
    const st = fs.statSync(RULES_FILE);
    if (st.mtimeMs !== _rulesCache.mtimeMs) {
      _rulesCache = { mtimeMs: st.mtimeMs, text: fs.readFileSync(RULES_FILE, "utf-8") };
    }
    return _rulesCache.text || "";
  } catch {
    return "";
  }
}

function rulesDirExists() {
  try {
    return fs.existsSync(RULES_DIR) && fs.statSync(RULES_DIR).isDirectory();
  } catch {
    return false;
  }
}

// ==============================
// УК/АК + ref parsing
// ==============================
function normalizeQuery(raw = "") {
  let q = String(raw).trim().toLowerCase();

  // unify separators
  q = q.replace(/[，,;:]/g, " ");
  q = q.replace(/\s+/g, " ").trim();

  // detect code hint (UK/AK)
  let codeHint = null;

  const ukRe = /\b(ук|угк|уголовн(?:ый|ого|ая|ое)?|уголовка|criminal)\b/u;
  const akRe = /\b(ак|коап|адм(?:ин)?|административн(?:ый|ого|ая|ое)?|administrative)\b/u;

  if (ukRe.test(q)) codeHint = "UK";
  if (akRe.test(q)) codeHint = "AK"; // если оба — пусть АК перебьёт

  // remove code words from query to not pollute search
  q = q.replace(ukRe, " ").replace(akRe, " ").replace(/\s+/g, " ").trim();

  // detect ref (12.8, 12 8, 12-8, 12/8, 2.7, 2/7, 10.1*)
  const refMatch = q.match(/\b(\d{1,3})\s*([.\-\/\s])\s*(\d{1,3})(\*{0,3})\b/u);
  let ref = null;
  if (refMatch) {
    const a = refMatch[1];
    const b = refMatch[3];
    const stars = refMatch[4] || "";
    ref = `${a}.${b}${stars}`; // normalize to dot
    q = q.replace(refMatch[0], " ").replace(/\s+/g, " ").trim();
  }

  // also support single-number refs like "18", "22"
  if (!ref) {
    const m = q.match(/\b(\d{1,3})(\*{0,3})\b/u);
    if (m) {
      ref = `${m[1]}${m[2] || ""}`;
      q = q.replace(m[0], " ").replace(/\s+/g, " ").trim();
    }
  }

  return { raw, cleanText: q, codeHint, ref };
}

// Normalize ref keys for indexing and matching
function normalizeRefKey(raw) {
  if (!raw) return "";
  let s = String(raw).trim();

  // Remove surrounding noise
  s = s.replace(/^[^\d]+/g, "");
  s = s.replace(/[^\d*./\-\s]+$/g, "");

  // unify separators to dot
  s = s.replace(/\s+/g, "");
  s = s.replace(/\//g, ".");
  s = s.replace(/-/g, ".");
  s = s.replace(/,+/g, ".");
  s = s.replace(/\.+/g, ".");
  s = s.replace(/^\./, "").replace(/\.$/, "");

  // normalize keys WITHOUT trailing stars
  s = s.replace(/\*+$/g, "");

  return s.toLowerCase();
}

function extractStars(raw) {
  const m = String(raw || "").trim().match(/(\*+)$/);
  return m ? m[1] : "";
}

function detectCodeFromMeta(title = "", file = "", body = "") {
  const t = `${title}\n${file}\n${body}`.toLowerCase();
  // УК
  if (/(уголовн|ук\b|crime|преступлен)/i.test(t)) return "UK";
  // АК / КоАП
  if (/(административ|коап|\bак\b|адм\b)/i.test(t)) return "AK";
  return null;
}

// =====================================================
// 📚 RULES DIR INDEX (exact refs) + chunks for RAG
// Supports: 12.8, 2.7, 10.1*, 12.7.1*, and also single numbers
// =====================================================
function buildRefIndexAndChunks() {
  const idx = new Map();
  const chunks = [];

  if (!rulesDirExists()) return { idx, chunks };

  const files = fs
    .readdirSync(RULES_DIR)
    .filter((f) => f.endsWith(".txt") || f.endsWith(".md"))
    .sort();

  for (const file of files) {
    const full = path.join(RULES_DIR, file);
    const content = safeRead(full);
    if (!content) continue;

    const firstLine = content.split(/\r?\n/).find((l) => l.trim().length > 0) || file;
    const lines = content.split(/\r?\n/);

    const fileCode = detectCodeFromMeta(firstLine, file, content.slice(0, 2000));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Allow multi-level refs: 12.7.1* etc.
      const m = line.match(/^\s*(\d{1,3}(?:[.\-/]\d{1,3}(?:[.\-/]\d{1,3})?)?(\*{0,3})?)\s*(.+)?$/);
      if (!m) continue;

      const refRaw = m[1];
      const stars = extractStars(refRaw);
      const refKey = normalizeRefKey(refRaw);
      if (!refKey) continue;

      let block = [line];
      let j = i + 1;

      for (; j < lines.length; j++) {
        const next = lines[j];
        if (/^\s*\d{1,3}(?:[.\-/]\d{1,3}(?:[.\-/]\d{1,3})?)?(\*{0,3})?\s+/.test(next)) break;
        block.push(next);
      }
      i = j - 1;

      const entryText = block.join("\n").trim();
      const entryCode = fileCode || detectCodeFromMeta(entryText, file, "");

      const entry = {
        title: firstLine.trim(),
        file,
        code: entryCode, // "UK" | "AK" | null
        ref: refKey,
        stars,
        text: entryText
      };

      if (!idx.has(refKey)) idx.set(refKey, []);
      idx.get(refKey).push(entry);

      // chunk for embeddings
      chunks.push({
        id: `${file}:${refKey}${stars}`,
        title: entry.title,
        file,
        code: entryCode,
        ref: refKey,
        stars,
        text: entryText
      });
    }
  }

  return { idx, chunks };
}

let { idx: REF_INDEX, chunks: RULE_CHUNKS } = buildRefIndexAndChunks();

// ==============================
// 🧠 Lightweight chat memory (for follow-ups)
// ==============================
const CHAT_MEM = new Map();
const CHAT_MEM_TTL_MS = 5 * 60 * 1000;

function memKey(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.uid) return `uid:${payload.uid}`;
    } catch { }
  }
  const sid = String(req.headers["x-session-id"] || "").trim();
  if (sid) return `sid:${sid}`;
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "ip";
  const ua = String(req.headers["user-agent"] || "").slice(0, 80);
  return `ipua:${ip}|${ua}`;
}

function memGet(key) {
  const v = CHAT_MEM.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > CHAT_MEM_TTL_MS) {
    CHAT_MEM.delete(key);
    return null;
  }
  return v;
}

function memSet(key, patch) {
  const cur = memGet(key) || { ts: Date.now(), topic: "", keywords: [] };
  const next = { ...cur, ...patch, ts: Date.now() };
  CHAT_MEM.set(key, next);
  if (CHAT_MEM.size > 800) {
    for (const [k, val] of CHAT_MEM.entries()) {
      if (Date.now() - val.ts > CHAT_MEM_TTL_MS) CHAT_MEM.delete(k);
    }
  }
  return next;
}

function isShortFollowup(text) {
  const t = String(text || "").trim().toLowerCase();
  if (t.length <= 28) return true;
  return /^(а\s+если|а\s+у|а\s+для|а\s+обычн|а\s+просто|а\s+что|ну\s+а|и\s+если)\b/i.test(t);
}

function extractTopicKeywords(text) {
  const t = String(text || "").toLowerCase();
  const keys = [];
  const dict = [
    ["бронежилет", /(броник|бронеж|бронежилет)/i],
    ["оружие", /(оруж|пистолет|винтовк|патрон|ammo|gun|knife|нож)/i],
    ["нелегал", /(нелегал|незаконн(ое|ый)\s+пребыв|миграц)/i],
    ["наркотики", /(нарк|drug|кокс|героин|мет)/i],
    ["задержание", /(задержан|арест|наручник|миранда|ордер|обыск)/i],
    ["парковка", /(парков|остановк|штраф)/i]
  ];
  for (const [k, re] of dict) if (re.test(t)) keys.push(k);
  return keys;
}

function reloadRules() {
  ({ idx: REF_INDEX, chunks: RULE_CHUNKS } = buildRefIndexAndChunks());
  _rulesCache = { mtimeMs: 0, text: "" };
}

// ==============================
// Exact answer helper
// ==============================
function formatEntrySource(e) {
  const codeLabel = e.code === "UK" ? "УК" : e.code === "AK" ? "АК" : "Источник";
  return `${codeLabel}: ${e.title} (файл: ${e.file}, ref: ${e.ref}${e.stars || ""})`;
}

function explainRef(entries, ref, brief = false, codeHint = null) {
  const refKey = normalizeRefKey(ref);
  if (!entries || entries.length === 0) {
    return {
      reply: `В правилах/памятке нет пункта ${refKey} (или он не найден). Проверь файлы в rules/*.txt или game_rules.txt и нажми "Обновить".`
    };
  }

  let filtered = entries;
  if (codeHint) filtered = entries.filter((e) => e.code === codeHint);
  const used = filtered.length ? filtered : entries;

  if (used.length > 1) {
    const options = used
      .map((e, k) => {
        const codeLabel = e.code === "UK" ? "УК" : e.code === "AK" ? "АК" : "—";
        return `${k + 1}) [${codeLabel}] ${e.title} (файл: ${e.file}, ref: ${e.ref}${e.stars || ""})`;
      })
      .join("\n");

    if (codeHint && !filtered.length) {
      return {
        reply: `Пункт ${refKey} найден, но не в указанном разделе (${codeHint === "UK" ? "УК" : "АК"}).\nНашёл варианты:\n${options}\n\nНапиши: "${refKey} 1" чтобы выбрать.`
      };
    }
    return { reply: `Нашёл несколько совпадений для ${refKey}. Выбери номер:\n${options}\n\nНапиши: "${refKey} 1" чтобы выбрать.` };
  }

  const e = used[0];
  const oneLine = e.text.replace(/\r?\n/g, " ").trim();

  if (brief) {
    const s = oneLine.length > 260 ? oneLine.slice(0, 260) + "…" : oneLine;
    return { reply: `${s}\n\nИсточник: ${formatEntrySource(e)}` };
  }

  return { reply: `${e.text.trim()}\n\nИсточник: ${formatEntrySource(e)}` };
}

function isBriefAsked(message) {
  return /кратко|коротко|в\s*1\s*предлож/i.test(String(message || ""));
}

// Allow choosing option: "12.8 1"
function extractChoiceSuffix(message) {
  const m = String(message || "")
    .trim()
    .match(/\b(\d{1,3}(?:[.\-/\s]\d{1,3}(?:[.\-/\s]\d{1,3})?)?\*{0,3})\s+(\d{1,2})\s*$/i);
  if (!m) return null;
  const ref = normalizeRefKey(m[1]);
  const choice = Number(m[2]);
  if (!ref || !choice || choice < 1 || choice > 50) return null;
  return { ref, choice };
}

// =====================================================
// 🔎 Keyword fallback snippets (kept from your logic)
// =====================================================
function scoreTextByWords(text, words) {
  const t = String(text || "").toLowerCase();
  let score = 0;
  for (const w of words) {
    if (w.length < 3) continue;
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = t.match(new RegExp(esc, "g"));
    score += m ? Math.min(m.length, 8) : 0;
  }
  return score;
}

function pickSnippetsFromEntriesFiltered(query, fileAllowList, codeHint = null, maxBlocks = 10) {
  const allow = new Set((fileAllowList || []).map((x) => String(x).toLowerCase()));
  const q = String(query || "").toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const out = [];

  for (const entries of REF_INDEX.values()) {
    for (const e of entries) {
      if (allow.size && !allow.has(String(e.file || "").toLowerCase())) continue;
      if (codeHint && e.code && e.code !== codeHint) continue;

      const s = scoreTextByWords(`${e.text}\n${e.title}\n${e.file}\n${e.ref}`, words);
      if (s <= 0) continue;
      out.push({ score: s, e });
    }
  }

  out.sort((a, b) => b.score - a.score);

  return out
    .slice(0, maxBlocks)
    .map(({ e }) => {
      const codeLabel = e.code === "UK" ? "УК" : e.code === "AK" ? "АК" : "—";
      const head = `REF: ${e.ref}${e.stars || ""} [${codeLabel}] FILE: ${e.file} TITLE: ${e.title}`;
      const body = e.text.length > 1400 ? e.text.slice(0, 1400) + "…" : e.text;
      return `\n\n--- ${head} ---\n${body}`;
    })
    .join("")
    .trim();
}

function pickSnippetsFromEntries(query, codeHint = null, maxBlocks = 10) {
  const q = String(query || "").toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const out = [];

  for (const entries of REF_INDEX.values()) {
    for (const e of entries) {
      if (codeHint && e.code && e.code !== codeHint) continue;
      const s = scoreTextByWords(`${e.text}\n${e.title}\n${e.file}\n${e.ref}`, words);
      if (s <= 0) continue;
      out.push({ score: s, e });
    }
  }

  out.sort((a, b) => b.score - a.score);

  const picked = out.slice(0, maxBlocks).map(({ e }) => {
    const codeLabel = e.code === "UK" ? "УК" : e.code === "AK" ? "АК" : "—";
    const head = `REF: ${e.ref}${e.stars || ""} [${codeLabel}] FILE: ${e.file} TITLE: ${e.title}`;
    const body = e.text.length > 1400 ? e.text.slice(0, 1400) + "…" : e.text;
    return `\n\n--- ${head} ---\n${body}`;
  });

  return picked.join("").trim();
}

function shouldForceLawFiles(query) {
  const t = String(query || "").toLowerCase();
  return /(оруж|броник|бронеж|нелегал|наркот|патрон|взрыв|ордер|обыск|задержан|миранда|парков)/i.test(t);
}

function pickSnippetsForceLawFiles() {
  if (!rulesDirExists()) return "";
  let forced = "";
  for (const f of LAW_FILES) {
    const p = path.join(RULES_DIR, f);
    if (fs.existsSync(p)) {
      forced += `\n\n--- FILE: ${f} ---\n` + safeRead(p).slice(0, 2800);
    }
  }
  return forced.trim();
}

// =====================================================
// 🤖 AI: Local Ollama (HTTP)
// =====================================================
const OLLAMA_HOST = process.env.OLLAMA_HOST;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL;
const OLLAMA_ENABLED = (process.env.OLLAMA_ENABLED ?? "1") !== "0" && Boolean(OLLAMA_HOST && OLLAMA_MODEL);
async function ollamaGenerate({ model, system, prompt }) {
  if (typeof OLLAMA_ENABLED !== "undefined" && !OLLAMA_ENABLED) throw new Error("OLLAMA_DISABLED");
  const r = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, system, prompt, stream: false })
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Ollama /api/generate failed: ${r.status} ${t}`);
  try { return JSON.parse(t); } catch { return { response: t }; }
}

async function ollamaEmbed(text) {
  if (typeof OLLAMA_ENABLED !== "undefined" && !OLLAMA_ENABLED) throw new Error("OLLAMA_DISABLED");
  const r = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: String(text || "") })
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Ollama /api/embeddings failed: ${r.status} ${t}`);
  const j = JSON.parse(t);
  return j?.embedding || [];
}

// Safer intent filter: block only harmful "how to"
const AI_BLOCK_INTENT = [
  /(?:как|how)\s+(?:взломать|hack|ddos|dox|докс|обойти|bypass|обойти\s+закон|evade)/i,
  /(?:как|how)\s+(?:сделать|make|изготовить)\s+(?:бомб|взрыв|explos)/i,
  /(?:как|how)\s+(?:купить|достать|get)\s+(?:наркот|drug|оружи|gun|патрон|ammo)\b/i
];
function aiIsBlocked(text) {
  const t = String(text || "");
  return AI_BLOCK_INTENT.some((re) => re.test(t));
}

// =====================================================
// 🧠 RAG store (embeddings) — OPTIONAL but recommended
// =====================================================
let RAG = { meta: { created_at: null, model: (typeof OLLAMA_EMBED_MODEL === "string" ? OLLAMA_EMBED_MODEL : null), count: 0 }, chunks: [] };

function ragLoad() {
  try {
    if (fs.existsSync(RAG_STORE_PATH)) {
      const raw = fs.readFileSync(RAG_STORE_PATH, "utf8");
      const j = JSON.parse(raw);
      if (j?.chunks?.length) RAG = j;
    }
  } catch (e) {
    console.error("RAG load error:", e?.message || e);
  }
}
function ragSave() {
  fs.writeFileSync(RAG_STORE_PATH, JSON.stringify(RAG, null, 2), "utf8");
}
ragLoad();

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function buildContextFromTop(top) {
  return top.map((x) => {
    const codeLabel = x.code === "UK" ? "УК" : x.code === "AK" ? "АК" : "—";
    return `\n\n--- REF: ${x.ref}${x.stars || ""} [${codeLabel}] FILE: ${x.file} TITLE: ${x.title} ---\n${x.text}`;
  }).join("").trim();
}

// =====================================================
// AI endpoints: health / reload / reindex / chat
// =====================================================
app.get("/api/ai/health", (_req, res) =>
  res.json({
    ok: true,
    ollama: OLLAMA_HOST,
    model: (typeof OLLAMA_MODEL === "string" ? OLLAMA_MODEL : null),
    embed_model: (typeof OLLAMA_EMBED_MODEL === "string" ? OLLAMA_EMBED_MODEL : null),
    rulesDir: RULES_DIR,
    rulesFile: RULES_FILE,
    indexedRefs: REF_INDEX.size,
    rag: {
      store: RAG_STORE_PATH,
      count: RAG?.chunks?.length || 0,
      created_at: RAG?.meta?.created_at || null,
      model: RAG?.meta?.model || null
    }
  })
);

app.post("/api/ai/reload_rules", (_req, res) => {
  reloadRules();
  res.json({ ok: true, refs: REF_INDEX.size, chunks: RULE_CHUNKS.length });
});

app.post("/api/ai/reindex", async (_req, res) => {
  try {
    if (!OLLAMA_ENABLED) {
      return res.status(400).json({ error: "OLLAMA_DISABLED", message: "Ollama отключена (OLLAMA_ENABLED=0 или нет OLLAMA_HOST/OLLAMA_MODEL)." });
    }
    reloadRules();
    if (!RULE_CHUNKS.length) {
      return res.status(400).json({ error: "NO_RULES", message: `No rules chunks found in ${RULES_DIR}` });
    }

    console.log(`🧠 Reindex start: chunks=${RULE_CHUNKS.length} embed_model=${OLLAMA_EMBED_MODEL}`);

    const out = new Array(RULE_CHUNKS.length);
    let next = 0;

    async function worker() {
      while (true) {
        const i = next++;
        if (i >= RULE_CHUNKS.length) return;
        const c = RULE_CHUNKS[i];
        const textForVec = `${c.title}\n${c.ref}${c.stars || ""}\n${c.text}`;
        const vec = await ollamaEmbed(textForVec);
        out[i] = { ...c, vec };
        if ((i + 1) % 25 === 0) console.log(`🧠 Reindex progress: ${i + 1}/${RULE_CHUNKS.length}`);
      }
    }

    // 2 workers = быстрее, но не убивает Ollama
    await Promise.all([worker(), worker()]);

    RAG = {
      meta: { created_at: new Date().toISOString(), model: OLLAMA_EMBED_MODEL, count: out.length },
      chunks: out
    };
    ragSave();

    console.log(`🧠 Reindex done: vectors=${out.length} -> ${RAG_STORE_PATH}`);
    res.json({ ok: true, count: out.length, store: RAG_STORE_PATH, created_at: RAG.meta.created_at });
  } catch (e) {
    console.error("REINDEX ERROR:", e);
    res.status(500).json({ error: "REINDEX_FAILED", message: e?.message || String(e) });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const rawArr = Array.isArray(req.body?.messages) ? req.body.messages : null;
    const message =
      typeof req.body?.message === "string"
        ? req.body.message
        : rawArr
          ? String([...rawArr].reverse().find((m) => m?.role === "user")?.content ?? "")
          : "";

    const userText = String(message || "").trim();
    if (!userText) return res.status(400).json({ error: "NO_USER_MESSAGE" });

    // ✅ Smalltalk / greetings / chatty messages should NOT go to rules/RAG
    const stHit = detectSmallTalkIntent(userText);
    if (stHit.intent && stHit.score >= 0.55) {
      return res.json({ reply: smallTalkReply(stHit.intent, userText) });
    }


    if (/^(прив(ет|)\b|hello\b|hi\b|йо\b|здарова\b|ку\b|yo\b|доброе\s+утро\b|добрый\s+день\b|добрый\s+вечер\b)$/i.test(userText)) {
      return res.json({ reply: "Привет! Я VIP AI-помощник по памятке/правилам. Напиши номер статьи (например: 12.8 УК / 6.8 АК) или вопрос словами — отвечу со ссылкой 🙂" });
    }

    const brief = isBriefAsked(userText);
    const pick = extractChoiceSuffix(userText);

    const parsed = normalizeQuery(userText);
    const refKey = parsed.ref ? normalizeRefKey(parsed.ref) : null;

    // 1) Exact ref answer
    if (refKey) {
      const all = REF_INDEX.get(refKey) || [];
      if (pick && pick.ref === refKey && all.length) {
        const idx = Math.max(0, Math.min(all.length - 1, pick.choice - 1));
        return res.json(explainRef([all[idx]], refKey, brief, parsed.codeHint));
      }
      if (all.length) return res.json(explainRef(all, refKey, brief, parsed.codeHint));
      return res.json({ reply: `В правилах/памятке нет пункта ${refKey}. Проверь rules/*.txt и нажми "Обновить"/"Reindex".` });
    }

    if (aiIsBlocked(userText)) {
      return res.json({
        reply: "⛔ Я не могу помогать с инструкциями для вреда/обхода закона. Могу помочь: объяснить статьи, наказания и порядок действий — строго по твоей базе."
      });
    }

    // 🧠 follow-up memory
    const mk = memKey(req);
    const mem = memGet(mk);
    const keys = extractTopicKeywords(userText);
    if (keys.length) memSet(mk, { topic: keys.join(", "), keywords: keys });

    const baseQ = parsed.cleanText || userText;
    const qForSearch = isShortFollowup(userText) && mem?.topic ? `${baseQ} (тема: ${mem.topic})` : baseQ;

    // 2) RAG semantic retrieval if built
    let context = "";

    if (RAG?.chunks?.length) {
      const qVec = await ollamaEmbed(qForSearch);

      let scored = RAG.chunks.map((c) => ({ s: cosine(qVec, c.vec || []), c }));

      // Law file bonus
      scored = scored.map(({ s, c }) => {
        const isLaw = LAW_FILES.includes(String(c.file || "").toLowerCase());
        return { s: s + (isLaw ? 0.05 : 0), c };
      });

      // УК/АК hint preference
      if (parsed.codeHint) {
        scored = scored.map(({ s, c }) => {
          if (!c.code) return { s, c };
          return { s: c.code === parsed.codeHint ? s + 0.03 : s - 0.02, c };
        });
      }

      scored.sort((a, b) => b.s - a.s);

      const best = scored[0]?.s || 0;

      // if best is too low, we fallback to keyword snippets
      if (best >= 0.20) {
        const top = scored.slice(0, 6).map((x) => x.c);
        context = buildContextFromTop(top);
      }
    }

    // 3) fallback keyword snippets (your old approach)
    if (!context) {
      context = pickSnippetsFromEntriesFiltered(qForSearch, LAW_FILES, parsed.codeHint);
      if (!context) context = pickSnippetsFromEntries(qForSearch, parsed.codeHint);
      if ((!context || context.length < 30) && shouldForceLawFiles(userText)) {
        const forced = pickSnippetsForceLawFiles();
        if (forced) context = forced;
      }
    }

    const system =
      process.env.AI_SYSTEM_PROMPT ||
      `Ты — помощник по памятке/правилам. Отвечай СТРОГО по тексту из контекста.
ЖЁСТКИЕ ПРАВИЛА:
- НЕ придумывай статьи/пункты/штрафы.
- Если нет прямого ответа в контексте — скажи: "В памятке/правилах этого нет" и попроси уточнить.
- Всегда добавляй "Источник:" и укажи REF/FILE (как в контексте).
ФОРМАТ: 2-6 коротких предложений, без воды.`;

    const prompt = `ВОПРОС: ${userText}

КОНТЕКСТ:
${context || "(контекст пуст — нет релевантных фрагментов)"}

ОТВЕТ (со ссылкой на источник):`;

    if (!OLLAMA_ENABLED) {
      // Fallback: return top snippets directly (no generation)
      const snippetText = context ? context : "В памятке/правилах этого не найдено.";
      const short = snippetText.length > 2500 ? snippetText.slice(0, 2500) + "…" : snippetText;
      return res.json({ reply: short, model: null, ollama: "OFF" });
    }

    const result = await ollamaGenerate({ model: (typeof OLLAMA_MODEL === "string" ? OLLAMA_MODEL : null), system, prompt });

    const reply =
      (result?.response || "").trim() ||
      "Не нашёл этого в памятке/правилах. Уточни формулировку или добавь текст в rules/*.txt и сделай reindex.";

    return res.json({ reply, model: (typeof OLLAMA_MODEL === "string" ? OLLAMA_MODEL : null) });
  } catch (e) {
    console.error("AI CHAT ERROR:", e);
    return res.status(500).json({ error: "AI_ERROR", message: e?.message || String(e) });
  }
});

// Debug: check ollama + model list
app.get("/api/ai/ollama", async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`);
    const t = await r.text();
    if (!r.ok) return res.status(500).json({ error: "OLLAMA_TAGS_ERROR", message: t });
    return res.type("application/json").send(t);
  } catch (e) {
    return res.status(500).json({ error: "OLLAMA_UNREACHABLE", message: e?.message || String(e) });
  }
});

// =====================================================
// 🤖 BOT: request code
// POST /auth/telegram/request-code { telegram_id }
// =====================================================
app.post("/auth/telegram/request-code", async (req, res) => {
  try {
    if (BOT_API_KEY) {
      const k = String(req.headers["x-bot-key"] || "");
      if (k !== BOT_API_KEY) return res.status(401).json({ error: "BAD_BOT_KEY" });
    }

    const tgId = String(req.body?.telegram_id || "").trim();
    if (!tgId) return res.status(400).json({ error: "NO_TELEGRAM_ID" });

    // 1) reuse existing valid code (anti-spam)
    const { data: existing, error: exErr } = await supabase
      .from("tg_login_codes")
      .select("*")
      .eq("telegram_id", tgId)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (exErr) return res.status(500).json({ error: exErr.message });

    if (existing?.[0]?.code) {
      return res.json({
        code: existing[0].code,
        expires_at: existing[0].expires_at,
        reused: true
      });
    }

    // 2) generate unique code (few tries)
    let code = genCode(6);
    for (let i = 0; i < 6; i++) {
      const { data: clash, error: cErr } = await supabase
        .from("tg_login_codes")
        .select("id")
        .eq("code", code)
        .limit(1);
      if (cErr) return res.status(500).json({ error: cErr.message });
      if (!clash?.length) break;
      code = genCode(6);
    }

    const expiresAt = new Date(Date.now() + TG_CODE_TTL_MIN * 60 * 1000).toISOString();

    const { data: ins, error: insErr } = await supabase
      .from("tg_login_codes")
      .insert({
        telegram_id: tgId,
        code: code.toUpperCase(),
        expires_at: expiresAt,
        used: false
      })
      .select()
      .single();

    if (insErr) return res.status(500).json({ error: insErr.message });

    return res.json({ code: ins.code, expires_at: ins.expires_at, reused: false });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// =====================================================
// 🔐 LOGIN handler (shared)
// =====================================================
const handleLoginByCode = async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "NO_CODE" });


    // optional user note/keywords from login screen
    const login_note = sanitizeNote(req.body?.note);

    const { data: row, error } = await supabase
      .from("tg_login_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(400).json({ error: "BAD_CODE" });
    if (row.used) return res.status(400).json({ error: "CODE_USED" });
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "CODE_EXPIRED" });
    }

    const tgId = String(row.telegram_id);

    // find or create user by telegram_id
    let { data: user, error: uerr } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", tgId)
      .maybeSingle();

    if (uerr) return res.status(500).json({ error: uerr.message });

    if (!user) {
      const { data: created, error: cerr } = await supabase
        .from("users")
        .insert({
          telegram_id: tgId,
          role: "free",
          note: login_note
        })
        .select()
        .single();
      if (cerr) return res.status(500).json({ error: cerr.message });
      user = created;
    }

    // if note provided, store it on user (latest keywords)
    if (login_note) {
      const { error: nErr } = await supabase
        .from("users")
        .update({ note: login_note })
        .eq("id", user.id);
      if (nErr) return res.status(500).json({ error: nErr.message });
      // reflect in returned user object
      user = { ...user, note: login_note };
    }

    // mark code used
    const { error: mErr } = await supabase
      .from("tg_login_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", row.id);

    if (mErr) return res.status(500).json({ error: mErr.message });

    const token = jwt.sign(
      { uid: user.id, telegram_id: user.telegram_id, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({ ok: true, token, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// ✅ оба роутa (старый + новый)
app.post("/auth/tg/verify", handleLoginByCode);
app.post("/auth/login-by-code", handleLoginByCode);

// =====================================================
// 👤 /me
// =====================================================
app.get("/me", async (req, res) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.uid)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(user);
  } catch {
    return res.status(401).json({ error: "BAD_TOKEN" });
  }
});

// =====================================================
// 🔑 ADMIN: VIP KEYS
// Table expected: public.vip_keys
// Columns used by UI: id, code, duration, max_uses, used_count, tag, created_at, expires_at, used, used_at, telegram_id(optional)
// =====================================================
function normalizeKeyCode(s = "") {
  return String(s || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}


function normalizeKeyType(t = "") {
  const v = String(t || "").trim().toLowerCase();
  return v === "gold" ? "gold" : "vip";
}

function sanitizeNote(v) {
  const s = v == null ? "" : String(v);
  const t = s.trim();
  if (!t) return null;
  return t.slice(0, 300);
}

// =====================================================
// 🔑 VIP REDEEM (activate key)
// POST /redeem { code }
// =====================================================
function requireUserAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req._uid = payload?.uid || null;
    req.user = payload;
    if (!req._uid) return res.status(401).json({ error: "BAD_TOKEN" });
    return next();
  } catch {
    return res.status(401).json({ error: "BAD_TOKEN" });
  }
}

async function redeemVipHandler(req, res) {
  try {
    const uid = req._uid;
    const code = normalizeKeyCode(String(req.body?.code || "").trim());
    if (!code) return res.status(400).json({ error: "NO_CODE" });

    // load key by code
    const { data: key, error: kErr } = await supabase
      .from("vip_keys")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (kErr) return res.status(500).json({ error: kErr.message });
    if (!key) return res.status(400).json({ error: "BAD_CODE" });

    // expiry (optional)
    if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "CODE_EXPIRED" });
    }

    const maxUses = Number(key.max_uses || 1);
    const usedCount = Number(key.used_count || 0);
    if (usedCount >= maxUses) return res.status(400).json({ error: "CODE_LIMIT" });

    // load user
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("id, role, vip_until, vip_active, telegram_id")
      .eq("id", uid)
      .single();

    if (uErr) return res.status(500).json({ error: uErr.message });

    const days = Math.max(1, Math.min(3650, Number(key.duration || 0)));
    const now = Date.now();
    const curUntilMs = user?.vip_until ? new Date(user.vip_until).getTime() : 0;
    const base = Number.isFinite(curUntilMs) && curUntilMs > now ? curUntilMs : now;
    const newVipUntilIso = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

    // update user -> VIP/GOLD based on key.type
    const keyType = normalizeKeyType(key.type);
    const nextRole = keyType === "gold" ? "gold" : "vip";

    const { error: upErr } = await supabase
      .from("users")
      .update({ role: nextRole, vip_active: true, vip_until: newVipUntilIso })
      .eq("id", uid);

    if (upErr) return res.status(500).json({ error: upErr.message });

    // bump key usage (mark used if exhausted)
    const nextUsed = usedCount + 1;
    const exhausted = nextUsed >= maxUses;

    const { error: kUpErr } = await supabase
      .from("vip_keys")
      .update({
        used_count: nextUsed,
        used: exhausted ? true : key.used,
        used_at: exhausted ? new Date().toISOString() : key.used_at,
        telegram_id: user?.telegram_id ?? key.telegram_id ?? null
      })
      .eq("id", key.id);

    if (kUpErr) return res.status(500).json({ error: kUpErr.message });

    return res.json({ ok: true, role: (normalizeKeyType(key.type) === "gold" ? "gold" : "vip"), vip_until: newVipUntilIso });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
}

app.post("/redeem", requireUserAuth, redeemVipHandler);
app.post("/vip/redeem", requireUserAuth, redeemVipHandler);


app.get("/admin/keys", requireAdmin, requireAdminDb, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("vip_keys")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ keys: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});

app.post("/admin/keys", requireAdmin, async (req, res) => {
  try {
    const duration = Math.max(1, Math.min(3650, Number(req.body?.duration || 0)));
    const maxUsesRaw = req.body?.max_uses;
    const max_uses = maxUsesRaw == null || maxUsesRaw === "" ? 1 : Math.max(1, Math.min(999, Number(maxUsesRaw)));

    const type = normalizeKeyType(req.body?.type);

    let code = normalizeKeyCode(req.body?.custom_code || "");
    if (code && (code.length < 4 || code.length > 32)) {
      return res.status(400).json({ error: "BAD_CODE" });
    }
    if (!code) code = genCode(10);

    let expires_at = null;
    if (req.body?.expires_at) {
      const t = new Date(req.body.expires_at);
      if (!Number.isFinite(t.getTime())) return res.status(400).json({ error: "BAD_EXPIRES_AT" });
      expires_at = t.toISOString();
    }

    const payload = {
      type: type,
      code,
      duration,
      max_uses,
      used_count: 0,
      created_at: new Date().toISOString(),
      expires_at
    };

    const { data, error } = await supabase
      .from("vip_keys")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        return res.status(409).json({ error: "CODE_EXISTS" });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, key: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});


app.post("/admin/keys/create", requireAdmin, async (req, res) => {
  try {
    const duration = Math.max(1, Math.min(3650, Number(req.body?.duration || 0)));
    const maxUsesRaw = req.body?.max_uses;
    const max_uses = maxUsesRaw == null || maxUsesRaw === "" ? 1 : Math.max(1, Math.min(999, Number(maxUsesRaw)));

    const type = normalizeKeyType(req.body?.type);

    let code = normalizeKeyCode(req.body?.custom_code || "");
    if (code && (code.length < 4 || code.length > 32)) {
      return res.status(400).json({ error: "BAD_CODE" });
    }
    if (!code) code = genCode(10);

    let expires_at = null;
    if (req.body?.expires_at) {
      const t = new Date(req.body.expires_at);
      if (!Number.isFinite(t.getTime())) return res.status(400).json({ error: "BAD_EXPIRES_AT" });
      expires_at = t.toISOString();
    }

    const payload = {
      type: type,
      code,
      duration,
      max_uses,
      used_count: 0,
      created_at: new Date().toISOString(),
      expires_at
    };

    const { data, error } = await supabase
      .from("vip_keys")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        return res.status(409).json({ error: "CODE_EXISTS" });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, key: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});


app.delete("/admin/keys/:id", requireAdmin, requireAdminDb, async (req, res) => {
  try {
    const raw = String(req.params.id || "").trim();
    if (!raw) return res.status(400).json({ error: "BAD_ID" });

    // ✅ Backward-compatible:
    // - If frontend sends UUID -> delete by id
    // - If frontend sends CODE (e.g. KR45K0XTD) -> delete by code
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);

    if (isUuid) {
      const { error } = await supabase.from("vip_keys").delete().eq("id", raw);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, deleted_by: "id" });
    }

    const code = normalizeKeyCode(raw);
    if (!code) return res.status(400).json({ error: "BAD_CODE" });

    const { error } = await supabase.from("vip_keys").delete().eq("code", code);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, deleted_by: "code" });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});

// Optional explicit route (handy for clarity on frontend):
app.delete("/admin/keys/by-code/:code", requireAdmin, requireAdminDb, async (req, res) => {
  try {
    const code = normalizeKeyCode(String(req.params.code || "").trim());
    if (!code) return res.status(400).json({ error: "BAD_CODE" });

    const { error } = await supabase.from("vip_keys").delete().eq("code", code);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});



// =====================================================
// 🛡️ ADMIN / STAFF middleware + Users admin routes
// =====================================================
function requireAdmin(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // ✅ IMPORTANT: don't trust role inside JWT (it becomes stale).
    // Always read actual role from DB so "admin" doesn't disappear after role changes.
    req.user = payload;
    req._uid = payload?.uid || null;
    return next();
  } catch {
    return res.status(401).json({ error: "BAD_TOKEN" });
  }
}

// ✅ DB-backed admin guard (role always актуальная)
async function requireAdminDb(req, res, next) {
  const uid = req._uid;
  if (!uid) return res.status(401).json({ error: "BAD_TOKEN" });

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", uid)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    const role = String(user?.role || "").toLowerCase();

    if (role !== "admin") {
      return res.status(403).json({ error: "NO_ACCESS" });
    }


    // expose actual role to downstream handlers
    req.user = { ...(req.user || {}), role };
    return next();
  } catch (e) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
}

// =====================================================
// 🔒 Paid access helpers (anything ABOVE FREE)
// =====================================================
const PAID_ROLES = new Set(["vip", "gold", "gold_vip", "promo", "beta", "staff", "admin", "owner", "superadmin"]);

function isPaidByRole(role) {
  const r = String(role || "").toLowerCase();
  return PAID_ROLES.has(r);
}

async function requirePaidDb(req, res, next) {
  const uid = req._uid;
  if (!uid) return res.status(401).json({ error: "BAD_TOKEN" });

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, role, vip_active, vip_until")
      .eq("id", uid)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const role = String(user?.role || "").toLowerCase();
    const now = Date.now();
    const untilMs = user?.vip_until ? new Date(user.vip_until).getTime() : 0;
    const stillVip = Boolean(user?.vip_active) && Number.isFinite(untilMs) && untilMs > now;

    const paid = isPaidByRole(role) || stillVip;
    if (!paid) return res.status(403).json({ error: "ONLY_PAID" });

    // expose actual role to downstream handlers
    req.user = { ...(req.user || {}), role };
    return next();
  } catch (e) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
}

// =====================================================
// ⚙️ Telegram notifications setting
// Frontend calls:
//  - GET  /settings/telegram
//  - POST /settings/telegram  { tg_notify_enabled: boolean }
// FREE is not allowed.
// =====================================================
async function getTgEnabledForUser(uid) {
  // 1) try users.tg_notify_enabled
  const r1 = await supabase.from("users").select("tg_notify_enabled").eq("id", uid).maybeSingle();
  if (!r1.error && r1.data && typeof r1.data.tg_notify_enabled === "boolean") {
    return r1.data.tg_notify_enabled;
  }
  // 2) fallback to user_settings table (user_id, tg_notify_enabled)
  const r2 = await supabase.from("user_settings").select("tg_notify_enabled").eq("user_id", uid).maybeSingle();
  if (!r2.error && r2.data && typeof r2.data.tg_notify_enabled === "boolean") {
    return r2.data.tg_notify_enabled;
  }
  return false;
}

async function setTgEnabledForUser(uid, enabled) {
  // 1) try users.tg_notify_enabled
  const u1 = await supabase.from("users").update({ tg_notify_enabled: enabled }).eq("id", uid);
  if (!u1.error) return true;

  // 2) fallback to user_settings upsert
  const u2 = await supabase
    .from("user_settings")
    .upsert({ user_id: uid, tg_notify_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (u2.error) throw u2.error;
  return true;
}

app.get("/settings/telegram", requireUserAuth, requirePaidDb, async (req, res) => {
  try {
    const uid = req._uid;
    const enabled = await getTgEnabledForUser(uid);
    return res.json({ ok: true, tg_notify_enabled: Boolean(enabled) });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});

app.post("/settings/telegram", requireUserAuth, requirePaidDb, async (req, res) => {
  try {
    const uid = req._uid;
    const enabled = Boolean(req.body?.tg_notify_enabled);
    await setTgEnabledForUser(uid, enabled);
    return res.json({ ok: true, tg_notify_enabled: enabled });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});

// =====================================================
// 🚗 Rentals (needed by Calculator page)
// Minimal CRUD, stored per-user in Supabase table `rentals`.
// Schema suggestion:
//   rentals: id uuid, user_id uuid, name text, rent numeric, start_at timestamptz, end_at timestamptz, created_at timestamptz
// =====================================================
app.get("/rentals", requireUserAuth, async (req, res) => {
  try {
    const uid = req._uid;
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, rentals: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});

app.post("/rentals/upsert", requireUserAuth, async (req, res) => {
  try {
    const uid = req._uid;
    const body = req.body || {};
    const payload = {
      id: body.id || undefined,
      user_id: uid,
      name: String(body.name || "").trim() || null,
      rent: typeof body.rent === "number" ? body.rent : Number(body.rent || 0),
      start_at: body.start_at || body.startAt || null,
      end_at: body.end_at || body.endAt || null,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("rentals")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, rental: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});

app.delete("/rentals/:id", requireUserAuth, async (req, res) => {
  try {
    const uid = req._uid;
    const id = req.params.id;
    const { error } = await supabase.from("rentals").delete().eq("id", id).eq("user_id", uid);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "SERVER_ERROR" });
  }
});

// ✅ GET users list for Admin Panel
app.get("/admin/users", requireAdmin, requireAdminDb, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, telegram_id, username, role, vip_until, note, created_at")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ users: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ✅ PATCH user role (staff ограничен: нельзя staff/admin)
app.patch("/admin/users/:id/role", requireAdmin, requireAdminDb, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const role = String(req.body?.role || "").toLowerCase();

    const allowed = ["free", "vip", "gold", "admin"];
    if (!allowed.includes(role)) return res.status(400).json({ error: "BAD_ROLE" });
    const { error } = await supabase.from("users").update({ role }).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ✅ PATCH user fields (username / telegram_id / role / vip)
app.patch("/admin/users/:id", requireAdmin, requireAdminDb, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ error: "NO_ID" });

    const body = req.body || {};

    // role (optional)
    let role = body.role != null ? String(body.role).toLowerCase() : null;
    if (role) {
      const allowed = ["free", "vip", "gold", "staff", "admin"];
      if (!allowed.includes(role)) return res.status(400).json({ error: "BAD_ROLE" });

      if (String(req.user?.role || "").toLowerCase() === "staff" && (role === "staff" || role === "admin")) {
        return res.status(403).json({ error: "OWNER_ONLY" });
      }
    }

    // username (optional)
    const username = body.username != null ? String(body.username).trim().slice(0, 64) : null;

    // telegram_id (optional) — allow null to clear
    const telegram_id =
      body.telegram_id === null || body.telegram_id === ""
        ? null
        : body.telegram_id != null
          ? String(body.telegram_id).trim()
          : null;


    // note/keywords (optional) — shown in AdminUsers mini text
    const note = body.note != null ? sanitizeNote(body.note) : null;

    // VIP
    const vip_add_days = Math.max(0, Number(body.vip_add_days || 0) || 0);
    const vip_until_raw = body.vip_until ?? null;

    let vip_until = null;

    if (vip_until_raw) {
      const d = new Date(String(vip_until_raw));
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "BAD_VIP_UNTIL" });
      vip_until = d.toISOString();
    } else if (vip_add_days > 0) {
      const { data: cur, error: curErr } = await supabase
        .from("users")
        .select("vip_until")
        .eq("id", id)
        .maybeSingle();

      if (curErr) return res.status(500).json({ error: curErr.message });

      const baseMs =
        cur?.vip_until && new Date(cur.vip_until).getTime() > Date.now()
          ? new Date(cur.vip_until).getTime()
          : Date.now();

      vip_until = new Date(baseMs + vip_add_days * 24 * 60 * 60 * 1000).toISOString();
    } else if (vip_until_raw === null && "vip_until" in body) {
      vip_until = null;
    }

    const update = {};
    if (username !== null) update.username = username;
    if (telegram_id !== null || body.telegram_id === null || body.telegram_id === "") update.telegram_id = telegram_id;
    if (role) update.role = role;
    if ("vip_until" in body || vip_add_days > 0) update.vip_until = vip_until;
    if (note !== null) update.note = note;

    if (!Object.keys(update).length) return res.json({ ok: true, changed: false });

    const { data: updated, error } = await supabase
      .from("users")
      .update(update)
      .eq("id", id)
      .select("id, telegram_id, username, role, vip_until, note, created_at")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, user: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// =====================================================
// 📜 Rules helper: get a ref
// GET /api/rules/ref/12.8?code=AK
// =====================================================
app.get("/api/rules/ref/:ref", (req, res) => {
  const refKey = normalizeRefKey(String(req.params.ref || "").trim());
  const code = String(req.query?.code || "").toUpperCase();
  const codeHint = code === "UK" || code === "AK" ? code : null;

  const entries = REF_INDEX.get(refKey) || [];
  if (!entries.length) return res.status(404).json({ error: "NOT_FOUND", ref: refKey });

  const used = codeHint ? entries.filter((e) => e.code === codeHint) : entries;
  if (!used.length) return res.status(404).json({ error: "NOT_FOUND_IN_CODE", ref: refKey, code: codeHint });

  if (used.length === 1) return res.json({ ref: refKey, code: used[0].code, text: used[0].text, source: used[0].file });
  return res.json({
    ref: refKey,
    variants: used.map((e) => ({ code: e.code, file: e.file, title: e.title, text: e.text }))
  });
});

// =====================================================
// 🚀 Start
// =====================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on port ${PORT}`);
  console.log(`🤖 Ollama: ${OLLAMA_ENABLED ? OLLAMA_HOST : 'OFF'} | model: ${OLLAMA_ENABLED ? OLLAMA_MODEL : 'OFF'} | embed: ${OLLAMA_ENABLED ? OLLAMA_EMBED_MODEL : 'OFF'}`);
  console.log(`📚 rules dir: ${RULES_DIR} | indexed refs: ${REF_INDEX.size} | chunks: ${RULE_CHUNKS.length}`);
  console.log(`🧠 RAG store: ${RAG_STORE_PATH} | vectors: ${RAG?.chunks?.length || 0}`);
  console.log(`📄 rules file fallback: ${RULES_FILE}`);
});
