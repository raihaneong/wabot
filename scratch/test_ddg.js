const axios = require('axios');

async function testDdg() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const vqdMatch = response.data.match(/vqd="([^"]+)"/) || response.data.match(/vqd='([^']+)'/);
        if (!vqdMatch) {
            console.log('VQD not found');
            return;
        }
        const vqd = vqdMatch[1];
        console.log('VQD:', vqd);
        
        const searchUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
        const searchResponse = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://duckduckgo.com/'
            }
        });
        
        console.log('Results count:', searchResponse.data.results?.length);
        if (searchResponse.data.results && searchResponse.data.results.length > 0) {
            console.log('First image:', searchResponse.data.results[0].image);
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
        }
    }
}

testDdg();
