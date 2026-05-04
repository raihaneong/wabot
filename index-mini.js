const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

function bareId(value) {
  return String(value || "").split("@")[0];
}

async function resolveSenderName(msg, fallbackId) {
  const dataName = msg?._data?.notifyName || msg?._data?.pushname;
  if (dataName) return dataName;
  try {
    const contact = await msg.getContact();
    return (
      contact?.pushname ||
      contact?.name ||
      contact?.number ||
      bareId(fallbackId)
    );
  } catch {
    return bareId(fallbackId);
  }
}

const logDate = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} -`;
};
const { Client } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth(),

  puppeteer: {
    executablePath: "/usr/bin/chromium-browser", // Adjust path
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
    try {
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
    } catch (error) {
      console.error("Sticker error:", error);
      await msg.react("❌");
      return msg.reply("gagal bikin stiker, coba lagi");
    }
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

client.on("group_join", async (notification) => {
  try {
    const chat = await notification.getChat();
    const newParticipantId = notification.recipientIds[0];
    const contact = await client.getContactById(newParticipantId);
    const name = contact.pushname || contact.name || bareId(newParticipantId);
    await chat.sendMessage(`halo ${name}, cari apa nich di sini`);
  } catch (error) {
    console.error("Group join error:", error);
  }
});

client.on("group_leave", async (notification) => {
  try {
    const chat = await notification.getChat();
    const leftParticipantId = notification.recipientIds[0];
    const contact = await client.getContactById(leftParticipantId);
    const name = contact.pushname || contact.name || bareId(leftParticipantId);
    await chat.sendMessage(`bro ${name} leave, dadah 👋`);
  } catch (error) {
    console.error("Group leave error:", error);
  }
});

client.initialize();
