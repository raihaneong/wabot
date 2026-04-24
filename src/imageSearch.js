const axios = require('axios')
const { MessageMedia } = require('whatsapp-web.js')
const { logDate } = require('./log')

// Cache to keep track of sent image URLs to avoid duplicates
const sentUrls = new Set();
const MAX_CACHE_SIZE = 500;

async function pinterestSearch(query) {
    try {
        const response = await axios.get(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });
        const html = response.data;
        const results = [];

        // Pinterest JSON pattern for pin images (match various sizes and convert to 736x for high-res)
        const regex = /"url":"(https:\/\/i\.pinimg\.com\/\d+x\/[^"]*?)"/g;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 10) {
            const highResUrl = match[1].replace(/\/\d+x\//, '/736x/');
            results.push({ image: highResUrl, source: 'Pinterest' });
        }
        return results;
    } catch (error) {
        console.error(logDate(), "Pinterest search error:", error.message);
        return [];
    }
}

async function imageSearch(client, msg, lower) {
    if (lower.startsWith('.img')) {
        msg.react("👀");
        const query = msg.body.replace(/^\.img\s*/i, '').trim();

        if (!query) {
            msg.reply("Kasih keywordnya lah. Contoh: .img kucing");
            return;
        }
        console.log(logDate(), `Pinterest search started for: ${query}`);

        try {
            const results = await pinterestSearch(query);

            console.log(logDate(), `Total Pinterest found: ${results.length}`);

            if (results && results.length > 0) {
                let successCount = 0;

                for (const item of results) {
                    if (successCount >= 4) break;

                    let imageUrl = "";
                    try {
                        imageUrl = String(item.image).replace(/\s/g, '%20');

                        // Avoid duplicates
                        if (sentUrls.has(imageUrl)) {
                            console.log(logDate(), `Skip: Already sent recently`);
                            continue;
                        }

                        console.log(logDate(), `Downloading: ${imageUrl.substring(0, 40)}...`);

                        const response = await axios({
                            method: 'get',
                            url: imageUrl,
                            responseType: 'arraybuffer',
                            timeout: 8000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                                'Referer': 'https://www.pinterest.com/'
                            }
                        });

                        const buffer = Buffer.from(response.data);

                        let mimetype = response.headers['content-type'];
                        if (Array.isArray(mimetype)) mimetype = mimetype[0];
                        mimetype = String(mimetype || 'image/jpeg').split(';')[0].trim();

                        if (!mimetype.startsWith('image/')) continue;

                        const base64 = buffer.toString('base64');
                        const media = new MessageMedia(mimetype, base64);

                        console.log(logDate(), `Sending to ${msg.id.remote}...`);
                        await client.sendMessage(msg.id.remote, media);

                        // Add to history and maintain size
                        sentUrls.add(imageUrl);
                        if (sentUrls.size > MAX_CACHE_SIZE) {
                            const firstItem = sentUrls.values().next().value;
                            sentUrls.delete(firstItem);
                        }

                        successCount++;
                        console.log(logDate(), `Success! (${successCount})`);
                    } catch (err) {
                        console.log(logDate(), `Error at URL ${imageUrl.substring(0, 30)}: ${err.message}`);
                        continue;
                    }
                }

                if (successCount > 0) {
                    msg.react("😼");
                }

                if (successCount === 0) {
                    msg.react("❌");
                }
            } else {
                msg.reply("Gambar ga ketemu.");
            }
        } catch (error) {
            console.error(logDate(), "Error pas nyari gambar di Pinterest.", error);
            msg.reply("Error pas nyari gambar.");
        }
    }
}

module.exports = { imageSearch };
