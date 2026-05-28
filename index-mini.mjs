import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth, MessageMedia } = wwebjs;

const client = new wwebjs.Client({
  authStrategy: new wwebjs.LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
    executablePath: "/usr/bin/chromium",
  },
});

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR code received, scan it with your WhatsApp app.");
});

client.on("message", (msg) => {
  if (!msg.fromMe) return;
});

client.on("message_create", async (msg) => {
  if (msg.body === "!ping") {
    msg.reply("pong");
  }
  if (msg.body === ".s") {
    const media = await msg.downloadMedia();
    const stickerMedia = new MessageMedia(
      media.mimetype,
      media.data,
      "sticker.webp",
    );
    await msg.reply(stickerMedia, null, {
      sendMediaAsSticker: true,
      stickerName: "Sticker punya entahlah yaa",
      stickerAuthor: "Departemen Stira",
    });
  }
  if (msg.body === "siapa?") {
    msg.reply(msg.author || msg.from);
  }
});

client.initialize();
