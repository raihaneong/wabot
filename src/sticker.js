const { MessageMedia } = require("whatsapp-web.js");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

async function sendGachaStickers(chat, limit) {
  const stickersDir = "D:/mv/2/tmc/whatsapp dual stickers";
  if (!fs.existsSync(stickersDir)) {
    await chat.sendMessage("folder stickers enggak ada");
    return;
  }

  const files = fs.readdirSync(stickersDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".webp", ".png", ".jpg", ".jpeg", ".gif"].includes(ext);
  });
  if (files.length === 0) {
    await chat.sendMessage("folder stickers kosong");
    return;
  }

  const numToSend = Math.min(limit, files.length);
  const shuffled = [...files].sort(() => 0.5 - Math.random());
  const selectedFiles = shuffled.slice(0, numToSend);
  for (const file of selectedFiles) {
    const filePath = path.join(stickersDir, file);
    const media = MessageMedia.fromFilePath(filePath);
    await chat.sendMessage(media, {
      sendMediaAsSticker: true,
      stickerName: "Gacha Sticker",
      stickerAuthor: "Departemen Stira",
    });
  }
}

function getMaxCharsPerLine(fontSize = 80, stickerWidth = 512, padding = 20) {
  const charWidth = fontSize * 0.6;
  return Math.max(1, Math.floor((stickerWidth - padding) / charWidth));
}

function wrapCaption(text, maxCharsPerLine = 12, maxLines = 2) {
  const words = text.trim().split(/\s+/).slice(0, 5);
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
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function escapeFfmpegDrawtext(text) {
  return text.replace(/'/g, "\\'").replace(/:/g, "\\:");
}

function isEmojiOnly(text) {
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
      <text
        x="50%"
        y="${yStart}"
        font-size="${fontSize}"
        font-family="Arial"
        fill="white"
        text-anchor="middle"
        font-weight="bold"
        ${hasStroke ? `stroke="black" stroke-width="${strokeWidth}"` : ""}
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
  const fontSize = 60;
  const maxChars = getMaxCharsPerLine(fontSize);
  const lines = wrapCaption(captionText, maxChars, 2);
  const lineHeight = fontSize + 10;
  const yStart = 512 - 50 - (lines.length - 1) * lineHeight;
  const rawText = lines.join("\n");
  const drawText = escapeFfmpegDrawtext(rawText);
  const hasStroke = !isEmojiOnly(captionText);
  const strokeParams = hasStroke ? ":bordercolor=black:borderw=3" : "";
  const fontFile = isEmojiOnly(captionText)
    ? "C\\:/Windows/Fonts/seguiemj.ttf"
    : "C\\:/Windows/Fonts/arial.ttf";

  if (mimeType.startsWith("image/")) {
    return addCaptionToImage(mediaData, captionText, fontSize);
  }

  const ext = mimeType === "image/gif" ? "gif" : "mp4";
  const tempInput = path.join(__dirname, `temp_input.${ext}`);
  const tempOutput = path.join(__dirname, "temp_output.webp");
  fs.writeFileSync(tempInput, Buffer.from(mediaData, "base64"));

  await new Promise((resolve, reject) => {
    ffmpeg(tempInput)
      .videoFilters([
        "scale=512:512:force_original_aspect_ratio=decrease",
        "pad=512:512:(ow-iw)/2:(oh-ih)/2",
        `drawtext=text='${drawText}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=${yStart}${strokeParams}`,
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
  fs.unlinkSync(tempInput);
  fs.unlinkSync(tempOutput);
  return outputBuffer.toString("base64");
}

async function handleStickerCaption(msg, commandPrefix = ".sticker-caption") {
  const caption = msg.body.slice(commandPrefix.length).trim();
  if (!caption) return msg.reply(`tulis captionnya. ${commandPrefix} hello world`);

  let targetMsg = msg;
  if (msg.hasQuotedMsg) targetMsg = await msg.getQuotedMessage();
  if (!targetMsg.hasMedia) {
    return msg.reply("direply dulu video/gambarnya, terus ketik .sticker-caption");
  }

  const media = await targetMsg.downloadMedia();
  if (!media) return msg.reply("entah kenapa, enggak bisa. jadi yaudahlah");
  const isImage = media.mimetype.startsWith("image/");
  const isVideo = media.mimetype.startsWith("video/");
  if (!isImage && !isVideo) return msg.reply("stiker mah cuma bisa gambar/video doang bjir");

  try {
    const captionedBase64 = await createWebpStickerFromMedia(
      media.data,
      media.mimetype,
      caption,
    );
    const captionedMedia = new MessageMedia("image/webp", captionedBase64, "sticker");
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

function formatMsAsMinSecond(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} menit ${seconds} detik`;
}

module.exports = {
  addCaptionToImage,
  sendGachaStickers,
  formatMsAsMinSecond,
  handleStickerCaption,
};
