const axios = require('axios');

async function testSearx() {
    try {
        const query = 'kucing';
        const response = await axios.get(`https://searx.be/search?q=${encodeURIComponent(query)}&categories=images&format=json`, {
            timeout: 10000
        });
        
        if (response.data.results && response.data.results.length > 0) {
            console.log('Searx Results count:', response.data.results.length);
            console.log('First image:', response.data.results[0].img_src);
        } else {
            console.log('No matches found on Searx');
        }
    } catch (err) {
        console.error('Searx Error:', err.message);
    }
}

testSearx();
