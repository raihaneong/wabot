const axios = require('axios');
const fs = require('fs');

async function debugYandex() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://yandex.com/images/search?text=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        fs.writeFileSync('d:\\agl\\wabot2\\scratch\\yandex.html', response.data);
        
        const urls = response.data.match(/https?:\/\/[^"']+\.(jpg|png|jpeg|webp)/g);
        if (urls) {
            console.log('Found candidate URLs:', urls.length);
            console.log('Sample:', urls.slice(0, 5));
        } else {
            console.log('No image URLs found');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

debugYandex();
