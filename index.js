import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { db } from "./src/utils/db.js";
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
  let chat = await msg.getChat();

  // spew out incoming message to the terminal
  // console.log("Received message:", msg.body);

  if (!chat.id) {
    console.log("Chat ID is undefined");
    return;
  }

  const isListening = db
    .prepare("SELECT id FROM listened_groups WHERE id = ?")
    .get(chat.id._serialized);
  console.log("Chat ID:", chat.id);
  console.log("Is listening:", isListening);

  if (!isListening) return;

  console.log("Received message:", msg.body);

  if (msg.body === "siapa?") {
    msg.reply(msg.author || msg.from);
  }
  if (msg.body === ".test") {
    msg.react("😼");
  }

  if (msg.body === "/flagged") {
    if (!chat.isGroup) return;

    db.prepare(
      "INSERT OR IGNORE INTO listened_groups (id, name) VALUES (?, ?)",
    ).run(chat.id._serialized, chat.name);

    msg.react("📍");
  }

  if (msg.body === "/unflagged") {
    if (!chat.isGroup) return;
    db.prepare("DELETE FROM listened_groups WHERE id = ?").run(
      chat.id._serialized,
    );
    msg.react("🤐");
  }

  if (msg.body === "/get chat") {
    msg.reply(JSON.stringify(chat, null, 2));
  }
  if (msg.body === "/get chat participants") {
    let participants = chat.participants || [];
    let userNumber = participants
      .map((p) => `${p.id.user} - ${p.name}`)
      .join("\n");
    msg.reply(userNumber);
  }
});

client.setMaxListeners(50);

client.initialize();
