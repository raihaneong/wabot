import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
// import { config } from "./config.js";

const { Client, LocalAuth, MessageMedia } = wwebjs;

const puppeteerConfig = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    // "--single-process",
    "--disable-gpu",
  ],
};

// if (config.isProd) {
//   puppeteerConfig.executablePath = "/usr/bin/chromium";
// }

const client = new wwebjs.Client({
  authStrategy: new wwebjs.LocalAuth(),
  puppeteer: puppeteerConfig,
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

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
});

client.on("message_create", async (msg) => {
  if (msg.body === "siapa?") {
    msg.reply(msg.author || msg.from);
  }
  if (msg.body === ".test") {
    msg.react("😼");
  }

  if (msg.body === "/get chat") {
    let chat = await msg.getChat();
    msg.reply(JSON.stringify(chat, null, 2));
  }
  if (msg.body === "/get chat participants") {
    let chat = await msg.getChat();
    let participants = chat.participants || [];
    let userNumber = participants
      .map((p) => `${p.id.user} - ${p.name}`)
      .join("\n");
    msg.reply(userNumber);
  }
});

client.setMaxListeners(50);

client.initialize();
