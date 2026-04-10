require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const { handleDownloadVideo, handleDownloadAudio } = require("./src/downloader");
const { handleArchiveMedia } = require("./src/archive");
const { handleGroupClose, handleGroupOpen } = require("./src/groupClose");
const { addCaptionToImage, sendGachaStickers } = require("./src/sticker");
const { handleAI } = require("./src/ai");
const { formatMsAsMinSecond } = require("./src/sticker");
const { setAfk, getAfk, clearAfk } = require("./src/afkStore");
const { registerTelemetry } = require("./src/telemetry");
const logDate = () => new Date().toISOString();

const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
const listenedGroupIds = new Set(config["listensTo"] || []);

let isMuted = config["ismuted"];
let gachaSticker5CooldownUntil = config["gachaSticker5CooldownUntil"];
let gachaSticker10CooldownUntil = config["gachaSticker10CooldownUntil"];

// Create a new client instance
const client = new Client({
  authStrategy: new LocalAuth(),
});

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log(logDate(), "Client is ready!");
});

// When the client received QR-Code
client.on("qr", (qr) => {
  console.log(logDate(), "QR RECEIVED", qr);
  qrcode.generate(qr, { small: true });
});

// Handle all messages including your own
async function handleMessage(msg) {
  let chat;
  try {
    chat = await msg.getChat();
  } catch (err) {
    if ((err?.message || "").includes("channelMetadata")) {
      return;
    }
    throw err;
  }
  const chatId = chat?.id?._serialized || "";
  if (!chat?.isGroup || !listenedGroupIds.has(chatId)) return;

  const body = (msg.body || "").trim();
  const lower = body.toLowerCase();
  const senderId = msg.author || msg.from;

  // Clear sender AFK status when they send any non-.afk message.
  if (!lower.startsWith(".afk")) {
    const senderAfk = getAfk(senderId);
    if (senderAfk) {
      clearAfk(senderId);
      await msg.reply("bro ini aktif lagi setelah:");
    }
  }

  // Notify when message mentions/replies to an AFK user.
  const mentionedIds = new Set(msg.mentionedIds || []);
  if (msg.hasQuotedMsg) {
    try {
      const quoted = await msg.getQuotedMessage();
      const quotedUserId = quoted.author || quoted.from;
      if (quotedUserId) mentionedIds.add(quotedUserId);
    } catch (error) {
      console.log(logDate(), "[AFK] getQuotedMessage failed:", error?.message);
    }
  }
  for (const mentionedId of mentionedIds) {
    const afk = getAfk(mentionedId);
    if (!afk) continue;
    const durationMs = Date.now() - afk.since_ts;
    await msg.reply(
      `dia lagi AFK: ${afk.message}\nsejak ${formatMsAsMinSecond(durationMs)}`,
    );
    break;
  }

  // Mute mode: ignore non-bot messages when active
  // if (isMuted && !msg.fromMe) {
  //   return;
  // }

  // Simple ping command
  if (lower === ".test") {
    return msg.react("😼");
  }

  // Mute bot command
  if (lower === ".mancing") {
    isMuted = true;
    return msg.reply("mau mancing dulu ya ges");
  }

  if (lower === ".pulang") {
    isMuted = false;
    return msg.reply("aku kembali abis mancing");
  }

  if (lower === ".menu") {
    return msg.reply(`
      yang admin admin aja
      .close
      .open
      
      semua bowleh
      .arsip
      .dl [link]
      .dl-audio [link]
      .sticker
      .sticker-caption [text]
      .gacha-sticker
      .gacha-sticker-10
      .kick-dia
      .afk [alasan]
      .mancing
      .menu
      .test
      
      yang bot bot aja
      .ai
      .pulang
      .gacha-sticker-67
    `);
  }

  // AI command
  if (lower.startsWith(".ai")) {
    return handleAI(msg);
  }

  if (lower.startsWith(".afk")) {
    const afkMessage = body.slice(4).trim() || "entahlah";
    setAfk(senderId, afkMessage, chat.id?._serialized || null);
    return msg.reply(`AFK dengan alasan${afkMessage}`);
  }

  if (lower === ".sticker") {
    console.log(
      logDate(),
      "Sticker command triggered from:",
      msg.fromMe ? "yourself" : msg.author || msg.from,
    );

    let targetMsg = msg;
    if (msg.hasQuotedMsg) {
      targetMsg = await msg.getQuotedMessage();
    }

    if (!targetMsg.hasMedia) {
      return msg.reply("reply video/gambarnya dulu, terus ketik .sticker");
    }

    console.log(logDate(), "Downloading media for sticker...");
    const media = await targetMsg.downloadMedia();
    if (!media) return msg.reply("entah kenapa, enggak bisa. jadi yaudahlah");

    console.log(logDate(), "Sticker media downloaded, sending...");
    await msg.reply(media, null, {
      sendMediaAsSticker: true,
      stickerName: "sticker random",
      stickerAuthor: "Departemen Stira",
    });
    console.log(logDate(), "✅ Sticker created and sent successfully");
  }

  // Gacha sticker command with 5 min cooldown
  if (lower === ".gacha-sticker") {
    if (gachaSticker5CooldownUntil && Date.now() < gachaSticker5CooldownUntil) {
      const remainingMs = gachaSticker5CooldownUntil - Date.now();
      return msg.reply(`Gacha cooldown: ${formatMsAsMinSecond(remainingMs)}`);
    }
    gachaSticker5CooldownUntil = Date.now() + 2 * 60 * 1000; // 2 minutes
    await sendGachaStickers(chat, 4);
    return;
  }

  // Gacha sticker 10 command with 10 min cooldown
  if (lower === ".gacha-sticker-10") {
    if (
      gachaSticker10CooldownUntil &&
      Date.now() < gachaSticker10CooldownUntil
    ) {
      const remainingMs = gachaSticker10CooldownUntil - Date.now();
      return msg.reply(`Gacha cooldown: ${formatMsAsMinSecond(remainingMs)}`);
    }
    gachaSticker10CooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
    await sendGachaStickers(chat, 10);
    return;
  }

  // Gacha sticker 67 command (bot-only)
  if (lower === ".gacha-sticker-67") {
    if (!msg.fromMe) {
      return msg.reply("cuma bowleh bot");
    }
    await sendGachaStickers(chat, 67);
    return;
  }

  // Handle the .group-close command
  if (lower === ".close") {
    return handleGroupClose(msg, chat, client);
  }

  // Handle the .group-open command
  if (lower === ".open") {
    return handleGroupOpen(chat);
  }

  // Handle the .kick-member command
  if (lower === ".kick-dia") {
    if (!chat.isGroup) {
      return msg.reply("cuma bisa di grup");
    }
    try {
      const senderId = msg.author || msg.from;
      const botId = client.info?.wid?._serialized;

      if (!senderId) {
        return msg.reply("apalah ini");
      }

      if (botId && senderId === botId) {
        return msg.reply("gak bisa kick bot");
      }

      const participants = chat.participants || [];
      const sender = participants.find((p) => p.id._serialized === senderId);

      await chat.removeParticipants([senderId]);
      await msg.reply("rip 1 member jahat");
    } catch (error) {
      console.error("Kick error:", error);
      await msg.reply("direply dulu");
    }
  }

  // Download video command
  if (lower.startsWith(".dl ")) {
    const url = msg.body.slice(4).trim();
    if (!url) {
      return msg.reply("kasih linknya. .dl [link]");
    }
    return handleDownloadVideo(msg, url);
  }

  // Download audio command
  if (lower.startsWith(".dl-audio ")) {
    const url = msg.body.slice(10).trim();
    if (!url) {
      return msg.reply("kasih linknya. .dl-audio [link]");
    }
    return handleDownloadAudio(msg, url);
  }

  if (lower === ".arsip") {
    return handleArchiveMedia(msg);
  }

  if (lower.startsWith(".sticker-caption ")) {
    const caption = msg.body.slice(16).trim();
    if (!caption) {
      return msg.reply("tulis captionnya. .sticker-caption hello world");
    }
    return addCaptionToImage(msg, caption);
  }
}

client.on("message", handleMessage);

// const { registerTTSHandler } = require("./tts");
// inside client.on("ready", ...) :
// registerTTSHandler(client);

// test
// client.on("message_create", registerTTSHandler(client));

// Start your client
if (process.env.TELEMETRY_ENABLED === "true") {
  registerTelemetry(client);
  console.log(logDate(), "[telemetry] enabled");
}

client.initialize();
