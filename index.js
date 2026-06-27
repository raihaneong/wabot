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
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
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

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
});

// the magic

client.on("message_create", async (msg) => {
  let contactInfo = await msg.getContact();
  let user = await contactInfo.name;
  let botId = await contactInfo.id._serialized;

  // prevents the channelMetadata error: TypeError: Cannot read properties of undefined (reading 'description')
  let chat;
  try {
    chat = await msg.getChat();
  } catch (err) {
    const message = String(err?.message || "");
    const stack = String(err?.stack || "");
    const knownChannelParseError =
      message.includes("channelMetadata") ||
      message.includes("description") ||
      stack.includes("Channel.js") ||
      stack.includes("ChatFactory.js");
    if (knownChannelParseError) {
      return;
    }
    throw err;
  }

  // spew out incoming message to the terminal
  // console.log("Received message:", msg.body);
  // generalGroupsLogger.info(`${chat.name} | ${user} | ${msg.body}`);

  if (!chat.id) {
    console.log("Chat ID is undefined");
    return;
  }

  if (msg.body === "/menu") {
    msg.reply(
      "/flagged\n/unflagged\n/identify\n/test\n/identify me all\n/identify contact me id\n/identify chat all\n/identify chat participants\n/mimicry [text]",
    );
  }

  if (msg.body === "/flaglist") {
    console.log("Fetching flagged groups from the database...");

    const flaggedGroups = db.prepare("SELECT *FROM listened_groups").all();
    msg.reply(JSON.stringify(flaggedGroups, null, 2));
  }

  if (msg.body === "/flagged") {
    if (!chat.isGroup) msg.reply("This is not a group");
    if (msg.from !== botId) msg.reply("you're unprivileged");

    db.prepare(
      "INSERT OR IGNORE INTO listened_groups (id, name) VALUES (?, ?)",
    ).run(chat.id._serialized, chat.name);

    listenedGroupsLogger.info(
      `Started listening to group: ${chat.name} (${chat.id._serialized})`,
    );
    return;
  }

  if (msg.body === "/unflagged") {
    if (!chat.isGroup) msg.reply("This is not a group");
    if (msg.from !== botId) msg.reply("you're unprivileged");

    db.prepare("DELETE FROM listened_groups WHERE id = ?").run(
      chat.id._serialized,
    );
    listenedGroupsLogger.info(
      `Stopped listening to group: ${chat.name} (${chat.id._serialized})`,
    );
    return;
  }

  if (msg.body === "Kani") {
    msg.reply("hadir");
    console.log(
      `Replied to message from ${chat.name} at ${new Date().toISOString()}.`,
    );
    // listenedGroupsLogger.info(`Replied to message from ${chat.name}.`);
  }

  if (msg.body === ".test") {
    msg.react("😼");
    // listenedGroupsLogger.info(`Reacted to message from ${chat.name}.`);
  }

  if (msg.body.startsWith("/mimicry ")) {
    let mimickedMessage = msg.body.split("/mimicry ")[1];
    chat.sendMessage(mimickedMessage);
    // listenedGroupsLogger.info(`Replied to message from ${chat.name}.`);
  }
  if (msg.body === "/copy") {
    const repliedMsg = await msg.getQuotedMessage();
    if (!repliedMsg) {
      msg.reply("Please reply to a message to copy it.");
      return;
    }
    if (msg.hasMedia) {
      const media = await msg.downloadMedia();
      const newMessage = new MessageMedia(
        media.mimetype,
        media.data,
        media.filename,
      );
      chat.sendMessage(newMessage, { caption: "Here's the copied media!" });
    } else {
      chat.sendMessage("No media found in the original message.");
    }
  }

  //
  //
  // identify
  //
  //

  if (msg.body === "/identify") {
    msg.reply(
      "/identify all\n/identify me\n/identify contact me id\n/identify chat all\n/identify chat participants\n/identify quoted\n/identify quoted all\n/identify quoted mimetype\n/identify quoted quoted\n/identify quoted quoted id",
    );
  }

  if (msg.body === "/identify me all") {
    msg.reply(JSON.stringify(contactInfo, null, 2));
  }

  if (msg.body === "/identify contact me id") {
    msg.reply(JSON.stringify(botId, null, 2));
  }

  if (msg.body === "/identify chat all") {
    msg.reply(JSON.stringify(chat, null, 2));
  }

  if (msg.body === "/identify chat participants") {
    let participants = chat.participants || [];
    let userNumber = participants
      .map((p) => `${p.id.user} - ${p.name}`)
      .join("\n");
    msg.reply(userNumber);
  }
  if (msg.body === "siapa?") {
    msg.reply(user);
    // listenedGroupsLogger.info(`Replied to ${chat.name} with sender info.`);
  }

  if (msg.body === "/identify quoted") {
    msg.reply("/identify quoted all\n/identify quoted mimetype");
  }

  if (msg.body === "/identify quoted all") {
    const quoted = await msg.getQuotedMessage();
    msg.reply(`${JSON.stringify(quoted, null, 2)}`);
  }

  if (msg.body === "/identify quoted mimetype") {
    const quoted = await msg.getQuotedMessage();
    try {
      msg.reply(`${quoted?.mimetype}`);
    } catch (err) {
      console.error("Error accessing mimetype of the quoted message:", err);
      msg.reply(err);
    }
  }

  if (msg.body === "/identify quoted quoted") {
    const quoted = await msg.getQuotedMessage();
    const quotedMsg = await quoted?._data;
    msg.reply(`${JSON.stringify(quotedMsg, null, 2)}`);
  }

  if (msg.body === "/identify quoted quoted id") {
    const quoted = await msg.getQuotedMessage();
    const quotedMsg = await quoted?._data;
    const quotedMsgid = await quotedMsg?.id;
    msg.reply(`${JSON.stringify(quotedMsgid, null, 2)}`);
  }

  //
  //
  // Test dev
  //
  //

  if (msg.body == "asdf") {
    await chat.sendMessage("listening...");
  }

  if (msg.body == "qwer") {
    const media = await MessageMedia.fromFilePath(
      "D:\\agl\\kani\\assets\\lullaby.mp3",
    );
    await client.sendMessage(msg.from, media);
  }
  if (msg.body == "qwer2") {
    const media = await MessageMedia.fromFilePath(
      "D:\\agl\\kani\\assets\\p76zdwx1u68h1.webp",
    );
    await client.sendMessage(msg.from, media, { caption: "ini caption" });
  }
  if (msg.body == "qwer3") {
    const media = await MessageMedia.fromFilePath(
      "D:\\agl\\kani\\assets\\cos_oguri.mp4",
    );
    await client.sendMessage(msg.from, media, { caption: "ini caption" });
  }

  if (msg.body == "pin") {
  }

  //
  if (msg.body === "/copy-sticker") {
    const repliedMsg = await msg.getQuotedMessage();
    if (!repliedMsg) {
      msg.reply("Please reply to a sticker message to copy it.");
      return;
    }
    if (!repliedMsg.hasMedia || !repliedMsg.mimetype("image/webp")) {
      msg.reply("Please reply to a sticker message to copy it.");
      return;
    }
    const media = await repliedMsg.downloadMedia();
    const newMessage = new MessageMedia(
      media.mimetype,
      media.data,
      media.filename,
    );
    chat.sendMessage(newMessage, { caption: "Here's the copied sticker!" });
  }

  // const isListening = db
  //   .prepare("SELECT id FROM listened_groups WHERE id = ?")
  //   .get(chat.id._serialized);

  // sacred line to prevent the bot from responding to messages in groups that are not flagged as listened
  // if (!isListening) return;

  // listenedGroupsLogger.info(`Message from ${chat.name}: ${msg.body}`);
});

client.setMaxListeners(60);

client.initialize();
