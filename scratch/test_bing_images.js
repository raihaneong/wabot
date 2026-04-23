const axios = require('axios');

async function testBingImages() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        
        // Bing results are often in m="{"murl":"url",...}"
        const matches = response.data.match(/m="\{&quot;murl&quot;:&quot;([^&]+)&quot;/g);
        if (matches) {
            const urls = matches.map(m => m.match(/m="\{&quot;murl&quot;:&quot;([^&]+)&quot;/)[1]);
            console.log('Bing Results count:', urls.length);
            console.log('First image:', urls[0]);
        } else {
            console.log('No matches found on Bing');
            // Try another regex if needed
        }
    } catch (err) {
        console.error('Bing Error:', err.message);
    }
}

testBingImages();
