const fs = require('fs');
const path = require('path');

const filePath = path.join('c:\\Users\\scdc\\Desktop\\MAP', 'hiroshima_official_data.csv');

try {
    const buffer = fs.readFileSync(filePath);
    const decoder = new TextDecoder('shift-jis');
    const text = decoder.decode(buffer);
    const lines = text.split(/\r?\n/);

    console.log(`Total lines: ${lines.length}`);
    console.log('--- First 30 lines ---');
    lines.slice(0, 30).forEach((line, i) => {
        console.log(`${i + 1}: ${line}`);
    });
} catch (e) {
    console.error('Error:', e);
}
