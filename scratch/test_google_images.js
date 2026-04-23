const axios = require('axios');

async function testGoogleImages() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        
        const matches = response.data.match(/\["(https:\/\/[^"]+\.(?:jpg|png|jpeg))",\d+,\d+\]/g);
        if (matches) {
            const urls = matches.map(m => m.match(/\["(https:\/\/[^"]+\.(?:jpg|png|jpeg))",\d+,\d+\]/)[1]);
            console.log('Google Results count:', urls.length);
            console.log('First image:', urls[0]);
        } else {
            console.log('No matches found on Google');
            // Try simpler regex
            const simpleMatches = response.data.match(/https:\/\/[^"]+\.(?:jpg|png|jpeg)/g);
            if (simpleMatches) {
                 console.log('Simple matches count:', simpleMatches.length);
                 console.log('First simple:', simpleMatches[0]);
            }
        }
    } catch (err) {
        console.error('Google Error:', err.message);
    }
}

testGoogleImages();
