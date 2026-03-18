require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const { OpenRouter } = require("@openrouter/sdk"); // named export, not default
const qrcode = require("qrcode-terminal");

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "none";
const OPENROUTER_TIMEOUT_MS =
Number(process.env.OPENROUTER_TIMEOUT_MS) || 30_000;

const openrouter = new OpenRouter({
apiKey: process.env.OPENROUTER_API_KEY,
});

if (!process.env.OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OpenRouter timeout")), ms),
    ),
  ]);
}

// Create a new client instance
const client = new Client({
  authStrategy: new LocalAuth(),
});

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log("Client is ready!");
});

// When the client received QR-Code
client.on("qr", (qr) => {
  console.log("QR RECEIVED", qr);
  qrcode.generate(qr, { small: true });
});

// Handle all messages including your own
async function handleMessage(msg) {
  const chat = await msg.getChat();
  const body = (msg.body || "").trim();
  const lower = body.toLowerCase();

  // Simple ping command
  if (lower === "!test") {
    return msg.reply("udah aktif botnya, kenapa nich?");
  }

  // AI command (any chat)
  if (lower.startsWith("!ai")) {
    console.log("AI handler triggered");

    const prompt = body.slice(3).trim();
    console.log("Prompt:", prompt);

    if (!prompt) {
      return msg.reply("kata AI: lu mau nanya apa bjir");
    }

    await chat.sendStateTyping();

    try {
      console.log("Calling OpenRouter (model:", OPENROUTER_MODEL, ")...");
      const response = await withTimeout(
        openrouter.chat.send({
          chatGenerationParams: {
            model: OPENROUTER_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "answer in indonesian language and don't exceed 100 tokens",
              },
              { role: "user", content: prompt },
            ],
          },
        }),
        OPENROUTER_TIMEOUT_MS,
      );

      console.log("Response:", JSON.stringify(response, null, 2));
      const reply = response.choices?.[0]?.message?.content;
      await msg.reply(reply ?? "kata AI: entahlah banh");
    } catch (err) {
      console.error("OpenRouter error:", err);
      if (err?.message?.includes("timeout")) {
        await msg.reply("OpenRouter request timed out. Try again in a moment.");
      } else {
        await msg.reply("AI nya lagi ngantuk, entar lagi deh yaa");
      }
    }

    return;
  }

  // Sticker command (only in personal chat or configured group)
  const TARGET_GROUP_ID = "120363426915771477@g.us";
  const isPersonalChat = !chat.isGroup;
  const isTargetGroup = chat.isGroup && chat.id._serialized === TARGET_GROUP_ID;

  if (!isPersonalChat && !isTargetGroup) return;
  if (lower !== "!sticker") return;

  console.log(
    "Sticker command triggered from:",
    msg.fromMe ? "yourself" : msg.author || msg.from,
  );

  let targetMsg = msg;
  if (msg.hasQuotedMsg) {
    targetMsg = await msg.getQuotedMessage();
  }

  if (!targetMsg.hasMedia) {
    return msg.reply("reply video/gambarnya dulu, terus ketik !sticker");
  }

  console.log("Downloading media for sticker...");
  const media = await targetMsg.downloadMedia();
  if (!media) return msg.reply("entah kenapa, enggak bisa. jadi yaudahlah");

  console.log("Sticker media downloaded, sending...");
  await msg.reply(media, null, {
    sendMediaAsSticker: true,
    stickerName: "sticker random",
    stickerAuthor: "Departemen Stira",
  });
  console.log("✅ Sticker created and sent successfully");
}

// Listen to messages you send (message_create fires on all messages)
client.on("message_create", handleMessage);

// Start your client
client.initialize();

// listening to all incoming messages
// client.on("message", async (msg) => {
//   const chat = await msg.getChat();
//   if (chat.isGroup) {
//     console.log("Name:", chat.name);
//     console.log("ID:", chat.id._serialized);
//   }
// });

// List all groups the bot is a part of and print their names and IDs
// client.on("ready", async () => {
//   const chats = await client.getChats();
//   const groups = chats.filter((c) => c.isGroup);

//   groups.forEach((g) => {
//     console.log(`${g.name} => ${g.id._serialized}`);
//   });
// });
