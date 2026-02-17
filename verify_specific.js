const https = require('https');
const http = require('http');

const urls = [
    { name: "Merry Hospital", url: "https://merry-house.jp/merryhospital/" },
    { name: "Prefectural Hospital", url: "http://www.hph.pref.hiroshima.jp/" }
];

const checkUrl = (item) => {
    return new Promise((resolve) => {
        const client = item.url.startsWith('https') ? https : http;
        const req = client.request(item.url, { method: 'HEAD', timeout: 5000 }, (res) => {
            resolve({ name: item.name, url: item.url, status: res.statusCode, location: res.headers.location });
        });
        req.on('error', (e) => resolve({ name: item.name, url: item.url, error: e.message }));
        req.end();
    });
};

(async () => {
    for (const item of urls) {
        const res = await checkUrl(item);
        console.log(`${res.name}: ${res.status || res.error} ${res.location ? '-> ' + res.location : ''}`);
    }
})();
