import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
// import { db } from "./src/db.js";
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

client.on("ready", () => {
  isReady = true;
  console.log("WhatsApp client is ready!");
});

// the magic

client.on("message_create", async (msg) => {
  if (!isReady) return;
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
      await client.sendMessage(msg.from,
        `asdf
        qwer
        qwer2
        qwer3
        gacha-sticker
        sticker on
        sticker off
        `
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

    if (msg.body == "asdf") {
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


    if (autoStickerEnabled && msg.hasMedia) {
      if (msg.fromMe) return;
      try {
        const media2sticker = await msg.downloadMedia();
        await client.sendMessage(msg.from, media2sticker, {
          sendMediaAsSticker: true,
        });
      } catch (err) {
        console.error("Caption sticker error:", err);
        await client.sendMessage(msg.from, "gagal bikin stiker dengan caption, jadi yaudahlah");
      }
    }
  } catch (error) {
    console.error("Message handler error:", error);
  }
});

client.setMaxListeners(60);

client.initialize();
