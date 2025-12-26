
// src/electron/backend/telegram_webhook_bot.js
// Rich MHELPER Telegram Bot (Webhook-ready for Render)
// - Rich inline UI (How-to / Support / About)
// - Anti-spam: reuse existing code while alive (backend endpoint does reuse too)
// - Local anti-flood + in-flight lock
// - Clean chat: deletes previous bot messages for the user on inline clicks
//
// Requires backend endpoint:
// POST /auth/telegram/request-code { telegram_id } -> { code, expires_at, reused }
//
// ENV:
// BOT_TOKEN=...
// BACKEND_URL=https://your-service.onrender.com   (optional; default: RENDER_EXTERNAL_URL or http://localhost:${PORT})
// BOT_BRAND=MHELPER (optional)
// SUPPORT_DISCORD_INVITE=https://discord.gg/... (optional)
// AUTHOR_NAME=mobsioff (optional)

import { Telegraf, Markup } from "telegraf";

export function mountTelegramWebhookBot(app, {
  webhookPath = "/tg/webhook",
  port = Number(process.env.PORT || 3001),
} = {}) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) throw new Error("❌ BOT_TOKEN missing");

  const BOT_BRAND = process.env.BOT_BRAND || "MHELPER";
  const SUPPORT_DISCORD_INVITE = process.env.SUPPORT_DISCORD_INVITE || "https://discord.gg/ExYHHG5dgA";
  const AUTHOR_NAME = process.env.AUTHOR_NAME || "mobsioff";

  const BACKEND_URL =
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${port}`;

  const bot = new Telegraf(BOT_TOKEN);

  // --------------------
  // State / anti-spam
  // --------------------
  const inflight = new Set(); // tgId to prevent double-click storms
  const cooldown = new Map(); // tgId -> ts, for rate limiting taps
  const state = new Map();    // tgId -> { code, expiresAtMs, msgIds: number[], seenWelcome?: boolean }

  // --------------------
  // Utils
  // --------------------
  function nowMs() { return Date.now(); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function pad2(n) { return String(n).padStart(2, "0"); }

  function formatLeft(msLeft) {
    const s = Math.max(0, Math.ceil(msLeft / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    if (mm <= 0) return `${ss} сек`;
    return `${mm}:${pad2(ss)} мин`;
  }

  function isCooling(tgId, ms = 900) {
    const t = cooldown.get(tgId) || 0;
    const n = nowMs();
    if (n - t < ms) return true;
    cooldown.set(tgId, n);
    return false;
  }

  async function postJSON(path, body) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });

    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = data?.error || `HTTP_${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function getUserState(tgId) {
    const st = state.get(tgId);
    if (st) return st;
    const init = { code: null, expiresAtMs: 0, msgIds: [], seenWelcome: false };
    state.set(tgId, init);
    return init;
  }

  async function cleanupBotMessages(ctx, tgId, keepMessageId = null) {
    const st = getUserState(tgId);
    const ids = (st.msgIds || []).slice(0);
    st.msgIds = []; // reset; we'll re-add fresh ones

    const toDelete = [];
    for (const id of ids) {
      if (!id) continue;
      if (keepMessageId && id === keepMessageId) continue;
      toDelete.push(id);
    }

    for (const mid of toDelete) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, mid); } catch {}
    }

    const pressedId = ctx.callbackQuery?.message?.message_id;
    if (pressedId && (!keepMessageId || pressedId !== keepMessageId)) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, pressedId); } catch {}
    }
  }

  function rememberMsg(tgId, msgId) {
    const st = getUserState(tgId);
    if (!msgId) return;
    st.msgIds = Array.from(new Set([...(st.msgIds || []), msgId])).slice(-10);
  }

  function primaryKeyboard(tgId) {
    const st = getUserState(tgId);
    const active = st.expiresAtMs > nowMs();

    if (active) {
      const left = formatLeft(st.expiresAtMs - nowMs());
      return Markup.inlineKeyboard([
        [Markup.button.callback(`⏳ Код активен (${left})`, "NOOP")],
        [Markup.button.callback("👁 Показать код ещё раз", "SHOW_CODE")],
        [Markup.button.callback("📖 Как войти", "HOWTO"), Markup.button.callback("🆘 Поддержка", "SUPPORT")]
      ]);
    }

    return Markup.inlineKeyboard([
      [Markup.button.callback("🔑 Получить код входа", "GET_CODE")],
      [Markup.button.callback("📖 Как войти", "HOWTO"), Markup.button.callback("🆘 Поддержка", "SUPPORT")],
      [Markup.button.callback("ℹ️ О боте", "ABOUT")]
    ]);
  }

  function supportText() {
    return [
      "🆘 *Поддержка*",
      "",
      "Если что-то сломалось — пиши в поддержку на Discord сервер:",
      SUPPORT_DISCORD_INVITE,
      "",
      `Автор приложения: *${AUTHOR_NAME}*`,
    ].join("\n");
  }

  function howtoText() {
    return [
      "📖 *Как войти в приложение*",
      "",
      `1) Открой приложение ${BOT_BRAND}`,
      "2) Нажми «Войти по коду»",
      "3) Вставь код из этого бота",
      "",
      "⏳ Код действует *5 минут*.",
      "⚠️ Не отправляй код другим — это доступ к твоему аккаунту."
    ].join("\n");
  }

  function aboutText() {
    return [
      `✨ *${BOT_BRAND} Bot*`,
      "",
      "Быстрая выдача кода входа для десктоп-приложения.",
      "",
      `Автор: *${AUTHOR_NAME}*`,
      `Поддержка: ${SUPPORT_DISCORD_INVITE}`
    ].join("\n");
  }

  async function safeAnswer(ctx, text) {
    try { await ctx.answerCbQuery(text, { show_alert: false }); } catch {}
  }

  function quickBarKeyboard() {
    return Markup.keyboard([
      ["🔑 Код входа", "📖 Как войти"],
      ["🆘 Поддержка", "ℹ️ О боте"],
      ["🏠 Старт"]
    ])
      .resize()
      .persistent();
  }

  async function sendWelcome(ctx) {
    const tgId = ctx.from?.id;
    const name = ctx.from?.first_name || "друг";

    if (tgId) {
      try { await cleanupBotMessages(ctx, tgId); } catch {}
    }

    const m1 = await ctx.reply(
      `👋 Привет, ${name}!\n\n` +
        `Это *${BOT_BRAND}* бот.\n` +
        `Нажми «🔑 Получить код входа» — я выдам код на 5 минут.\n\n` +
        `🆘 Поддержка: ${SUPPORT_DISCORD_INVITE}\n` +
        `Автор: *${AUTHOR_NAME}*`,
      { parse_mode: "Markdown", ...primaryKeyboard(tgId) }
    );
    rememberMsg(tgId, m1?.message_id);

    const m2 = await ctx.reply("⬇️ Быстрые кнопки (внизу возле ввода):", { ...quickBarKeyboard() });
    rememberMsg(tgId, m2?.message_id);

    const st = getUserState(tgId);
    st.seenWelcome = true;
  }

  async function issueOrReuseCode(ctx) {
    const tgId = ctx.from?.id;
    if (!tgId || !ctx.chat?.id) return;

    await cleanupBotMessages(ctx, tgId);

    if (isCooling(tgId)) {
      await safeAnswer(ctx, "⏳ Секунду…");
      const m = await ctx.reply("⏳ Секунду…", { ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
      return;
    }

    const st = getUserState(tgId);

    if (st.expiresAtMs > nowMs() && st.code) {
      const left = formatLeft(st.expiresAtMs - nowMs());
      await safeAnswer(ctx, `⏳ Код уже выдан (${left})`);
      const m = await ctx.reply(
        `⏳ Код уже активен.\nОсталось: *${left}*\n\nНажми «👁 Показать код ещё раз».`,
        { parse_mode: "Markdown", ...primaryKeyboard(tgId) }
      );
      rememberMsg(tgId, m?.message_id);
      return;
    }

    if (inflight.has(tgId)) {
      await safeAnswer(ctx, "⏳ Уже получаю код…");
      const m = await ctx.reply("⏳ Уже получаю код…", { ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
      return;
    }

    inflight.add(tgId);
    try {
      await safeAnswer(ctx, "🔐 Получаю код…");
      const data = await postJSON("/auth/telegram/request-code", { telegram_id: tgId });

      if (!data?.code) throw new Error("NO_CODE");
      const code = String(data.code).trim().toUpperCase();

      const expiresAtMs = data.expires_at
        ? new Date(data.expires_at).getTime()
        : (nowMs() + 5 * 60 * 1000);

      const msLeft = clamp(expiresAtMs - nowMs(), 0, 5 * 60 * 1000);

      st.code = code;
      st.expiresAtMs = expiresAtMs;

      const msg = `🔑 *Код входа*\n\n\`${code}\`\n\n⏳ Действует: *${formatLeft(msLeft)}*\n` +
        (data.reused ? "♻️ (код тот же, ещё активен)\n" : "") +
        "⚠️ Не делись кодом с другими.";

      const m = await ctx.reply(msg, { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);

      setTimeout(() => {
        const cur = getUserState(tgId);
        if (cur.expiresAtMs <= nowMs()) {
          cur.code = null;
          cur.expiresAtMs = 0;
        }
      }, msLeft + 1500);
    } catch (e) {
      const m = await ctx.reply(
        `❌ Не смог получить код.\n\nПричина: *${String(e.message || e)}*\nBackend: \`${BACKEND_URL}\``,
        { parse_mode: "Markdown", ...primaryKeyboard(tgId) }
      );
      rememberMsg(tgId, m?.message_id);
    } finally {
      inflight.delete(tgId);
    }
  }

  async function showCodeAgain(ctx) {
    const tgId = ctx.from?.id;
    if (!tgId || !ctx.chat?.id) return;

    await cleanupBotMessages(ctx, tgId);

    const st = getUserState(tgId);
    if (!st.code || st.expiresAtMs <= nowMs()) {
      await safeAnswer(ctx, "Код истёк. Получи новый ✅");
      const m = await ctx.reply("Код истёк. Нажми «🔑 Получить код входа».", { ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
      return;
    }

    const left = formatLeft(st.expiresAtMs - nowMs());
    await safeAnswer(ctx, `Показываю (осталось ${left})`);

    const m = await ctx.reply(
      `🔁 *Твой активный код*\n\n\`${st.code}\`\n\n⏳ Осталось: *${left}*`,
      { parse_mode: "Markdown", ...primaryKeyboard(tgId) }
    );
    rememberMsg(tgId, m?.message_id);
  }

  // --------------------
  // Commands & UI
  // --------------------
  bot.start(async (ctx) => { await sendWelcome(ctx); });

  bot.command("help", async (ctx) => {
    const tgId = ctx.from?.id;
    const m = await ctx.reply(howtoText(), { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
    if (tgId) rememberMsg(tgId, m?.message_id);
  });

  bot.command("code", async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId || !ctx.chat?.id) return;

    const st = getUserState(tgId);
    if (st.code && st.expiresAtMs > nowMs()) {
      const left = formatLeft(st.expiresAtMs - nowMs());
      const m = await ctx.reply(`⏳ Код уже активен (${left}). Нажми «👁 Показать код ещё раз».`, { ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
      return;
    }

    try {
      const data = await postJSON("/auth/telegram/request-code", { telegram_id: tgId });
      const code = String(data.code || "").trim().toUpperCase();
      const expiresAtMs = data.expires_at ? new Date(data.expires_at).getTime() : (nowMs() + 5 * 60 * 1000);
      st.code = code;
      st.expiresAtMs = expiresAtMs;

      const m = await ctx.reply(
        `🔑 *Код входа*\n\n\`${code}\`\n\n⏳ Действует: *${formatLeft(expiresAtMs - nowMs())}*`,
        { parse_mode: "Markdown", ...primaryKeyboard(tgId) }
      );
      rememberMsg(tgId, m?.message_id);
    } catch (e) {
      const m = await ctx.reply(`❌ Ошибка получения кода: ${String(e.message || e)}`, { ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
    }
  });

  bot.on("text", async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const text = (ctx.message?.text || "").trim();

    if (text.startsWith("/")) return;

    const st = getUserState(tgId);
    if (!st.seenWelcome) {
      await sendWelcome(ctx);
      return;
    }

    if (text === "🏠 Старт") { await sendWelcome(ctx); return; }

    if (text === "🔑 Код входа" || text.toLowerCase() === "код" || text.toLowerCase() === "code") {
      await issueOrReuseCode(ctx); return;
    }

    if (text === "📖 Как войти" || text.toLowerCase() === "help" || text === "Инструкция") {
      const m = await ctx.reply(howtoText(), { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
      return;
    }

    if (text === "🆘 Поддержка") {
      const m = await ctx.reply(supportText(), { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
      return;
    }

    if (text === "ℹ️ О боте") {
      const m = await ctx.reply(aboutText(), { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
      rememberMsg(tgId, m?.message_id);
      return;
    }

    const m = await ctx.reply(
      "Я тебя понял 🙂\n\nНажми кнопку «🔑 Код входа» (внизу возле ввода) или выбери действие под сообщением.",
      { ...primaryKeyboard(tgId) }
    );
    rememberMsg(tgId, m?.message_id);
  });

  bot.action("GET_CODE", issueOrReuseCode);
  bot.action("SHOW_CODE", showCodeAgain);

  bot.action("HOWTO", async (ctx) => {
    const tgId = ctx.from?.id;
    if (tgId) await cleanupBotMessages(ctx, tgId);
    await safeAnswer(ctx, "📖 Инструкция");
    const m = await ctx.reply(howtoText(), { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
    if (tgId) rememberMsg(tgId, m?.message_id);
  });

  bot.action("SUPPORT", async (ctx) => {
    const tgId = ctx.from?.id;
    if (tgId) await cleanupBotMessages(ctx, tgId);
    await safeAnswer(ctx, "🆘 Поддержка");
    const m = await ctx.reply(supportText(), { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
    if (tgId) rememberMsg(tgId, m?.message_id);
  });

  bot.action("ABOUT", async (ctx) => {
    const tgId = ctx.from?.id;
    if (tgId) await cleanupBotMessages(ctx, tgId);
    await safeAnswer(ctx, "ℹ️ О боте");
    const m = await ctx.reply(aboutText(), { parse_mode: "Markdown", ...primaryKeyboard(tgId) });
    if (tgId) rememberMsg(tgId, m?.message_id);
  });

  bot.action("NOOP", async (ctx) => {
    const tgId = ctx.from?.id;
    const st = tgId ? getUserState(tgId) : null;
    if (st && st.code && st.expiresAtMs > nowMs()) {
      return ctx.answerCbQuery(`⏳ Осталось ${formatLeft(st.expiresAtMs - nowMs())}`, { show_alert: false });
    }
    return ctx.answerCbQuery("Можно получить новый код ✅", { show_alert: false });
  });

  bot.catch((err) => console.error("BOT_ERROR:", err));

  // webhook route
  app.post(webhookPath, (req, res) => bot.handleUpdate(req.body, res));

  async function setWebhook(externalBaseUrl) {
    const base = String(externalBaseUrl || "").replace(/\/$/, "");
    if (!base) return;
    const full = base + webhookPath;
    await bot.telegram.setWebhook(full);
    try {
      await bot.telegram.setMyCommands([
        { command: "start", description: "Показать меню и быстрые кнопки" },
        { command: "code", description: "Получить код входа (5 минут)" },
        { command: "help", description: "Как войти / инструкция" }
      ]);
    } catch {}
    return full;
  }

  return { bot, setWebhook, webhookPath, BACKEND_URL };
}
