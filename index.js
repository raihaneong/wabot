import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { db } from "./src/utils/db.js";
import {
  listenedGroupsLogger,
  generalGroupsLogger,
} from "./src/utils/logger.js";
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
  let contactInfo = await msg.getContact();
  let user = contactInfo.name;

  // spew out incoming message to the terminal
  // console.log("Received message:", msg.body);
  generalGroupsLogger.info(`${chat.name} | ${user} | ${msg.body}`);

  if (!chat.id) {
    console.log("Chat ID is undefined");
    return;
  }

  if (msg.body === "/flagged") {
    if (!chat.isGroup) return;
    if (!chat.fromMe) return;

    db.prepare(
      "INSERT OR IGNORE INTO listened_groups (id, name) VALUES (?, ?)",
    ).run(chat.id._serialized, chat.name);

    msg.react("📍");
    listenedGroupsLogger.info(
      `Started listening to group: ${chat.name} (${chat.id._serialized})`,
    );
    return;
  }

  if (msg.body === "/unflagged") {
    if (!chat.isGroup) return;
    if (!chat.fromMe) return;

    db.prepare("DELETE FROM listened_groups WHERE id = ?").run(
      chat.id._serialized,
    );
    msg.react("🤐");
    listenedGroupsLogger.info(
      `Stopped listening to group: ${chat.name} (${chat.id._serialized})`,
    );
    return;
  }

  if (msg.body === "/get contact") {
    let contact = await msg.getContact();
    msg.reply(JSON.stringify(contact, null, 2));
  }

  const isListening = db
    .prepare("SELECT id FROM listened_groups WHERE id = ?")
    .get(chat.id._serialized);

  // sacred line to prevent the bot from responding to messages in groups that are not flagged as listened
  if (!isListening) return;

  listenedGroupsLogger.info(`Message from ${chat.name}: ${msg.body}`);

  if (msg.body === "siapa?") {
    msg.reply(user);
    listenedGroupsLogger.info(`Replied to ${chat.name} with sender info.`);
  }
  if (msg.body === ".test") {
    msg.react("😼");
    listenedGroupsLogger.info(`Reacted to message from ${chat.name}.`);
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
