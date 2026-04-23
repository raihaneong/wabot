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
        
        // Google encodes results in AF_initDataCallback or similar
        // We can look for image URLs directly
        const matches = response.data.match(/\["(https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=[^"]+)",(\d+),(\d+)\]/g);
        if (matches) {
            console.log('Found:', matches.length);
            console.log('First:', matches[0]);
        } else {
            console.log('No matches');
            // Try searching for any https link to an image
            const anyImage = response.data.match(/https:\/\/[^"]+\.(jpg|png|jpeg)/g);
            if (anyImage) {
                console.log('Any image found:', anyImage.length);
                console.log('First:', anyImage[0]);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testGoogleImages();
