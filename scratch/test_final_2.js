const axios = require('axios');

async function testFinal2() {
    try {
        const query = 'kucing lucu';
        // Using the new udm=2 parameter
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&udm=2`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            }
        });
        
        // Let's see what's in the response
        console.log('Response length:', response.data.length);
        
        // Search for gstatic links
        const regex = /https:\/\/encrypted-tbn[0-9]\.gstatic\.com\/images\?q=[^"&]*/g;
        const matches = response.data.match(regex);
        if (matches) {
            const unique = [...new Set(matches)];
            console.log('Results found:', unique.length);
            unique.slice(0, 5).forEach((url, i) => console.log(`${i+1}: ${url}`));
        } else {
            console.log('No gstatic links found');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testFinal2();
