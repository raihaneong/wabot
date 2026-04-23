const axios = require('axios');

async function testYandexImages() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://yandex.com/images/search?text=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        
        // Yandex often has results in a JSON-like string in the HTML
        // Look for something like "img_url":"https://..."
        const matches = response.data.match(/"img_url":"([^"]+)"/g);
        if (matches) {
            const urls = matches.map(m => m.match(/"img_url":"([^"]+)"/)[1]);
            // Remove duplicates
            const uniqueUrls = [...new Set(urls)];
            console.log('Yandex Results count:', uniqueUrls.length);
            console.log('First image:', uniqueUrls[0]);
        } else {
            console.log('No matches found on Yandex');
        }
    } catch (err) {
        console.error('Yandex Error:', err.message);
    }
}

testYandexImages();
