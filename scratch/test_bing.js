const axios = require('axios');

async function testBing() {
    try {
        const response = await axios.get('https://www.bing.com', { timeout: 5000 });
        console.log('Bing Status:', response.status);
    } catch (err) {
        console.error('Bing Error:', err.message);
    }
}

testBing();
