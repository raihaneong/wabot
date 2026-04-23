const axios = require('axios');

async function testStartpage() {
    try {
        const response = await axios.get('https://www.startpage.com', { timeout: 5000 });
        console.log('Startpage Status:', response.status);
    } catch (err) {
        console.error('Startpage Error:', err.message);
    }
}

testStartpage();
