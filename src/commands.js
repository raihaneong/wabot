import wwebjs from "whatsapp-web.js";
import { sendGachaStickers } from "./sticker.js";
import { formatMsAsMinSecond } from "./sticker.js";
import { db } from "./db.js";
import { setAfk, getAfk, clearAfk, listAfkByChat } from "./db.js";
import { handleAI } from "./ai.js";
import { handlePlay } from "./music.js";
import { handleDownloadVideo, handleDownloadAudio } from "./downloader.js";
import { handleArchiveMedia } from "./archive.js";
import config from "./config.json" with { type: "json" };
import { setTimeout as delay } from "timers/promises";
import { runMove } from "./cloud.js";

const { MessageMedia } = wwebjs;

export function createBotCommands(client) {
  const state = {
    isReady: false,
    autoStickerEnabled: false,
    isMuted: config.ismuted ?? false,
    gachaSticker10CooldownUntil: config.gachaSticker10CooldownUntil ?? null,
    isSiderActive: true,
  };

  const MAX_BUFFER = 200;
  const chatBuffers = new Map();
  const pendingErasures = new Map();

  function recordMessage(chatId, message) {
    if (!chatBuffers.has(chatId)) {
      chatBuffers.set(chatId, []);
    }
    const buffer = chatBuffers.get(chatId);
    buffer.push(message);
    if (buffer.length > MAX_BUFFER) {
      buffer.shift();
    }
  }

  function getPreviousMessages(chatId, excludeMsgId, count) {
    const buffer = chatBuffers.get(chatId) || [];
    return buffer
      .filter((m) => m.id?._serialized !== excludeMsgId)
      .slice(-count);
  }

  async function performErase(chat, msg, requestedCount) {
    const available = getPreviousMessages(
      chat.id._serialized,
      msg.id?._serialized,
      requestedCount,
    );

    const results = await Promise.allSettled(
      available.map((m) => m.delete(true)),
    );

    results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.log(
          `Failed to delete ${available[i].id?._serialized}:`,
          result.reason,
        );
      }
    });

    const deletedCount = results.filter(
      (r) => r.status === "fulfilled",
    ).length;

    if (available.length < requestedCount) {
      return msg.reply(
        `Only ${available.length} messages were tracked (bot may have restarted recently). Deleted ${deletedCount} of those.`,
      );
    }

    return msg.reply(
      deletedCount === available.length
        ? `Deleted ${deletedCount} messages.`
        : `Deleted ${deletedCount} of ${available.length} messages (some were likely too old to delete for everyone).`,
    );
  }

  function bareId(value) {
    return String(value || "").split("@")[0];
  }

  function buildCommandMenu() {
    return [
      "Menu bot:",
      "- K / k: lihat menu ini",
      "- .menu: tampilkan menu bantuan",
      "- .test: cek bot hidup",
      "- .sticker / .s: jadikan media jadi sticker",
      "- .afk <alasan>: aktifkan status AFK",
      "- .afk-list: lihat orang yang sedang AFK",
      "- .gacha-sticker [jumlah]: buka gacha sticker",
      "- .gacha-sticker-10: gacha 10 sticker dengan cooldown",
      "- .gacha-sticker-67: gacha 67 sticker (khusus bot)",
      "- .dl <link>: download video",
      "- .dl-audio <link>: download audio",
      "- .arsip: arsipkan media",
      "- .mancing: aktifkan mode mute",
      "- .pulang: keluar dari mode mute",
      "- .ai <prompt>: chat dengan AI",
      "- erase <jumlah>: hapus pesan terakhir di grup",
      "- participants: lihat daftar participant grup",
      "- backup: jalankan backup cloud",
      "- auto-sticker: toggle auto convert media ke sticker",
      "- sider: toggle silent reader",
    ].join("\n");
  }

  async function resolveSenderName(msg, fallbackId) {
    const dataName = msg?._data?.notifyName || msg?._data?.pushname;
    if (dataName) return dataName;
    try {
      const contact = await msg.getContact();
      return contact?.pushname || contact?.name || contact?.number || bareId(fallbackId);
    } catch {
      return bareId(fallbackId);
    }
  }

  async function handleMessage(msg) {
    const lower = (msg.body || "").trim().toLowerCase();

    if (!state.isReady) return;
    recordMessage(msg.from, msg);

    let chat;
    try {
      chat = await msg.getChat();
    } catch (error) {
      const message = String(error?.message || "");
      const stack = String(error?.stack || "");
      if (
        message.includes("channelMetadata") ||
        message.includes("description") ||
        stack.includes("Channel.js") ||
        stack.includes("ChatFactory.js")
      ) return;
      throw error;
    }

    const body = (msg.body || "").trim();
    const senderId = msg.author || msg.from;

    if (state.isMuted && !msg.fromMe && lower !== ".pulang") return;

    const botId = client.info?.wid?._serialized;
    const mentionedIds = Array.isArray(msg.mentionedIds) ? msg.mentionedIds : [];
    const mentions = Array.isArray(msg.mentions) ? msg.mentions : [];
    const botMentioned = botId && (
      mentionedIds.some((id) => bareId(id) === bareId(botId)) ||
      mentions.some((contact) => {
        const contactId = contact?.id?._serialized || contact?.id || contact?.number;
        return contactId && bareId(contactId) === bareId(botId);
      })
    );
    if (botMentioned) {
      await msg.reply(chat.isGroup
        ? "Nika lagi ga ada disini, nanti aku balas ya!"
        : "Arunika lagi off, nanti aku balas ya!");
    }

    if (!lower.startsWith(".afk")) {
      const senderAfk = getAfk(senderId);
      if (senderAfk) {
        const durationMs = Date.now() - senderAfk.since_ts;
        clearAfk(senderId);
        const senderName = await resolveSenderName(msg, senderId);
        await msg.reply(`${senderName} aktif lagi setelah ${formatMsAsMinSecond(durationMs)}`);
      }
    }

    if (lower === ".afk" || lower.startsWith(".afk ")) {
      const afkMessage = body.slice(4).trim() || "entahlah";
      setAfk(senderId, afkMessage, chat.id?._serialized || null);
      const senderName = await resolveSenderName(msg, senderId);
      return msg.reply(`${senderName} tercatat AFK dengan alasan ${afkMessage}`);
    }

    if (lower === ".afk-list") {
      const afkEntries = listAfkByChat(chat.id?._serialized || null)
        .filter((entry) => entry.user_id !== senderId);
      if (afkEntries.length === 0) return msg.reply("lagi enggak ada yang AFK di sini");

      const lines = afkEntries.map((entry) => {
        const durationMs = Date.now() - entry.since_ts;
        return `- @${bareId(entry.user_id)}: ${entry.message} (sejak ${formatMsAsMinSecond(durationMs)})`;
      });
      return msg.reply(`Daftar AFK:\n${lines.join("\n")}`, undefined, {
        mentions: afkEntries.map((entry) => entry.user_id),
      });
    }

    const afkMentionIds = new Set([
      ...mentionedIds,
      ...mentions.map((contact) => contact?.id?._serialized || contact?.id || contact?.number).filter(Boolean),
    ]);
    for (const mentionedId of afkMentionIds) {
      const mentionedBare = bareId(mentionedId);
      const afk = getAfk(mentionedId) || getAfk(`${mentionedBare}@lid`) || getAfk(`${mentionedBare}@c.us`);
      if (!afk) continue;
      const durationMs = Date.now() - afk.since_ts;
      await msg.reply(`@${mentionedBare} sedang AFK: ${afk.message} (sejak ${formatMsAsMinSecond(durationMs)})`, undefined, {
        mentions: [afk.user_id],
      });
    }

    try {
      if (await handlePlay(msg)) return;

      if (lower === ".test") return msg.react("😼");

      if (lower === ".mancing") {
        state.isMuted = true;
        return msg.reply("mau mancing dulu ya ges");
      }

      if (lower === ".pulang") {
        state.isMuted = false;
        return msg.reply("aku kembali abis mancing");
      }

      if (lower === ".sticker" || lower === ".s") {
        let targetMsg = msg;
        if (msg.hasQuotedMsg) targetMsg = await msg.getQuotedMessage();
        if (!targetMsg.hasMedia) return msg.reply("reply video/gambarnya dulu, terus ketik .sticker");
        const media = await targetMsg.downloadMedia();
        if (!media) return msg.reply("entah kenapa, enggak bisa. jadi yaudahlah");
        return msg.reply(media, null, {
          sendMediaAsSticker: true,
          stickerName: "sticker random",
          stickerAuthor: "Departemen Stira",
        });
      }

      if (lower === ".gacha-sticker-10") {
        if (state.gachaSticker10CooldownUntil && Date.now() < state.gachaSticker10CooldownUntil) {
          return msg.reply(`Gacha cooldown: ${formatMsAsMinSecond(state.gachaSticker10CooldownUntil - Date.now())}`);
        }
        state.gachaSticker10CooldownUntil = Date.now() + 5 * 60 * 1000;
        await sendGachaStickers(client, msg.from, 10);
        return;
      }

      if (lower === ".gacha-sticker-67") {
        if (!msg.fromMe) return msg.reply("cuma bowleh bot");
        await sendGachaStickers(client, msg.from, 67);
        return;
      }

      if (lower.startsWith(".dl ")) {
        const url = body.slice(4).trim();
        if (!url) return msg.reply("kasih linknya. .dl [link]");
        return handleDownloadVideo(msg, url);
      }

      if (lower.startsWith(".dl-audio ")) {
        const url = body.slice(10).trim();
        if (!url) return msg.reply("kasih linknya. .dl-audio [link]");
        return handleDownloadAudio(msg, url);
      }

      if (lower === ".arsip") return handleArchiveMedia(msg);

      if (lower === ".kick-dia") {
        if (!chat.isGroup) return msg.reply("cuma bisa di grup");
        try {
          const targetId = senderId;
          if (targetId === botId) return msg.reply("gak bisa kick bot");
          await chat.removeParticipants([targetId]);
          return msg.reply("rip 1 member jahat");
        } catch (error) {
          console.error("Kick error:", error);
          return msg.reply("direply dulu");
        }
      }

      if (lower.startsWith("/dev")) {
        return msg.reply(await chat.getProfilePicUrl());
      }

      if (msg.body?.trim().startsWith(".ai")) {
        return handleAI(msg);
      }

      if (msg.body === "K" || lower === "k") {
        return msg.reply(buildCommandMenu());
      }

      if (lower === "auto-sticker") {
        state.autoStickerEnabled = !state.autoStickerEnabled;
        await client.sendMessage(msg.from,
          `Auto sticker is now ${state.autoStickerEnabled ? "enabled" : "disabled"}.`,
        );
        return;
      }

      if (lower === "p") {
        await msg.reply("listening...");
        return;
      }

      if (lower === ".menu") {
        return msg.reply(buildCommandMenu());
      }

      if (msg.body === "qwer") {
        try {
          await msg.react("👀");
          const media = await MessageMedia.fromFilePath("./assets/lullaby.mp3");
          await msg.reply(media);
        } catch (error) {
          console.error("Failed to send lullaby media:", error);
          await msg.reply("Gagal mengirim media.");
        }
        return;
      }

      if (msg.body === "qwer2") {
        try {
          await msg.react("👀");
          const media = await MessageMedia.fromFilePath(
            "./assets/p76zdwx1u68h1.webp",
          );
          await msg.reply(media, { caption: "ini caption" });
        } catch (error) {
          console.error("Failed to send qwer2 media:", error);
          await msg.reply("Gagal mengirim media.");
        }
        return;
      }

      if (msg.body === "qwer3") {
        try {
          await msg.react("👀");
          const media = await MessageMedia.fromFilePath("./assets/cos_oguri.mp4");
          await msg.reply(media, { caption: "ini caption" });
        } catch (error) {
          console.error("Failed to send qwer3 media:", error);
          await msg.reply("Gagal mengirim media.");
        }
        return;
      }

      const gachaMatch = lower.match(/^\.gacha-sticker(?:\s+(\S+))?$/);
      if (gachaMatch) {
        const amount = Number(gachaMatch[1] || 1);

        if (!Number.isInteger(amount) || amount < 1) {
          return msg.reply("Usage: .gacha-sticker [amount], amount must be a positive integer.");
        }

        if (amount > 100) {
          return msg.reply("You can request at most 100 stickers.");
        }

        await sendGachaStickers(client, msg.from, amount);
        return;
      }

      if (state.autoStickerEnabled && msg.hasMedia) {
        if (msg.fromMe) return;
        try {
          const media2sticker = await msg.downloadMedia();
          await client.sendMessage(msg.from, media2sticker, {
            sendMediaAsSticker: true,
          });
        } catch (err) {
          console.error("Caption sticker error:", err);
        }
      }

      if (msg.body === "db") {
        const groups = db.prepare("SELECT * FROM listened_groups").all();
        await msg.reply(
          `Listened Groups:\n${groups.map((g) => `- ${g.name}`).join("\n")}`,
        );
      }
      if (lower === "msg") {
        const rawMessage = JSON.stringify(msg, null, 2);
        await msg.reply(rawMessage.slice(0, 65_000));
      }
      if (lower === "chat") {
        const chat = await msg.getChat();
        const rawChat = JSON.stringify(chat, null, 2);
        await msg.reply(rawChat.slice(0, 65_000));
      }

      if (lower === "author") {
        await msg.reply(`nih id mu: ${msg.author}`);
      }

      if (lower === "d") {
        const repliedMsg = await msg.getQuotedMessage();
        if (!repliedMsg) return;

        await Promise.all([repliedMsg.delete(true), msg.delete(true)]);
        return;
      }

      if (lower === "participants") {
        let chat = await msg.getChat();
        let participants = chat.groupMetadata.participants;
        await msg.reply(participants.map((p) => p.id._serialized).join("\n"));
      }

      if (lower.startsWith("erase")) {
        const parts = lower.trim().split(/\s+/);
        const requestedCount = parseInt(parts[1], 10);

        if (!parts[1] || isNaN(requestedCount) || requestedCount < 1) {
          return msg.reply("Usage: erase [number], e.g. `erase 50`");
        }

        const botParticipant = chat.participants?.find(
          (p) => p.id?._serialized === botId,
        );
        const botIsAdmin = Boolean(
          chat.isGroup && (botParticipant?.isAdmin || botParticipant?.isSuperAdmin),
        );
        if (!botIsAdmin) {
          return msg.reply(
            chat.isGroup
              ? "Bot is not an admin, so I cannot delete messages."
              : "This command only works in groups.",
          );
        }

        const CONFIRM_THRESHOLD = 50;
        const MAX_ERASE = 200;
        const count = Math.min(requestedCount, MAX_ERASE);

        if (count >= CONFIRM_THRESHOLD) {
          pendingErasures.set(chat.id._serialized, {
            count,
            timestamp: Date.now(),
          });
          return msg.reply(
            `This will delete the last ${count} messages for everyone. Any admin can reply "confirm erase" within 60 seconds to proceed.`,
          );
        }

        return performErase(chat, msg, count);
      }

      if (lower === "confirm erase") {
        const pending = pendingErasures.get(chat.id._serialized);

        if (!pending) {
          return msg.reply("No pending erase to confirm.");
        }

        if (Date.now() - pending.timestamp > 60_000) {
          pendingErasures.delete(chat.id._serialized);
          return msg.reply("Confirmation expired. Please run the erase command again.");
        }

        const confirmerId = msg.author || msg.from;
        const confirmerParticipant = chat.participants?.find(
          (p) => p.id?._serialized === confirmerId,
        );
        const confirmerIsAdmin = Boolean(
          confirmerParticipant?.isAdmin || confirmerParticipant?.isSuperAdmin,
        );

        if (!confirmerIsAdmin) {
          return msg.reply("Only a group admin can confirm this.");
        }

        pendingErasures.delete(chat.id._serialized);
        return performErase(chat, msg, pending.count);
      }

      if (lower === "me") {
        const contact = await msg.getContact();
        await msg.reply(contact);
      }

      if (lower.startsWith("spam ")) {
        if (msg.author != config.director) {
          msg.reply("waduh, sebaiknya jangan");
          return;
        }
        const spamMatch = lower.match(/^spam\s+(\d+)$/);

        if (spamMatch) {
          const amount = Number(spamMatch[1]);

          if (amount < 1 || amount > 100) {
            return msg.reply("Jumlah harus antara 1 dan 100.");
          }

          const quoted = await msg.getQuotedMessage();
          if (!quoted) return;

          if (quoted.type === "chat") {
            for (let i = 0; i < amount; i++) {
              await client.sendMessage(msg.from, quoted.body);
              await delay(200);
            }
          } else if (quoted.type === "sticker") {
            const media = await quoted.downloadMedia();

            for (let i = 0; i < amount; i++) {
              await client.sendMessage(msg.from, media, {
                sendMediaAsSticker: true,
              });
              await delay(200);
            }
          }
        }
      }

      if (lower === "sider") {
        state.isSiderActive = !state.isSiderActive;
        await msg.reply(`silent reader is ${state.isSiderActive ? "enabled" : "disabled"}`);
        return;
      }

      if (lower === "backup") {
        await msg.react("☁️");
        const started = await runMove();
        await msg.react("🌩️");
        return;
      }
    } catch (error) {
      console.error("Message handler error:", error);
    }
  }

  return {
    state,
    handleMessage,
    internalGroup: [config.groupPerennial, config.groupStirhytm],
  };
}
