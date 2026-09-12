import wwebjs from "whatsapp-web.js";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const { MessageMedia } = wwebjs;
const LIBRARY_PATH = "./audio_library";
const searchCache = new Map();
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".ogg", ".opus"]);

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


async function sendAudio(msg, videoId, title, channel) {
  const safeTitle = sanitizeFileName(title);
  const filePath = path.resolve(LIBRARY_PATH, `${safeTitle}-${channel}-${videoId}.mp3`);

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
        "-S",
        "abr:128",
        "-f", "bestaudio[filesize<15M]",
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

function getLibraryFiles() {
  return fs
    .readdirSync(LIBRARY_PATH, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function sendLibraryAudio(msg, fileName) {
  const filePath = path.resolve(LIBRARY_PATH, fileName);

  if (!fs.existsSync(filePath)) {
    await msg.reply("That audio file is no longer available.");
    return false;
  }

  try {
    await msg.reply(MessageMedia.fromFilePath(filePath));
    return true;
  } catch (error) {
    console.error("Error sending library audio:", error);
    await msg.reply(`Error sending audio: ${error.message}`);
    return false;
  }
}

async function deleteLibraryAudio(msg, fileName) {
  const filePath = path.resolve(LIBRARY_PATH, fileName);

  if (
    path.dirname(filePath) !== path.resolve(LIBRARY_PATH) ||
    !AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase())
  ) {
    await msg.reply("That is not a valid library audio file.");
    return false;
  }

  if (!fs.existsSync(filePath)) {
    await msg.reply("That audio file is no longer available.");
    return false;
  }

  try {
    await fs.promises.unlink(filePath);
    await msg.reply(`Deleted: ${path.parse(fileName).name}`);
    return true;
  } catch (error) {
    console.error("Error deleting library audio:", error);
    await msg.reply(`Error deleting audio: ${error.message}`);
    return false;
  }
}

async function searchYouTube(query) {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      "yt-dlp",
      [
        "--print",
        "%(title)s\n%(channel)s\n%(duration_string)s\n%(id)s",
        "--encoding",
        "UTF-8",
        "--max-downloads",
        "5",
        `ytsearch5:${query}`,
      ],
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
      for (let i = 0; i < lines.length; i += 4) {
        const title = lines[i];
        const channel = lines[i + 1];
        const duration = lines[i + 2];
        const id = lines[i + 3];

        if (title && id) {
          results.push({ title, channel, duration, id });
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

export async function handlePlay(msg) {
  const message = msg.body?.trim() || "";
  const chatId = msg.from;

  const libraryCommand = message.toUpperCase();
  if (libraryCommand === "MM" || libraryCommand === "MD") {
    const files = getLibraryFiles();

    if (!files.length) {
      await msg.reply("The audio library is empty.");
      return true;
    }

    const sentMsg = await msg.reply(
      `${libraryCommand === "MD" ? "Audio library (delete after sending)" : "Audio library"}:\n${files
        .map((fileName, index) => `${index + 1}. ${path.parse(fileName).name}`)
        .join("\n")}\n\nReply with a number to receive the audio.`,
    );
    searchCache.set(chatId, {
      type: libraryCommand === "MD" ? "delete-library" : "library",
      files,
      originalMsg: sentMsg,
    });
    return true;
  }

  if (message.startsWith("M ") || message === ".play") {
    msg.react("👀");
    const query = message.slice(1).trim();

    if (!query) {
      await msg.reply("Usage: M <song or channel>");
      return true;
    }

    const results = await searchYouTube(query);

    if (!results.length) {
      await msg.reply(`No results found for "${query}".`);
      return true;
    }

    let replyText = "Choose a number:\n";
    results.forEach((result, index) => {
      replyText += `${index + 1}. ${result.title} - ${result.channel} - ${result.duration}\n`;
    });

    const sentMsg = await msg.reply(replyText);
    searchCache.set(chatId, { type: "search", results, originalMsg: sentMsg });
    return true;
  }

  if (msg.hasQuotedMsg || /^\d+$/.test(message)) {
    const cache = searchCache.get(chatId);
    const quoted = msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;
    const isMatchingLibrarySelection =
      (cache?.type === "library" || cache?.type === "delete-library") &&
      !msg.hasQuotedMsg;
    const isMatchingQuotedSelection =
      quoted && cache?.originalMsg.id._serialized === quoted.id._serialized;

    if (cache && (isMatchingLibrarySelection || isMatchingQuotedSelection)) {
      const index = Number.parseInt(message, 10) - 1;
      const selected = cache.type === "library" || cache.type === "delete-library"
        ? cache.files[index]
        : cache.results[index];

      if (!selected) {
        await msg.reply("Please choose a valid number from the list.");
        return true;
      }

      searchCache.delete(chatId);
      if (cache.type === "library" || cache.type === "delete-library") {
        if (cache.type === "delete-library") {
          await cache.originalMsg.edit(`🗑️ Deleting: ${path.parse(selected).name}`);
          await deleteLibraryAudio(msg, selected);
        } else {
          await cache.originalMsg.edit(`🔊 Sending: ${path.parse(selected).name}`);
          await sendLibraryAudio(msg, selected);
        }
      } else {
        await cache.originalMsg.edit(`🔊 Now playing: ${selected.title}`);
        await sendAudio(msg, selected.id, selected.title, selected.channel);
      }
      return true;
    }
  }

  return false;
}