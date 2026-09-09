import wwebjs from "whatsapp-web.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import config from "../config/config.json" with { type: "json" }  ;

dotenv.config();

async function sendGachaStickers(client, chatId, limit) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("Sticker amount must be a number between 1 and 100.");
  }

  const stickersDir = config.stickerFolder;
  if (!stickersDir) {
    throw new Error("STICKER_FOLDER configuration is not set.");
  }

  const files = fs.readdirSync(stickersDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".webp", ".png", ".jpg", ".jpeg", ".gif"].includes(ext);
  });
  if (files.length === 0) {
    await client.sendMessage(chatId, "folder stickers kosong");
    return;
  }

  const numToSend = Math.min(limit, files.length);
  const shuffled = [...files].sort(() => 0.5 - Math.random());
  const selectedFiles = shuffled.slice(0, numToSend);
  for (const file of selectedFiles) {
    const filePath = path.join(stickersDir, file);
    console.log(`[GACHA STICKER] Sending file: ${file}`);
    const media = wwebjs.MessageMedia.fromFilePath(filePath);
    await client.sendMessage(chatId, media, {
      sendMediaAsSticker: true,
      stickerName: "Gacha Sticker",
      stickerAuthor: "Departemen Stira",
    });
  }
}

function formatMsAsMinSecond(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${hours} jam ${minutes} menit ${seconds} detik`;
}

export {
  sendGachaStickers,
  formatMsAsMinSecond,
};
