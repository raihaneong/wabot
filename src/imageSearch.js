const axios = require('axios')
const { MessageMedia } = require('whatsapp-web.js')
const { logDate } = require('./log')

// Cache to keep track of sent image URLs to avoid duplicates
const sentUrls = new Set();
const MAX_CACHE_SIZE = 500;

async function bingSearch(query) {
    try {
        const response = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });
        const html = response.data;
        const regex = /murl&quot;:&quot;(.*?)&quot;/g;
        let match;
        const results = [];
        while ((match = regex.exec(html)) !== null && results.length < 20) {
            results.push({ image: match[1].replace(/&amp;/g, '&'), source: 'Bing' });
        }
        return results;
    } catch (error) {
        console.error(logDate(), "Bing search error:", error.message);
        return [];
    }
}

async function duckduckgoSearch(query) {
    try {
        // Step 1: Get vqd token
        const initRes = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });
        const html = response.data;
        const results = [];

        // Try various Google patterns
        const patterns = [
            /\["(https?:\/\/[^"]*?\.(?:jpg|jpeg|png|gif|webp))",\d+,\d+\]/g,
            /imgurl=(.*?)&amp;/g,
            /"(https?:\/\/[^"]*?\.(?:jpg|jpeg|png|gif|webp))"/g
        ];

        for (const regex of patterns) {
            let match;
            while ((match = regex.exec(html)) !== null && results.length < 10) {
                let url = decodeURIComponent(match[1]);
                if (!url.includes('duckduckgo.com') && url.startsWith('http')) {
                    results.push({ image: url, source: 'DuckDuckGo' });
                }
            }
            if (results.length > 4) break;
        }
        return results;
    } catch (error) {
        console.error(logDate(), "DuckDuckGo search error:", error.message);
        return [];
    }
}

async function yandexSearch(query) {
    try {
        const response = await axios.get(`https://yandex.com/images/search?text=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });
        const html = response.data;
        const results = [];

        const patterns = [
            /"origUrl":"(.*?)"/g,
            /img_url=(.*?)&/g
        ];

        for (const regex of patterns) {
            let match;
            while ((match = regex.exec(html)) !== null && results.length < 10) {
                let url = match[1].replace(/\\u([0-9a-fA-F]{4})/g, (m, g) => String.fromCharCode(parseInt(g, 16)));
                url = decodeURIComponent(url);
                if (url.startsWith('http')) {
                    results.push({ image: url, source: 'Yandex' });
                }
            }
            if (results.length > 4) break;
        }
        return results;
    } catch (error) {
        console.error(logDate(), "Yandex search error:", error.message);
        return [];
    }
}

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

        // Pinterest JSON pattern for pin images
        const regex = /"url":"(https:\/\/i\.pinimg\.com\/736x\/[^"]*?)"/g;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 10) {
            results.push({ image: match[1], source: 'Pinterest' });
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
        console.log(logDate(), `Search started for: ${query}`);

        try {
            // Aggregate results from multiple engines
            const [bingResults, ddgResults, yandexResults, pinterestResults] = await Promise.all([
                bingSearch(query),
                duckduckgoSearch(query),
                yandexSearch(query),
                pinterestSearch(query)
            ]);

            // Mix results from all engines to avoid one dominating the top
            const results = [];
            const maxLen = Math.max(bingResults.length, ddgResults.length, yandexResults.length, pinterestResults.length);
            for (let i = 0; i < maxLen; i++) {
                if (bingResults[i]) results.push(bingResults[i]);
                if (ddgResults[i]) results.push(ddgResults[i]);
                if (yandexResults[i]) results.push(yandexResults[i]);
                if (pinterestResults[i]) results.push(pinterestResults[i]);
            }

            console.log(logDate(), `Total found: ${results.length} (Bing: ${bingResults.length}, DDG: ${ddgResults.length}, Yandex: ${yandexResults.length}, Pinterest: ${pinterestResults.length})`);

            if (results && results.length > 0) {
                let successCount = 0;
                const shuffled = results.sort(() => 0.5 - Math.random());

                for (const item of shuffled) {
                    if (successCount >= 4) break;

                    let imageUrl = "";
                    try {
                        imageUrl = String(item.image).replace(/\s/g, '%20');

                        // Avoid duplicates
                        if (sentUrls.has(imageUrl)) {
                            console.log(logDate(), `Skip: Already sent recently`);
                            continue;
                        }

                        console.log(logDate(), `Downloading from ${item.source}: ${imageUrl.substring(0, 40)}...`);

                        let referer = 'https://www.bing.com/';
                        if (item.source === 'DuckDuckGo') referer = 'https://duckduckgo.com/';
                        else if (item.source === 'Yandex') referer = 'https://yandex.com/';
                        else if (item.source === 'Pinterest') referer = 'https://www.pinterest.com/';

                        const response = await axios({
                            method: 'get',
                            url: imageUrl,
                            responseType: 'arraybuffer',
                            timeout: 8000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                                'Referer': referer
                            }
                        });

                        const buffer = Buffer.from(response.data);
                        if (buffer.length < 1000) continue;

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
            console.error(logDate(), "Error pas nyari gambar.", error);
            msg.reply("Error pas nyari gambar.");
        }
    }
}

module.exports = { imageSearch };
