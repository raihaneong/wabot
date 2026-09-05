import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { sendGachaStickers, formatMsAsMinSecond } from "./sticker.js";
import { db } from "./db.js";
// import { listenedGroupsLogger, generalGroupsLogger } from "./src/logger.js";
// import { config } from "./config.js";

const { Client, LocalAuth, MessageMedia } = wwebjs;

const client = new Client({
  authStrategy: new LocalAuth({}),
  puppeteer: {
    // headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      //   "--disable-dev-shm-usage",
      //   "--disable-accelerated-2d-canvas",
      //   "--no-first-run",
      "--no-zygote",
      //   "--single-process",
      //   "--disable-gpu",
    ],
    // executablePath:
    // "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  },
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR code received, scan it with your WhatsApp app.");
});

client.on("disconnected", (reason) => {
  console.log("Client disconnected:", reason);
});

client.on("auth_failure", (msg) => {
  console.log("Auth failure:", msg);
});

let isReady = false;
let autoStickerEnabled = false;
let gachaSticker10CooldownUntil = 0;

client.on("ready", () => {
  isReady = true;
  console.log("WhatsApp client is ready!");
});

// the magic


const MAX_BUFFER = 200; // how many messages per chat we keep in memory
const chatBuffers = new Map(); // chatId -> array of Message objects, oldest -> newest
const pendingErasures = new Map(); // chatId -> { count, timestamp }

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


client.on("message_create", async (msg) => {
  if (!isReady) return;
  recordMessage(msg.from, msg);
  try {
    // spew out incoming message to the terminal
    // console.log("Received message:", msg.body);
    // generalGroupsLogger.info(`${chat.name} | ${user} | ${msg.body}`);

    //
    //
    // Test dev
    //
    //

    const lower = (msg.body || "").trim().toLowerCase();

    if (msg.body === "menu") {
      await client.sendMessage(
        msg.from,
        `asdf
        qwer
        qwer2
        qwer3
        gacha-sticker
        sticker on
        sticker off
        `,
      );
      return;
    }

    if (lower === "sticker on") {
      autoStickerEnabled = true;
      await client.sendMessage(msg.from, "Auto sticker enabled.");
      return;
    }

    if (lower === "sticker off") {
      autoStickerEnabled = false;
      await client.sendMessage(msg.from, "Auto sticker disabled.");
      return;
    }

    if (lower === "p") {
      await client.sendMessage(msg.from, "listening...");
      return;
    }

    if (msg.body === "qwer") {
      try {
        await msg.react("👀");
        const media = await MessageMedia.fromFilePath("./assets/lullaby.mp3");
        await client.sendMessage(msg.from, media);
      } catch (error) {
        console.error("Failed to send lullaby media:", error);
        await client.sendMessage(msg.from, "Gagal mengirim media.");
      }
      return;
    }

    if (msg.body === "qwer2") {
      try {
        await msg.react("👀");
        const media = await MessageMedia.fromFilePath(
          "./assets/p76zdwx1u68h1.webp",
        );
        await client.sendMessage(msg.from, media, { caption: "ini caption" });
      } catch (error) {
        console.error("Failed to send qwer2 media:", error);
        await client.sendMessage(msg.from, "Gagal mengirim media.");
      }
      return;
    }

    if (msg.body === "qwer3") {
      try {
        await msg.react("👀");
        const media = await MessageMedia.fromFilePath("./assets/cos_oguri.mp4");
        await client.sendMessage(msg.from, media, { caption: "ini caption" });
      } catch (error) {
        console.error("Failed to send qwer3 media:", error);
        await client.sendMessage(msg.from, "Gagal mengirim media.");
      }
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
      await sendGachaStickers(client, msg.from, 10);
      return;
    }

    // Gacha sticker 67 command (bot-only)
    if (lower === ".gacha-sticker-67") {
      // if (!msg.fromMe) {
      //   return msg.reply("cuma bowleh bot");
      // }
      await sendGachaStickers(client, msg.from, 67);
      return;
    }

    if (msg.body === ".gacha-sticker") {
      let amount = msg.body.split(" ")[1];
      if (!amount) amount = 1;
      await sendGachaStickers(client, msg.from, amount);
      return;
    }

    if (autoStickerEnabled && msg.hasMedia) {
      if (msg.fromMe) return;
      try {
        const media2sticker = await msg.downloadMedia();
        await client.sendMessage(msg.from, media2sticker, {
          sendMediaAsSticker: true,
        });
      } catch (err) {
        console.error("Caption sticker error:", err);
        await client.sendMessage(msg.from, err.message);
      }
    }

    if (msg.body === "db") {
      const groups = db.prepare("SELECT * FROM listened_groups").all();
      await client.sendMessage(
        msg.from,
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

    if (lower === "d") {
      const repliedMsg = await msg.getQuotedMessage();
      if (!repliedMsg) return;

      await Promise.all([repliedMsg.delete(true), msg.delete(true)]);
      return;
    }

    if (lower === "participants") {
      let chat = await msg.getChat();
      let participants = chat.groupMetadata.participants;
      msg.reply(participants.map((p) => p.id._serialized).join("\n"));
    }


  if (lower.startsWith("erase")) {
    const parts = lower.trim().split(/\s+/);
    const requestedCount = parseInt(parts[1], 10);

    if (!parts[1] || isNaN(requestedCount) || requestedCount < 1) {
      return msg.reply("Usage: erase [number], e.g. `erase 50`");
    }

    const botId = client.info?.wid?._serialized;
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
} catch (error) {
    console.error("Message handler error:", error);
  }
});

client.setMaxListeners(60);

client.initialize();
