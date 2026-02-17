const fs = require('fs');
const path = require('path');

// 1. Data Definitions
const EXISTING_DATA_PATH = path.join(__dirname, '../Hiroshima2040/js/data.js');
const CSV_PATH = path.join(__dirname, '../hiroshima_official_data.csv');
const OUTPUT_PATH = path.join(__dirname, '../Hiroshima2040/js/data_updated.js');

// Municipality to Region Map (from data.js)
const MUNICIPALITY_MAP = {
    "広島市": "hiroshima", "安芸高田市": "hiroshima", "府中町": "hiroshima", "海田町": "hiroshima",
    "熊野町": "hiroshima", "坂町": "hiroshima", "安芸太田町": "hiroshima", "北広島町": "hiroshima",
    "大竹市": "hiroshimaNishi", "廿日市市": "hiroshimaNishi",
    "呉市": "kure", "江田島市": "kure",
    "東広島市": "hiroshimaChuo", "竹原市": "hiroshimaChuo", "大崎上島町": "hiroshimaChuo",
    "三原市": "bisan", "尾道市": "bisan", "世羅町": "bisan",
    "福山市": "fukuyamaFuchu", "府中市": "fukuyamaFuchu", "神石高原町": "fukuyamaFuchu",
    "三次市": "bihoku", "庄原市": "bihoku"
};

// 2. Load Existing Data
let existingDataContent = fs.readFileSync(EXISTING_DATA_PATH, 'utf8');
// Mock the context to eval
const sandbox = {};
// We need to extract the object. 
// A simple eval might work if we change 'const MEDICAL_DATA' to 'sandbox.MEDICAL_DATA'
let evalContent = existingDataContent.replace('const MEDICAL_DATA', 'sandbox.MEDICAL_DATA');
eval(evalContent);
const existingData = sandbox.MEDICAL_DATA;

// Flatten existing hospitals for easy lookup
const existingHospitals = [];
Object.values(existingData.regions).forEach(r => {
    r.hospitals.forEach(h => existingHospitals.push(h));
});

// Helper: Normalize name for fuzzy matching
function normalizeName(name) {
    return name
        .replace(/医療法人.*?会/g, '')
        .replace(/社会医療法人.*?会/g, '')
        .replace(/公立/g, '')
        .replace(/広島県厚生農業協同組合連合会/g, '')
        .replace(/国家公務員共済組合連合会/g, '')
        .replace(/独立行政法人.*?機構/g, '')
        .replace(/日本赤十字社/g, '')
        .replace(/株式会社/g, '')
        .replace(/[ 　]/g, '')
        .trim();
}

// 3. Parse CSV
const buffer = fs.readFileSync(CSV_PATH);
const decoder = new TextDecoder('shift-jis');
const csvText = decoder.decode(buffer);
const lines = csvText.split(/\r?\n/);

const newHospitals = [];

lines.forEach((line, index) => {
    // Simple CSV parser (assuming no commas in quoted fields for now, or simple split)
    // The previous inspection showed quotes around some fields.
    // Let's use a regex to split by comma but respect quotes.
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    // Actually, split by comma is safer if we handle quotes manually.
    // Given the complexity and "print layout", let's be robust.

    // Split by comma
    const parts = line.split(',');
    // Combine parts if they were inside quotes? 
    // The previous output showed: 1,"01,1001,3",...
    // So parts[1] is "01, parts[2] is 1001, parts[3] is 3"
    // This simple split breaks quoted fields.
    // Let's re-join logic:
    const cols = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if (!inQuote && part.startsWith('"')) {
            inQuote = true;
            part = part.substring(1);
        }
        if (inQuote) {
            if (part.endsWith('"')) {
                inQuote = false;
                part = part.slice(0, -1);
                current += (current ? ',' : '') + part;
                cols.push(current);
                current = '';
            } else {
                current += (current ? ',' : '') + part;
            }
        } else {
            cols.push(part);
        }
    }

    // Check if it's a hospital row
    // Column 9 (index 9) should be '病院'
    // Based on inspection:
    // 1,"01,1001,3",Name,Address,Phone,Owner,Director,Date,Beds,Type
    // 0: Seq
    // 1: Code
    // 2: Name
    // 3: Address
    // 4: Phone
    // 5: Owner
    // 6: Director
    // 7: Date
    // 8: Info
    // 9: Type

    if (cols[9] && cols[9].trim() === '病院') {
        const rawName = cols[2].trim();
        const rawAddress = cols[3].trim();
        // Remove Postal Code from Address
        // Expect format: 〒730－8652広島市...
        const address = rawAddress.replace(/^〒[\d－-]+\s*/, '');

        newHospitals.push({
            name: rawName,
            address: address,
            phone: cols[4].trim()
        });
    }
});

console.log(`Found ${newHospitals.length} hospitals in official data.`);

// 4. Merge Data
const updatedRegions = { ...existingData.regions };

// Clear current lists (we will rebuild them to ensure no duplicates and full coverage)
// BUT we want to keep Lat/Lng/URL from existing.
Object.keys(updatedRegions).forEach(key => {
    updatedRegions[key].hospitals = [];
});

const unmappedHospitals = [];

newHospitals.forEach(newHosp => {
    const normalizedNew = normalizeName(newHosp.name);

    // Find matching existing hospital
    const match = existingHospitals.find(h => normalizeName(h.name).includes(normalizedNew) || normalizedNew.includes(normalizeName(h.name)));

    let hospitalEntry = {
        name: newHosp.name,
        beds: 0, // Default, hard to parse from CSV currently
        type: "一般", // Default
        emergencyLevel: 1, // Default
        departments: [],
        lat: 0,
        lng: 0,
        address: newHosp.address,
        url: ""
    };

    if (match) {
        // Use existing data for rich fields
        hospitalEntry = { ...match };
        // Update name/address to official if needed? Maybe keep existing as they are verified.
        // Actually, keep existing name to avoid breaking things?
        // Let's prefer existing data if matched.
        console.log(`Matched: ${newHosp.name} -> ${match.name}`);
    } else {
        console.log(`New: ${newHosp.name}`);
    }

    // Determine Region
    let assigned = false;
    for (const [city, regionId] of Object.entries(MUNICIPALITY_MAP)) {
        if (hospitalEntry.address.includes(city)) {
            updatedRegions[regionId].hospitals.push(hospitalEntry);
            assigned = true;
            break;
        }
    }

    if (!assigned) {
        // Try fuzzy address match or unexpected municipality
        console.warn(`Unmapped municipality for: ${hospitalEntry.name} (${hospitalEntry.address})`);
        unmappedHospitals.push(hospitalEntry);
    }
});

// Add unmapped to a fallback or log (for now, ignore or put in Hiroshima if unsure? No, dangerous)
// Let's add them to 'hiroshima' as fallback but mark them?
// Or maybe specific logic for 郡 (Gun)?
// The map has "世羅町" (Sera), "安芸太田町" etc.
// Need to handle "安芸郡" -> check town name.
// Address string usually contains City/Town/Village.
// "安芸郡府中町" -> matches "府中町"
// "山県郡北広島町" -> matches "北広島町"
// So the simple check should work if the map is exhaustive for these suffixes.

// 5. Output
const outputContent = `// 広島県医療圏リソースマップ データ定義 (Updated)
// 病院座標は公式データおよびNAVITIME/Google Mapsより取得

const MEDICAL_DATA = ${JSON.stringify({ ...existingData, regions: updatedRegions }, null, 2)};
`;

fs.writeFileSync(OUTPUT_PATH, outputContent);
console.log(`Written updated data to ${OUTPUT_PATH}`);
