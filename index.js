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

client.on("ready", () => {
  isReady = true;
  console.log("WhatsApp client is ready!");
  if (!isReady) return;
});

// the magic

client.on("message_create", async (msg) => {
  if (!isReady) return;
  try {
    // prevents the channelMetadata error: TypeError: Cannot read properties of undefined (reading 'description')
    let chat;
    try {
      chat = await msg.getChat();
    } catch (err) {
      // const message = String(err?.message || "");
      // const stack = String(err?.stack || "");
      // const knownChannelParseError =
      //   message.includes("channelMetadata") ||
      //   message.includes("description") ||
      //   stack.includes("Channel.js") ||
      //   stack.includes("ChatFactory.js");
      // if (knownChannelParseError) {
      //   return;
      // }
      throw err;
    }

    // spew out incoming message to the terminal
    // console.log("Received message:", msg.body);
    // generalGroupsLogger.info(`${chat.name} | ${user} | ${msg.body}`);

    //
    //
    // Test dev
    //
    //

    if (msg.body == "asdf") {
      await chat.sendMessage("listening...");
    }

    if (msg.body == "qwer") {
      msg.react("👀");
      const media = await MessageMedia.fromFilePath(
        "D:\\agl\\kani\\assets\\lullaby.mp3",
      );
      await client.sendMessage(msg.from, media);
    }
    if (msg.body == "qwer2") {
      msg.react("👀");
      const media = await MessageMedia.fromFilePath(
        "D:\\agl\\kani\\assets\\p76zdwx1u68h1.webp",
      );
      await client.sendMessage(msg.from, media, { caption: "ini caption" });
    }
    if (msg.body == "qwer3") {
      msg.react("👀");
      const media = await MessageMedia.fromFilePath(
        "D:\\agl\\kani\\assets\\cos_oguri.mp4",
      );
      await client.sendMessage(msg.from, media, { caption: "ini caption" });
    }

    if (msg.hasMedia) {
      if (msg.fromMe) return;
      const media2sticker = await msg.downloadMedia();
      try {
        await msg.reply(media2sticker, null, {
          sendMediaAsSticker: true,
          stickerName: "Sticker random",
          stickerAuthor: "Departemen Stira",
        });
      } catch (err) {
        console.error("Caption sticker error:", err);
        await msg.reply("gagal bikin stiker dengan caption, jadi yaudahlah");
      }
    }
  } catch (error) {
    console.error(error);
  }
});

client.setMaxListeners(60);

client.initialize();
