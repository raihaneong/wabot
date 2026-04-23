const axios = require('axios');

async function testYandexFinal() {
    try {
        const query = 'kucing lucu';
        const response = await axios.get(`https://yandex.com/images/search?text=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const html = response.data;
        const regex = /"origUrl":"(.*?)"/g;
        let match;
        const results = [];
        while ((match = regex.exec(html)) !== null && results.length < 20) {
            let url = match[1];
            // Decode unicode escape sequences if any
            url = url.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
            if (!results.includes(url)) results.push(url);
        }
        
        console.log('Results found:', results.length);
        results.slice(0, 5).forEach((url, i) => console.log(`${i+1}: ${url}`));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testYandexFinal();
