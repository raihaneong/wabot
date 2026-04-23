const axios = require('axios');

async function testDdgHtml() {
    try {
        const response = await axios.get('https://duckduckgo.com/html/?q=kucing', { timeout: 5000 });
        console.log('DDG HTML Status:', response.status);
    } catch (err) {
        console.error('DDG HTML Error:', err.message);
    }
}

testDdgHtml();
