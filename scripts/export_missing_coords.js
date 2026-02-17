const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../Hiroshima2040/js/data.js');
const OUTPUT_CSV = path.join(__dirname, '../missing_coordinates.csv');

// Load Data
let dataContent = fs.readFileSync(DATA_PATH, 'utf8');
const sandbox = {};
let evalContent = dataContent.replace('const MEDICAL_DATA', 'sandbox.MEDICAL_DATA');
eval(evalContent);
const data = sandbox.MEDICAL_DATA;

const missing = [];

Object.values(data.regions).forEach(region => {
    region.hospitals.forEach(h => {
        if (!h.lat || h.lat === 0 || !h.lng || h.lng === 0) {
            missing.push({
                region: region.name,
                name: h.name,
                address: h.address
            });
        }
    });
});

console.log(`Found ${missing.length} hospitals with missing coordinates.`);

// Generate CSV
const header = 'region,name,address,lat,lng\n';
const rows = missing.map(h => `${h.region},"${h.name}","${h.address}",,`).join('\n'); // Empty lat,lng columns

fs.writeFileSync(OUTPUT_CSV, header + rows, 'utf8'); // UTF-8 BOM if needed? Standard UTF-8 is fine for modern Excel.
// Add BOM for Excel compatibility
// const BOM = '\uFEFF';
// fs.writeFileSync(OUTPUT_CSV, BOM + header + rows, 'utf8');

console.log(`Exported to ${OUTPUT_CSV}`);
