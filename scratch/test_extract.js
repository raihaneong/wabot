const fs = require('fs');

function testExtract() {
    const html = fs.readFileSync('d:\\agl\\wabot2\\scratch\\bing.html', 'utf8');
    const matches = html.match(/m="\{&quot;murl&quot;:&quot;([^&]+)&quot;/g);
    if (matches) {
        const urls = matches.map(m => m.match(/m="\{&quot;murl&quot;:&quot;([^&]+)&quot;/)[1]);
        console.log('Found:', urls.length);
        console.log('First:', urls[0]);
    } else {
        console.log('No matches');
    }
}

testExtract();
