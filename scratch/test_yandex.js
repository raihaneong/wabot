const axios = require('axios');

async function testYandex() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://yandex.com/images/search?text=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        
        console.log('Response length:', response.data.length);
        // Yandex often uses JSON in data-bem attribute or similar
        const matches = response.data.match(/"origin":\{"url":"(.*?)"/g);
        if (matches) {
             const urls = matches.map(m => m.match(/"url":"(.*?)"/)[1]);
             console.log('Yandex results:', urls.length);
             urls.slice(0, 5).forEach((u, i) => console.log(`${i+1}: ${u}`));
        } else {
             console.log('No Yandex results found');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testYandex();
