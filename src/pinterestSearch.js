const puppeteer = require("puppeteer");
const { MessageMedia } = require('whatsapp-web.js')
const { logDate } = require("./log");

// Cache to keep track of sent image URLs to avoid duplicates
const sentUrls = new Set();
const MAX_CACHE_SIZE = 500;

async function pinterestSearch(msg, query) {
    msg.react("👀")
    const browser = await puppeteer.launch({ headless: true });
    console.log(logDate(), "[Pinterest] Searching for:", query);
    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Block unnecessary resources to speed things up
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['stylesheet', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    console.log(logDate(), "[Pinterest] Navigating to search page...");
    await page.goto(
        `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        { waitUntil: 'networkidle2', timeout: 30000 }
    );

    // Wait for pins to actually appear in the DOM
    await page.waitForSelector('[data-test-id="pin"]', { timeout: 10000 }).catch(() => {
        console.log("Pin selector timed out — page may have changed structure");
    });

    const results = await page.evaluate(() => {
        const images = [];

        // Strategy 1: Grab from __PWS_DATA__ JSON blob
        const script = document.querySelector('script#__PWS_DATA__');
        if (script) {
            try {
                const json = JSON.parse(script.textContent);
                const jsonStr = JSON.stringify(json);
                const regex = /https:\/\/i\.pinimg\.com\/\d+x\/[^"\\]*/g;
                const matches = jsonStr.match(regex) || [];
                matches.forEach(url => {
                    const highRes = url.replace(/\/\d+x\//, '/736x/');
                    if (!images.includes(highRes)) images.push(highRes);
                });
            } catch (e) {
                console.log("JSON parse failed:", e.message);
            }
        }

        // Strategy 2: Fallback — grab <img> tags directly
        if (images.length === 0) {
            document.querySelectorAll('img[src*="pinimg.com"]').forEach(img => {
                const highRes = img.src.replace(/\/\d+x\//, '/736x/');
                if (!images.includes(highRes)) images.push(highRes);
            });
        }
        return images.slice(0, 20).map(url => ({ image: url, source: 'Pinterest' }));
    });

    // Filter out already sent URLs and limit to 4
    const filteredResults = results
        .filter(res => !sentUrls.has(res.image))
        .slice(0, 4);

    await browser.close();
    console.log(logDate(), "[Pinterest] Found:", results.length, "results, Unique:", filteredResults.length);

    if (filteredResults.length === 0) {
        msg.react("❌");
        return msg.reply("Enggak ada gambar baru yang ketemu.");
    }

    msg.react("✅")

    for (const result of filteredResults) {
        try {
            console.log(logDate(), "[Pinterest] Sending:", result.image.substring(0, 50) + "...");
            const media = await MessageMedia.fromUrl(result.image, {
                filename: `${query}.jpg`,
            });
            await msg.reply(media);

            // Add to history and maintain size
            sentUrls.add(result.image);
            if (sentUrls.size > MAX_CACHE_SIZE) {
                const firstItem = sentUrls.values().next().value;
                sentUrls.delete(firstItem);
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (e) {
            console.error("[Pinterest] Failed to send image:", e.message);
        }
    }
}

module.exports = { pinterestSearch };