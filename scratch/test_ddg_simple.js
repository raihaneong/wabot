const axios = require('axios');

async function testDdgSimple() {
    try {
        const response = await axios.get('https://duckduckgo.com', { timeout: 10000 });
        console.log('DDG Status:', response.status);
    } catch (err) {
        console.error('DDG Error:', err.message);
    }
}

testDdgSimple();
