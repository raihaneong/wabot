const axios = require('axios');
const fs = require('fs');

async function saveGoogle() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&udm=2`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            }
        });
        fs.writeFileSync('d:\\agl\\wabot2\\scratch\\google.html', response.data);
        console.log('Saved google.html');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

saveGoogle();
