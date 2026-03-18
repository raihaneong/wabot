const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

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

// Listening to all incoming messages
client.on("message_create", (message) => {
  if (message.body === "!test") {
    // send back "pong" to the chat the message was sent in
    message.reply("udah aktif botnya, kenapa nich?");
  }
});

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

// listening incoming message from specific group
// with the purpose for turning images/videos into stickers
//

client.on("message", async (msg) => {
  const chat = await msg.getChat();

  const TARGET_GROUP_ID = "120363426915771477@g.us";

  // Allow personal chat OR the specific group
  const isPersonalChat = !chat.isGroup;
  const isTargetGroup = chat.isGroup && chat.id._serialized === TARGET_GROUP_ID;

  if (!isPersonalChat && !isTargetGroup) return;

  if (msg.body.toLowerCase() !== "!sticker") return;

  let targetMsg = msg;
  if (msg.hasQuotedMsg) {
    targetMsg = await msg.getQuotedMessage();
  }

  if (!targetMsg.hasMedia) {
    return msg.reply("reply video/gambarnya dulu, terus ketik !sticker");
  }

  const media = await targetMsg.downloadMedia();
  if (!media) return msg.reply("entah kenapa, enggak bisa. jadi yaudahlah");

  await msg.reply(media, null, {
    sendMediaAsSticker: true,
    stickerName: "sticker dari grup Sticker & Out-of-Topic",
    stickerAuthor: "Nika",
  });
});

// Start your client
client.initialize();
