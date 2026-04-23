const axios = require('axios');

async function testSafeDdg() {
    try {
        const response = await axios.get('https://safe.duckduckgo.com', { timeout: 5000 });
        console.log('Safe DDG Status:', response.status);
    } catch (err) {
        console.error('Safe DDG Error:', err.message);
    }
}

testSafeDdg();
