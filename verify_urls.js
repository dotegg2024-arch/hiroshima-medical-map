const https = require('https');
const http = require('http');
const fs = require('fs');

// Read data.js content manually since it's a JS file with a const assignment
// We'll extract the JSON part or just regex it. Actually, we can just require it if we modify it to export,
// but for a quick script, regular expression extraction is easier without modifying the original file.

const dataContent = fs.readFileSync('js/data.js', 'utf8');

// Quick and dirty extraction of URL strings
const urlRegex = /url:\s*"([^"]+)"/g;
let match;
const urls = [];

while ((match = urlRegex.exec(dataContent)) !== null) {
    urls.push(match[1]);
}

console.log(`Found ${urls.length} URLs to verify.`);

const checkUrl = (url) => {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
            resolve({ url, status: res.statusCode, location: res.headers.location });
        });

        req.on('error', (e) => {
            resolve({ url, error: e.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ url, error: 'Timeout' });
        });

        req.end();
    });
};

(async () => {
    const results = [];
    // Process in chunks to avoid overwhelming network but here 50 is fine
    for (const url of urls) {
        const res = await checkUrl(url);
        results.push(res);
        process.stdout.write(res.status === 200 ? '.' : '!');
    }
    console.log('\nDone.');

    const problems = results.filter(r => r.error || r.status >= 400);
    const redirects = results.filter(r => r.status >= 300 && r.status < 400);

    if (problems.length > 0) {
        console.log('\n--- BROKEN LINKS ---');
        problems.forEach(p => console.log(`${p.url} -> ${p.status || p.error}`));
    }

    if (redirects.length > 0) {
        console.log('\n--- REDIRECTS (Consider updating) ---');
        redirects.forEach(p => console.log(`${p.url} -> ${p.status} -> ${p.location}`));
    }

    if (problems.length === 0 && redirects.length === 0) {
        console.log('All links OK.');
    }
})();
