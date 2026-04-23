const axios = require('axios');
const fs = require('fs');

async function checkBingHtml() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        fs.writeFileSync('d:\\agl\\wabot2\\scratch\\bing.html', response.data);
        console.log('Saved bing.html');
    } catch (err) {
        console.error('Bing Error:', err.message);
    }
}

checkBingHtml();
