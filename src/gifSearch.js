const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { logDate } = require("./log");
const { MessageMedia } = require("whatsapp-web.js");

const sentUrls = new Set();
const MAX_CACHE_SIZE = 500;

async function gifSearch(chat, msg, query) {
    msg.react("👀");
    try {
        console.log(logDate(), "[GIF] Searching for:", query);
        const response = await axios.get(`https://tenor.com/search/${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        // Match both mp4 and gif, prioritize mp4 for WhatsApp delivery
        const regex = /https:\/\/media\.tenor\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(mp4|gif)/g;
        const matches = html.match(regex) || [];

        // Sort to put mp4 first for each ID if both exist, and take unique IDs
        const uniqueMatches = [...new Set(matches)].sort((a, b) => {
            if (a.endsWith('.mp4') && b.endsWith('.gif')) return -1;
            if (a.endsWith('.gif') && b.endsWith('.mp4')) return 1;
            return 0;
        });

        // Filter out already sent GIFs and limit to 4
        const results = uniqueMatches
            .filter(url => !sentUrls.has(url))
            .slice(0, 4);

        if (results.length === 0) {
            msg.react("❌");
            return msg.reply("Enggak ada GIF baru yang ketemu.");
        }

        msg.react("✅");

        for (const gifUrl of results) {
            try {
                console.log(logDate(), "[GIF] Sending:", gifUrl);
                // Download and save locally
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(gifResponse.data);
                const tempName = `${crypto.randomBytes(6).toString('hex')}.gif`;
                const tempPath = path.join(__dirname, "../tmp", tempName);

                fs.writeFileSync(tempPath, buffer);

                const media = MessageMedia.fromFilePath(tempPath);
                await chat.sendMessage(media, { sendVideoAsGif: true });

                // Cleanup
                fs.unlinkSync(tempPath);

                // Add to history and maintain size
                sentUrls.add(gifUrl);
                if (sentUrls.size > MAX_CACHE_SIZE) {
                    const firstItem = sentUrls.values().next().value;
                    sentUrls.delete(firstItem);
                }

                // Small delay to prevent rate limit
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (e) {
                console.error("[GIF] Failed to send media:", e.message);
            }
        }
    } catch (error) {
        console.error(logDate(), "[GIF] Error searching for:", query, error.message);
        msg.react("❌");
        msg.reply("Error pas nyari GIF.");
    }
}

module.exports = { gifSearch }; 