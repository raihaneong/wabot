const axios = require('axios');

async function testGoogle() {
    try {
        const response = await axios.get('https://www.google.com', { timeout: 5000 });
        console.log('Google Status:', response.status);
    } catch (err) {
        console.error('Google Error:', err.message);
    }
}

testGoogle();
