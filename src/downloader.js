const { MessageMedia } = require("whatsapp-web.js");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

async function handleDownloadVideo(msg, url) {
  console.log(`[DOWNLOAD VIDEO] Request from ${msg.from} for URL: ${url}`);
  try {
    await msg.react("⏳");

    const tempDir = path.join(__dirname, "..", "tmp");
    const timestamp = Date.now();
    const outputPattern = path.join(tempDir, `wabot_video_${timestamp}`);

    try {
      console.log(`Starting yt-dlp download for: ${url}`);
      // Force MP4 format with 720p resolution for WhatsApp compatibility
      await execAsync(
        `yt-dlp -f "best[ext=mp4]" -S "res:720" --cookies-from-browser firefox:k6urnm7e.default-release-1765937955021 -o "${outputPattern}.%(ext)s" "${url}"`,
      );
      console.log("yt-dlp MP4 command completed successfully");

      // Find the downloaded file
      const files = fs.readdirSync(tempDir);
      const downloadedFile = files.find((file) =>
        file.startsWith(`wabot_video_${timestamp}`),
      );

      if (!downloadedFile) {
        console.log("Available files in tmp/:", files);
        await msg.react("❌");
        return msg.reply("file download enggak ketemu");
      }

      const filePath = path.join(tempDir, downloadedFile);
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      console.log(
        `Downloaded file: ${downloadedFile}, Size: ${fileSizeInMB.toFixed(2)} MB`,
      );

      if (fileSizeInMB > 100) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await msg.react("⚠️");
        return msg.reply("file terlalu besar (>100MB), gak bisa dikirim");
      }

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(downloadedFile).toLowerCase();
        const mimeType =
          ext === ".mp4"
            ? "video/mp4"
            : ext === ".webm"
              ? "video/webm"
              : "video/mp4";
        const media = new MessageMedia(
          mimeType,
          fileBuffer.toString("base64"),
          downloadedFile,
        );
        await msg.react("✅");
        await msg.reply(media);
        console.log("Media sent successfully");
      } catch (sendError) {
        console.error("Error sending media:", sendError);
        console.error(
          "File details - Path:",
          filePath,
          "Exists:",
          fs.existsSync(filePath),
          "Size:",
          fileSizeInMB,
        );
        await msg.react("❌");
        return msg.reply("gagal kirim media, tapi file sudah didownload");
      }

      // Delete the temp file after sending
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Temp file cleaned up");
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError);
      }
    } catch (error) {
      console.error("Download error:", error);
      await msg.react("❌");
      return msg.reply(
        "gagal download video. coba link lain atau cek formatnya",
      );
    }
  } catch (err) {
    console.error("Download command error:", err);
    await msg.react("❌");
  }
}

async function handleDownloadAudio(msg, url) {
  console.log(`[DOWNLOAD AUDIO] Request from ${msg.from} for URL: ${url}`);
  try {
    await msg.react("⏳");

    const tempDir = path.join(__dirname, "..", "tmp");
    const timestamp = Date.now();
    const outputPattern = path.join(tempDir, `wabot_audio_${timestamp}`);

    try {
      console.log(`Starting yt-dlp audio download for: ${url}`);
      await execAsync(
        `yt-dlp -x --audio-format mp3 --cookies-from-browser firefox:k6urnm7e.default-release-1765937955021 -o "${outputPattern}.%(ext)s" "${url}"`,
        { maxBuffer: 10 * 1024 * 1024 },
      );
      console.log("yt-dlp audio command completed successfully");

      // Find the downloaded file
      const files = fs.readdirSync(tempDir);
      const downloadedFile = files.find((file) =>
        file.startsWith(`wabot_audio_${timestamp}`),
      );

      if (!downloadedFile) {
        console.log("Available files in tmp/:", files);
        await msg.react("❌");
        return msg.reply("file download enggak ketemu");
      }

      const filePath = path.join(tempDir, downloadedFile);
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      console.log(
        `Downloaded audio file: ${downloadedFile}, Size: ${fileSizeInMB.toFixed(2)} MB`,
      );

      if (fileSizeInMB > 16) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await msg.react("⚠️");
        return msg.reply(
          "file terlalu besar (>16MB), gak bisa dikirim di grup WhatsApp",
        );
      }

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const media = new MessageMedia(
          "audio/mpeg",
          fileBuffer.toString("base64"),
          downloadedFile,
        );
        await msg.react("✅");
        await msg.reply(media);
        console.log("Audio media sent successfully");
      } catch (sendError) {
        console.error("Error sending audio media:", sendError);
        console.error(
          "File details - Path:",
          filePath,
          "Exists:",
          fs.existsSync(filePath),
          "Size:",
          fileSizeInMB,
        );
        await msg.react("❌");
        return msg.reply("gagal kirim audio, tapi file sudah didownload");
      }

      // Delete the temp file after sending
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Temp audio file cleaned up");
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temp audio file:", cleanupError);
      }
    } catch (error) {
      console.error("Download audio error:", error);
      await msg.react("❌");
      return msg.reply("gagal download audio. coba link lain");
    }
  } catch (err) {
    console.error("Download audio command error:", err);
    await msg.react("❌");
  }
}

module.exports = {
  handleDownloadVideo,
  handleDownloadAudio,
};
