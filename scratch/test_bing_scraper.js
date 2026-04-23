const axios = require('axios');

async function testBingScraper() {
    try {
        const query = 'kucing lucu';
        const response = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        const html = response.data;
        // Bing uses &quot;murl&quot;:&quot;URL&quot;
        const regex = /murl&quot;:&quot;(.*?)&quot;/g;
        let match;
        const results = [];
        while ((match = regex.exec(html)) !== null && results.length < 20) {
            results.push(match[1]);
        }
        
        if (results.length === 0) {
            // Try another common pattern
            const regex2 = /"murl":"(.*?)"/g;
            while ((match = regex2.exec(html)) !== null && results.length < 20) {
                results.push(match[1]);
            }
        }
        
        console.log('Bing results found:', results.length);
        results.slice(0, 5).forEach((url, i) => console.log(`${i+1}: ${url}`));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testBingScraper();
