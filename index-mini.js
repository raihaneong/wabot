const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

// Create a new client instance
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log(logDate(), "Client is ready!");
});

// When the client received QR-Code
client.on("qr", (qr) => {
  console.log(logDate(), "QR RECEIVED", qr);
  qrcode.generate(qr, { small: true });
});

async function handleMessage(msg) {
  const lower = msg.body.toLowerCase();
  if (lower === ".sticker" || lower === ".s") {
    msg.react("⏳");
    let targetMsg = msg;
    if (msg.hasQuotedMsg) {
      targetMsg = await msg.getQuotedMessage();
    }

    if (!targetMsg.hasMedia) {
      return msg.reply("reply video/gambarnya dulu, terus ketik .sticker");
    }
    const media = await targetMsg.downloadMedia();
    msg.react("✅");
    await msg.reply(media, null, {
      sendMediaAsSticker: true,
      stickerName: "sticker random",
      stickerAuthor: "Departemen Stira",
    });
  }

  if (lower.startsWith(".menu")) {
    return msg.reply(`.menu, .test, .s`);
  }

  if (lower.startsWith(".test")) {
    return msg.react("😼");
  }
}

client.on("message", handleMessage);
client.on("message_create", (msg) => {
  if (!msg.fromMe) return;
  return handleMessage(msg);
});

client.initialize();
