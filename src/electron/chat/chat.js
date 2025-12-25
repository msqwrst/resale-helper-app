import express from "express";
import cors from "cors";
import stringSimilarity from "string-similarity";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

// Набор "намерений" (ключи → ответ)
const INTENTS = [
    { keys: ["привет", "здарова", "hello", "hi"], answer: "Привет 👋 Чем могу помочь?" },
    { keys: ["ошибка", "error", "не работает", "сломалось"], answer: "Опиши ошибку: что делал и что именно произошло?" },
    { keys: ["vip", "статус", "доступ"], answer: "VIP даёт расширенные функции и доступ к AI." },
    { keys: ["таймер", "timer"], answer: "Таймеры находятся во вкладке Timer ⏱" },
    { keys: ["как", "помоги", "help"], answer: "Напиши конкретно что нужно сделать — я подскажу шагами." }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_PATH = path.join(__dirname, "knowledge.txt");

function loadKnowledge() {
    try {
        return fs.readFileSync(KNOWLEDGE_PATH, "utf-8");
    } catch {
        return "";
    }
}

function parseQA(raw) {
    const blocks = raw.split(/\n\s*\n/g).map(b => b.trim()).filter(Boolean);
    const items = [];

    for (const b of blocks) {
        const q = (b.match(/Q:\s*(.+)/i) || [])[1];
        const a = (b.match(/A:\s*([\s\S]+)/i) || [])[1];
        if (q && a) items.push({ q: q.trim(), a: a.trim() });
    }
    return items;
}

function answerFromKB(text) {
    const norm = normalize(text);
    if (!KB.length) return null;

    let best = { rating: 0, a: null, q: null };

    for (const item of KB) {
        const r = stringSimilarity.compareTwoStrings(norm, normalize(item.q));
        if (r > best.rating) best = { rating: r, a: item.a, q: item.q };
    }

    if (best.rating > 0.45) return best.a; // порог можешь менять
    return null;
}


let KB_RAW = loadKnowledge();
let KB = parseQA(KB_RAW);



function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-zа-я0-9\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function findAnswer(text) {
    const norm = normalize(text); // ✅ ВОТ ЭТОГО НЕ ХВАТАЛО

    const fromKb = answerFromKB(text);
    if (fromKb) return fromKb;

    // точные матчи (быстро и надёжно)
    for (const intent of INTENTS) {
        for (const key of intent.keys) {
            if (norm.includes(key)) return intent.answer;
        }
    }

    // поиск по похожести (опечатки)
    let bestRating = 0;
    let bestAnswer = null;

    for (const intent of INTENTS) {
        for (const key of intent.keys) {
            const r = stringSimilarity.compareTwoStrings(norm, key);
            if (r > bestRating) {
                bestRating = r;
                bestAnswer = intent.answer;
            }
        }
    }

    if (bestRating > 0.4) return bestAnswer;

    return "Я не понял 🤔 Напиши проще/короче или опиши контекст.";
}


app.post("/chat", (req, res) => {
    const { message } = req.body || {};
    if (!message) return res.json({ reply: "Пустое сообщение 🤨" });

    const reply = findAnswer(message);
    res.json({ reply });
});

app.get("/health", (req, res) => res.json({ ok: true }));

setInterval(() => {
  const raw = loadKnowledge();
  if (raw && raw !== KB_RAW) {
    KB_RAW = raw;
    KB = parseQA(raw);
    console.log("📚 knowledge.txt reloaded. Items:", KB.length);
  }
}, 1500);


app.listen(PORT, () => {
    console.log(`💬 Chat backend running: http://localhost:${PORT}`);
});
