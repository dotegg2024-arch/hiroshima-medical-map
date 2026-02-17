const fs = require('fs');
const path = require('path');

const DATA_JS_PATH = path.join(__dirname, '../Hiroshima2040/js/data.js');

try {
    const content = fs.readFileSync(DATA_JS_PATH, 'utf8');

    // Extract JSON part
    const startMarker = "const MEDICAL_DATA =";
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) throw new Error("MEDICAL_DATA not found");

    let jsonPart = content.substring(startIndex + startMarker.length).trim();
    if (jsonPart.endsWith(';')) jsonPart = jsonPart.slice(0, -1);

    const medicalData = eval('(' + jsonPart + ')');

    let total = 0;
    let missing = 0;
    let filled = 0;

    const missingList = [];

    Object.values(medicalData.regions).forEach(region => {
        if (region.hospitals) {
            total += region.hospitals.length;
            region.hospitals.forEach(h => {
                if (!h.lat || h.lat == 0 || !h.lng || h.lng == 0) {
                    missing++;
                    missingList.push(`${region.name}: ${h.name}`);
                } else {
                    filled++;
                }
            });
        }
    });

    console.log(`Total Hospitals: ${total}`);
    console.log(`Coordinates Filled: ${filled}`);
    console.log(`Coordinates Missing: ${missing}`);
    console.log(`Missing Rate: ${((missing / total) * 100).toFixed(1)}%`);

} catch (e) {
    console.error("Error:", e.message);
}
