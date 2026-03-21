require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const { OpenRouter } = require("@openrouter/sdk"); // named export, not default
const qrcode = require("qrcode-terminal");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

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

function getMaxCharsPerLine(fontSize = 80, stickerWidth = 512, padding = 40) {
  // Rough heuristic: average character width ≈ 0.6 × font size.
  const charWidth = fontSize * 0.6;
  return Math.max(1, Math.floor((stickerWidth - padding) / charWidth));
}

function wrapCaption(text, maxCharsPerLine = 12, maxLines = 2) {
  const words = text.trim().split(/\s+/).slice(0, 5);

  // Split overly long words into chunks so they don't overflow the sticker edge.
  const tokens = [];
  for (const word of words) {
    if (word.length <= maxCharsPerLine) {
      tokens.push(word);
    } else {
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        tokens.push(word.slice(i, i + maxCharsPerLine));
      }
    }
  }

  const lines = [];
  let line = "";

  for (const token of tokens) {
    const candidate = line ? `${line} ${token}` : token;

    if (candidate.length > maxCharsPerLine && line) {
      lines.push(line);
      line = token;
      if (lines.length >= maxLines) break;
    } else {
      line = candidate;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  return lines;
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

// helper functions to add caption to image/video for sticker creation
function escapeFfmpegDrawtext(text) {
  // Escape chars that can break ffmpeg filter parsing.
  return text.replace(/'/g, "\\'").replace(/:/g, "\\:");
}

function isEmojiOnly(text) {
  // Check if the text contains only emoji and whitespace (no letters/numbers).
  const emojisOnly = /^[\p{Emoji}\s]*$/u.test(text.trim());
  return emojisOnly && text.trim().length > 0;
}

async function addCaptionToImage(mediaData, captionText, fontSize = 80) {
  const maxChars = getMaxCharsPerLine(fontSize);
  const lines = wrapCaption(captionText, maxChars, 2);
  const lineHeight = Math.round(fontSize * 1.1);
  const yStart = 512 - 30 - (lines.length - 1) * lineHeight;

  const hasStroke = !isEmojiOnly(captionText);
  const strokeWidth = hasStroke ? "3" : "0";

  const tspans = lines
    .map(
      (line, idx) =>
        `<tspan x="50%" dy="${idx === 0 ? 0 : lineHeight}">${line}</tspan>`,
    )
    .join("");

  const svg = `
        <svg width="512" height="512">
            ${hasStroke ? '<defs><filter id="textStroke"><feMorphology operator="dilate" radius="3" /></filter></defs>' : ""}
            <text
                x="50%"
                y="${yStart}"
                font-size="${fontSize}"
                font-family="Arial"
                fill="white"
                text-anchor="middle"
                font-weight="bold"
                ${hasStroke ? 'stroke="black" stroke-width="' + strokeWidth + '"' : ""}
            >${tspans}</text>
        </svg>`;

  const outputBuffer = await sharp(Buffer.from(mediaData, "base64"))
    .resize(512, 512, { fit: "cover" })
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .webp()
    .toBuffer();

  return outputBuffer.toString("base64");
}

async function createWebpStickerFromMedia(mediaData, mimeType, captionText) {
  const fontSize = 80;
  const maxChars = getMaxCharsPerLine(fontSize);
  const lines = wrapCaption(captionText, maxChars, 2);
  const lineHeight = fontSize + 10;
  const yStart = 512 - 20 - (lines.length - 1) * lineHeight;
  const rawText = lines.join("\\n");
  const drawText = escapeFfmpegDrawtext(rawText);
  const hasStroke = !isEmojiOnly(captionText);
  const strokeParams = hasStroke ? ":bordercolor=black:borderw=3" : "";

  // For images, we can do this faster/stabler via sharp + SVG.
  if (mimeType.startsWith("image/")) {
    return addCaptionToImage(mediaData, captionText, fontSize);
  }

  const ext = mimeType === "image/gif" ? "gif" : "mp4";
  const tempInput = path.join(__dirname, `temp_input.${ext}`);
  const tempOutput = path.join(__dirname, "temp_output.webp");

  fs.writeFileSync(tempInput, Buffer.from(mediaData, "base64"));

  await new Promise((resolve, reject) => {
    const proc = ffmpeg(tempInput);

    proc
      .videoFilters([
        "scale=512:512:force_original_aspect_ratio=decrease",
        "pad=512:512:(ow-iw)/2:(oh-ih)/2",
        `drawtext=text='${drawText}':fontfile='C\\:/Windows/Fonts/arial.ttf':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=${yStart}${strokeParams}`,
        "fps=15",
      ])
      .duration(3)
      .outputOptions([
        "-vcodec",
        "libwebp",
        "-loop",
        "0",
        "-an",
        "-lossless",
        "0",
        "-qscale",
        "50",
        "-preset",
        "default",
        "-r",
        "15",
      ])
      .output(tempOutput)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const outputBuffer = fs.readFileSync(tempOutput);
  const base64 = outputBuffer.toString("base64");

  // cleanup all temp files
  fs.unlinkSync(tempInput);
  fs.unlinkSync(tempOutput);

  return base64;
}

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
                  "answer in indonesian language, don't exceed 100 tokens, be yandere and quixotic, if you don't know the answer, just say 'maaf yaa, aku engga tau itu, kasih tau aku dong jawabannya, biar aku bisa belajar dan jawab lain kali hehe'",
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
        await msg.reply("AI nya lagi nyari inspirasi. entar lagi dah banh");
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
  if (lower === "!sticker") {
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

  //sticker with caption
  if (lower.startsWith("!sticker-caption")) {
    const caption = msg.body.slice(16).trim();

    if (!caption) {
      return msg.reply("tulis captionnya. !sticker-caption hello world");
    }

    let targetMsg = msg;
    if (msg.hasQuotedMsg) {
      targetMsg = await msg.getQuotedMessage();
    }

    if (!targetMsg.hasMedia) {
      return msg.reply(
        "direply dulu video/gambarnya, terus ketik !sticker-caption captionnya",
      );
    }

    const media = await targetMsg.downloadMedia();
    if (!media) return msg.reply("entah kenapa, enggak bisa. jadi yaudahlah");

    const isImage = media.mimetype.startsWith("image/");
    const isVideo = media.mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      return msg.reply("stiker mah cuma bisa gambar/video doang bjir");
    }

    try {
      let captionedBase64;
      let mimeType;

      captionedBase64 = await createWebpStickerFromMedia(
        media.data,
        media.mimetype,
        caption,
      );
      mimeType = "image/webp";

      const captionedMedia = new MessageMedia(
        mimeType,
        captionedBase64,
        "sticker",
      );

      await msg.reply(captionedMedia, null, {
        sendMediaAsSticker: true,
        stickerName: "Sticker random",
        stickerAuthor: "Departemen Stira",
      });
    } catch (err) {
      console.error("Caption sticker error:", err);
      await msg.reply("gagal bikin stiker dengan caption, jadi yaudahlah");
    }
  }
}

// Listen to messages you send (message_create fires on all messages)
client.on("message_create", handleMessage);

// const { registerTTSHandler } = require("./tts");
// inside client.on("ready", ...) :
// registerTTSHandler(client);

// test
// client.on("message_create", registerTTSHandler(client));

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
