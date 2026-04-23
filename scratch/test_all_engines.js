const axios = require('axios');

async function testAllEngines() {
    const query = 'kucing';
    const engines = [
        { name: 'Bing', url: `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, regex: /murl&quot;:&quot;(.*?)&quot;/g },
        { name: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=2`, regex: /"(https?:\/\/[^"]*?\.(?:jpg|jpeg|png|gif|webp))"/g },
        { name: 'Yandex', url: `https://yandex.com/images/search?text=${encodeURIComponent(query)}`, regex: /"origUrl":"(.*?)"/g }
    ];

    for (const engine of engines) {
        try {
            console.log(`Testing ${engine.name}...`);
            const response = await axios.get(engine.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });
            const html = response.data;
            let match;
            const results = [];
            while ((match = engine.regex.exec(html)) !== null && results.length < 5) {
                results.push(match[1]);
            }
            console.log(`${engine.name} found: ${results.length}`);
            results.forEach((url, i) => console.log(`  ${i+1}: ${url.substring(0, 50)}...`));
        } catch (err) {
            console.log(`${engine.name} error: ${err.message}`);
        }
    }
}

testAllEngines();
