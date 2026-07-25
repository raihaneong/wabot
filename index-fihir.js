import "dotenv/config";
import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { handleAI } from "./src/ai.js";

const { Client, LocalAuth, MessageMedia } = wwebjs;

const client = new Client({
  authStrategy: new LocalAuth({}),
  puppeteer: {
    // headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      //   "--disable-dev-shm-usage",
      //   "--disable-accelerated-2d-canvas",
      //   "--no-first-run",
      "--no-zygote",
      //   "--single-process",
      //   "--disable-gpu",
    ],
    // executablePath:
    // "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  },
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR code received, scan it with your WhatsApp app.");
});

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
});

const LIBRARY_PATH = "./audio_library";

if (!fs.existsSync(LIBRARY_PATH)) {
  fs.mkdirSync(LIBRARY_PATH, { recursive: true });
}

function sanitizeFileName(value) {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, " ")
      .trim()
      .slice(0, 120) || "audio"
  );
}

async function sendAudio(msg, videoId, title) {
  const safeTitle = sanitizeFileName(title);
  const filePath = path.resolve(LIBRARY_PATH, `${safeTitle}-${videoId}.mp3`);

  if (fs.existsSync(filePath)) {
    console.log("Serving from cache:", title);
    const media = MessageMedia.fromFilePath(filePath);
    return await msg.reply(media);
  }

  msg.react("👀");

  try {
    await new Promise((resolve, reject) => {
      const downloader = spawn("yt-dlp", [
        "-x",
        "--audio-format",
        "mp3",
        "-o",
        filePath,
        `https://youtu.be/${videoId}`,
      ]);

      let stderr = "";
      downloader.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      downloader.on("error", reject);
      downloader.on("close", (code) => {
        if (code === 0 || fs.existsSync(filePath)) {
          resolve();
          return;
        }

        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      });
    });

    if (!fs.existsSync(filePath)) {
      throw new Error("Downloaded file was not created.");
    }

    const media = MessageMedia.fromFilePath(filePath);
    await msg.reply(media);
  } catch (error) {
    console.error("Error downloading audio:", error);
    await msg.reply(`Error downloading audio: ${error.message}`);
  }
}

async function searchYouTube(query) {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      "yt-dlp",
      ["--get-title", "--get-id", "--max-downloads", "5", `ytsearch5:${query}`],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const results = [];
      for (let i = 0; i < lines.length; i += 2) {
        const title = lines[i];
        const id = lines[i + 1];

        if (title && id) {
          results.push({ title, id });
        }
      }

      if (results.length) {
        resolve(results);
        return;
      }

      if (stderr.trim()) {
        reject(new Error(stderr.trim()));
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

const searchCache = new Map();

client.on("message_create", async (msg) => {
  const message = msg.body?.trim() || "";
  const chatId = msg.from;

  try {
    if (message.toLowerCase().includes("fihir")) {
      await msg.reply("blah blah blah");
    }

    if (message.startsWith(".play")) {
      msg.react("👀");
      const query = message.slice(5).trim();

      if (!query) {
        await msg.reply("Usage: .play <song or artist>");
        return;
      }

      const results = await searchYouTube(query);

      if (!results.length) {
        await msg.reply(`No results found for "${query}".`);
        return;
      }

      let replyText = "Choose a number:\n";
      results.forEach((result, index) => {
        replyText += `${index + 1}. ${result.title}\n`;
      });

      const sentMsg = await msg.reply(replyText);
      searchCache.set(chatId, { results, originalMsg: sentMsg });
      return;
    }

    if (msg.hasQuotedMsg) {
      const quoted = await msg.getQuotedMessage();
      const cache = searchCache.get(chatId);

      if (cache && cache.originalMsg.id._serialized === quoted.id._serialized) {
        const index = Number.parseInt(message, 10) - 1;
        const selected = cache.results[index];

        if (!selected) {
          await msg.reply("Please choose a valid number from the list.");
          return;
        }

        searchCache.delete(chatId);
        await cache.originalMsg.edit(`🔊 Now playing: ${selected.title}`);
        await sendAudio(msg, selected.id, selected.title);
      }
    }
    if (message.startsWith(".ai")) {
      return handleAI(msg);
    }
  } catch (err) {
    const errorMessage = String(err?.message || "");
    const stack = String(err?.stack || "");
    console.log("Error in message_create event:", errorMessage, stack);
  }
});

client.setMaxListeners(60);

client.initialize();
