const fs = require('fs');
const path = require('path');

const MISSING_PATH = path.join(__dirname, '../missing_coordinates.csv');
const OFFICIAL_PATH = path.join(__dirname, '../hiroshimacity_hospitals_official.csv');
const OUTPUT_PATH = path.join(__dirname, '../filled_coordinates.csv');

// Simple CSV Parser
function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    // Clean headers for BOM
    let headerLine = lines[0];
    if (headerLine.charCodeAt(0) === 0xFEFF) {
        headerLine = headerLine.slice(1);
    }
    const headers = parseLine(headerLine).map(h => h.replace(/^[\uFEFF]/, ''));

    // console.log("Headers:", headers);

    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length === headers.length) {
            const record = {};
            headers.forEach((h, index) => {
                record[h] = values[index];
            });
            records.push(record);
        }
    }
    return records;
}

function parseLine(line) {
    const values = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            values.push(current.replace(/^"|"$/g, '').replace(/""/g, '"'));
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.replace(/^"|"$/g, '').replace(/""/g, '"'));
    return values;
}

// Simple CSV Stringifier
function stringifyCSV(records) {
    if (records.length === 0) return '';
    const headers = Object.keys(records[0]);
    const lines = [headers.join(',')];
    records.forEach(record => {
        const row = headers.map(h => {
            const val = record[h] || '';
            const needsQuote = val.includes(',') || val.includes('"') || val.includes('\n');
            return needsQuote ? `"${val.replace(/"/g, '""')}"` : val;
        });
        lines.push(row.join(','));
    });
    return lines.join('\n');
}

// Read Files
let missingContent, officialContent;
try {
    missingContent = fs.readFileSync(MISSING_PATH, 'utf8');
    officialContent = fs.readFileSync(OFFICIAL_PATH, 'utf8');
} catch (e) {
    console.error("Failed to read files:", e);
    process.exit(1);
}

const missingRecords = parseCSV(missingContent);
const officialRecords = parseCSV(officialContent);

console.log(`Parsed ${missingRecords.length} missing records.`);
console.log(`Parsed ${officialRecords.length} official records.`);

// Build Map
function normalize(name) {
    return name.replace(/[\s\u3000]/g, '');
}

const coordMap = {};
officialRecords.forEach(record => {
    // "名称", "緯度", "経度"
    const name = record['名称'];
    const lat = record['緯度'];
    const lng = record['経度'];

    if (name && lat && lng) {
        coordMap[normalize(name)] = { lat, lng };
    }
});

let foundCount = 0;
const filledRecords = missingRecords.map(record => {
    const normName = normalize(record.name);

    // Try exact overlap
    if (coordMap[normName]) {
        record.lat = coordMap[normName].lat;
        record.lng = coordMap[normName].lng;
        foundCount++;
    } else {
        // Fuzzy
        const matchKey = Object.keys(coordMap).find(key => key.includes(normName) || normName.includes(key));
        if (matchKey) {
            record.lat = coordMap[matchKey].lat;
            record.lng = coordMap[matchKey].lng;
            foundCount++;
        }
    }
    return record;
});

console.log(`Filled ${foundCount} / ${missingRecords.length} hospitals.`);

fs.writeFileSync(OUTPUT_PATH, stringifyCSV(filledRecords));
console.log(`Written to ${OUTPUT_PATH}`);
