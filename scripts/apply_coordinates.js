const fs = require('fs');
const path = require('path');

const FILLED_CSV_PATH = path.join(__dirname, '../filled_coordinates.csv');
const DATA_JS_PATH = path.join(__dirname, '../Hiroshima2040/js/data.js');

// Simple CSV Parser
function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const headers = parseLine(lines[0]);
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

// Read CSV
let filledContent;
try {
    filledContent = fs.readFileSync(FILLED_CSV_PATH, 'utf8');
} catch (e) {
    console.error("Failed to read CSV:", e);
    process.exit(1);
}

const records = parseCSV(filledContent);
const coordMap = {};
records.forEach(r => {
    if (r.lat && r.lng && r.lat !== '' && r.lng !== '') {
        coordMap[r.name] = { lat: parseFloat(r.lat), lng: parseFloat(r.lng) };
    }
});

console.log(`${Object.keys(coordMap).length} valid coordinates loaded.`);

// Read data.js
let dataJsContent;
try {
    dataJsContent = fs.readFileSync(DATA_JS_PATH, 'utf8');
} catch (e) {
    console.error("Failed to read data.js:", e);
    process.exit(1);
}

// Extract the object
// We assume `const MEDICAL_DATA = { ... }`
// We can use eval, but let's be careful.
// Let's assume the file starts with comments and then `const MEDICAL_DATA =`.
const startMarker = "const MEDICAL_DATA =";
const startIndex = dataJsContent.indexOf(startMarker);

if (startIndex === -1) {
    console.error("Could not find MEDICAL_DATA definition.");
    process.exit(1);
}

const headerPart = dataJsContent.substring(0, startIndex);
const jsonPart = dataJsContent.substring(startIndex + startMarker.length);

// We need to evaluate the jsonPart. It might end with a semicolon or not.
let medicalData;
try {
    // Wrap in parens to treat as expression? Or just eval the whole assignment?
    // Let's eval the whole string: `medicalData = ...`
    // But `jsonPart` is just the object literal usually.
    // Let's try `eval('(' + jsonPart + ')')` but we need to handle potential trailing semicolon.
    let cleanJson = jsonPart.trim();
    if (cleanJson.endsWith(';')) {
        cleanJson = cleanJson.slice(0, -1);
    }
    medicalData = eval('(' + cleanJson + ')');
} catch (e) {
    console.error("Failed to parse MEDICAL_DATA:", e);
    process.exit(1);
}

// Update Data
let updatedCount = 0;
Object.values(medicalData.regions).forEach(region => {
    if (region.hospitals) {
        region.hospitals.forEach(h => {
            // Try to find coordinate
            // Normalize name? The map keys are from filled_coordinates.csv which came from data.js, so names should match exactly?
            // However, merge_coordinates.js used normalized names for matching logic but the CSV output `name` field came from the input.
            // So `name` in CSV should match `name` in data.js.
            if (coordMap[h.name]) {
                h.lat = coordMap[h.name].lat;
                h.lng = coordMap[h.name].lng;
                updatedCount++;
            }
        });
    }
});

console.log(`Updated ${updatedCount} hospitals in data.js.`);

// Write back
const newContent = headerPart + startMarker + " " + JSON.stringify(medicalData, null, 2) + ";";
fs.writeFileSync(DATA_JS_PATH, newContent);
console.log(`Saved to ${DATA_JS_PATH}`);
