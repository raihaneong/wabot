/**
 * WhatsApp TTS Bot — ElevenLabs Voice Clone
 * Drop this into your whatsapp-web.js project.
 *
 * Usage in chat:
 *   !speak Hello, this is my cloned voice!
 *
 * Setup:
 *   1. Run `node setup-voice.js <path-to-sample.mp3>` once to clone your voice
 *   2. Copy the printed ELEVENLABS_VOICE_ID into your .env
 *   3. Require this file in your main bot entry point
 */

const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ─── Config ────────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const KEYWORD = process.env.TTS_KEYWORD || "!ngomong";
const TMP_DIR = path.join(__dirname, ".tts_tmp");

if (!ELEVENLABS_API_KEY) throw new Error("Missing ELEVENLABS_API_KEY in .env");
if (!ELEVENLABS_VOICE_ID)
  throw new Error(
    "Missing ELEVENLABS_VOICE_ID in .env — run setup-voice.js first",
  );

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// ─── TTS Core ───────────────────────────────────────────────────────────────

/**
 * Calls ElevenLabs TTS API and returns path to a temp .mp3 file
 * @param {string} text
 * @returns {Promise<string>} filepath
 */
async function textToSpeech(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

  const payload = JSON.stringify({
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errBody = "";
          res.on("data", (chunk) => (errBody += chunk));
          res.on("end", () =>
            reject(new Error(`ElevenLabs error ${res.statusCode}: ${errBody}`)),
          );
          return;
        }

        const tmpFile = path.join(TMP_DIR, `tts_${Date.now()}.mp3`);
        const fileStream = fs.createWriteStream(tmpFile);
        res.pipe(fileStream);
        fileStream.on("finish", () => resolve(tmpFile));
        fileStream.on("error", reject);
      },
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Converts mp3 filepath to WhatsApp-compatible MessageMedia (base64 ogg/opus)
 * Falls back to sending as mp3 if ffmpeg is unavailable.
 * @param {string} mp3Path
 * @returns {Promise<MessageMedia>}
 */
async function toWhatsAppAudio(mp3Path) {
  // Try converting to ogg/opus (WhatsApp's preferred voice note format)
  try {
    const { execSync } = require("child_process");
    const oggPath = mp3Path.replace(".mp3", ".ogg");
    execSync(
      `ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 64k "${oggPath}" 2>/dev/null`,
      { stdio: "pipe" },
    );
    const data = fs.readFileSync(oggPath).toString("base64");
    fs.unlinkSync(oggPath);
    return new MessageMedia("audio/ogg; codecs=opus", data, "voice.ogg");
  } catch {
    // ffmpeg not available — send as mp3 (still works, just not a voice bubble)
    const data = fs.readFileSync(mp3Path).toString("base64");
    return new MessageMedia("audio/mpeg", data, "voice.mp3");
  }
}

// ─── Bot Handler ─────────────────────────────────────────────────────────────

/**
 * Register TTS listener on a whatsapp-web.js Client instance.
 * @param {import('whatsapp-web.js').Client} client
 */
function registerTTSHandler(client) {
  client.on("message", async (msg) => {
    const body = msg.body.trim();

    if (!body.toLowerCase().startsWith(KEYWORD.toLowerCase())) return;

    const text = body.slice(KEYWORD.length).trim();
    if (!text) {
      msg.reply(`Usage: ${KEYWORD} <text to speak>`);
      return;
    }

    let mp3Path;
    try {
      // Optional: react with 🎙️ to acknowledge
      try {
        await msg.react("🎙️");
      } catch {}

      mp3Path = await textToSpeech(text);
      const media = await toWhatsAppAudio(mp3Path);

      await client.sendMessage(msg.from, media, {
        sendAudioAsVoice: true, // renders as a voice note bubble
      });
    } catch (err) {
      console.error("[TTS Bot] Error:", err.message);
      msg.reply("❌ TTS failed: " + err.message);
    } finally {
      if (mp3Path && fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
    }
  });

  console.log(`[TTS Bot] Listening for keyword: "${KEYWORD}"`);
}

module.exports = { registerTTSHandler, textToSpeech };
