import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { config } from "./config.js";

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
    "--single-process",
    "--disable-gpu",
  ],
};

if (config.isProd) {
  puppeteerConfig.executablePath = "/usr/bin/chromium";
}

const client = new wwebjs.Client({
  authStrategy: new wwebjs.LocalAuth(),
  puppeteer: puppeteerConfig,
});

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR code received, scan it with your WhatsApp app.");
});

client.on("message_create", async (msg) => {
  if (msg.body === "siapa?") {
    msg.reply(msg.author || msg.from);
  }
  if (msg.body === ".test") {
    msg.react("😼");
  }
});

client.initialize();
