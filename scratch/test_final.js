const axios = require('axios');

async function testFinal() {
    try {
        const query = 'kucing lucu';
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            }
        });
        
        // This regex looks for the JSON-like structure in Google's source
        const regex = /\["(https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=[^"]+)",(\d+),(\d+)\]/g;
        let match;
        const results = [];
        while ((match = regex.exec(response.data)) !== null && results.length < 20) {
            results.push(match[1]);
        }
        
        console.log('Results found:', results.length);
        results.slice(0, 5).forEach((url, i) => console.log(`${i+1}: ${url}`));
        
        if (results.length < 5) {
            console.log('Trying fallback regex...');
            const fallbackRegex = /"(https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=[^"]+)"/g;
            let fMatch;
            while ((fMatch = fallbackRegex.exec(response.data)) !== null && results.length < 20) {
                if (!results.includes(fMatch[1])) results.push(fMatch[1]);
            }
            console.log('Total results after fallback:', results.length);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testFinal();
