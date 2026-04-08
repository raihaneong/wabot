const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

async function handleArchiveMedia(msg) {
  const remoteName = process.env.RCLONE_REMOTE || "drive-kashva:stira";
  console.log(
    `[ARCHIVE MEDIA] Request from ${msg.from} to remote: ${remoteName}`,
  );

  try {
    await msg.react("⏳");

    // Check for media: either in quoted message or current message
    let targetMsg = msg;
    if (msg.react("📩")) {
      targetMsg = await msg.getQuotedMessage();
    }

    if (!targetMsg.hasMedia) {
      await msg.react("❌");
      return msg.reply("cuma bisa arsip media, bukan teks bjir");
    }

    console.log("Downloading media...");
    const media = await targetMsg.downloadMedia();

    if (!media) {
      await msg.react("❌");
      return msg.reply("gagal download media");
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, "private");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate temp file path with timestamp
    const timestamp = Date.now();
    let tempFilePath;

    // Determine file extension based on MIME type
    if (media.mimetype.startsWith("image/")) {
      const ext = media.mimetype.split("/")[1];
      tempFilePath = path.join(tempDir, `arsip_img_${timestamp}.${ext}`);
    } else if (media.mimetype.startsWith("video/")) {
      tempFilePath = path.join(tempDir, `arsip_vid_${timestamp}.mp4`);
    } else if (media.mimetype.startsWith("audio/")) {
      const ext = media.mimetype.split("/")[1];
      tempFilePath = path.join(tempDir, `arsip_aud_${timestamp}.${ext}`);
    } else {
      // Fallback for other media types
      const ext = media.mimetype.split("/")[1] || "file";
      tempFilePath = path.join(tempDir, `arsip_${timestamp}.${ext}`);
    }

    // Write media to temp file
    console.log(`Writing media to temp file: ${tempFilePath}`);
    fs.writeFileSync(tempFilePath, Buffer.from(media.data, "base64"));

    // Use rclone copy to upload
    console.log(`Starting rclone copy to ${remoteName}...`);
    const rcloneCmd = `rclone copy "${tempFilePath}" "${remoteName}" -P`;
    console.log(`Executing: ${rcloneCmd}`);

    await execAsync(rcloneCmd);

    console.log("✅ Rclone copy completed successfully");
    await msg.react("✅");
    await msg.reply(`
        media berhasil diarsip
        
        arsip-stira: https://drive.google.com/drive/folders/1lwOuV-65hPamxvFSZvbhavetNA90f_7H?usp=sharing`);

    // Clean up temp file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log("Temp file cleaned up");
      }
    } catch (cleanupError) {
      console.error("Error cleaning up temp file:", cleanupError);
    }
  } catch (error) {
    console.error("Archive error:", error);
    await msg.react("❌");
    return msg.reply(
      `gagal arsip media: ${error.message || "error tidak diketahui"}`,
    );
  }
}

module.exports = {
  handleArchiveMedia,
};
