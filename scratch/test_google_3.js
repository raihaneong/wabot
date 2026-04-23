const axios = require('axios');

async function testGoogle3() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        
        const data = response.data.match(/AF_initDataCallback\({key: 'ds:1', hash: '2', data:(.*?), sideChannel: {}}\);/);
        if (data) {
            console.log('Found AF_initDataCallback');
            const json = JSON.parse(data[1]);
            const results = json[31][1][12][2];
            console.log('Results count:', results.length);
            console.log('First image:', results[0][1][3][0]);
        } else {
             console.log('AF_initDataCallback not found');
             // Try searching for any https link to gstatic
             const gstatic = response.data.match(/https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=[^"&]+/g);
             if (gstatic) {
                 console.log('Gstatic links found:', gstatic.length);
                 console.log('First:', gstatic[0]);
             }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testGoogle3();
