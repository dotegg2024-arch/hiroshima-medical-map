const fs = require('fs');
const https = require('https');

// Read and eval data.js to get MEDICAL_DATA
let dataJs = fs.readFileSync('js/data.js', 'utf8');
dataJs = dataJs.replace('const MEDICAL_DATA', 'global.MEDICAL_DATA');
eval(dataJs);

// Helper for fetching
async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    return res.json();
}

// Point in Polygon (Ray Casting)
function isPointInPolygon(point, vs) {
    // point = [lng, lat], vs = [[lng, lat]]
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function classifyPoint(point, geometry) {
    if (geometry.type === 'Polygon') {
        // geometry.coordinates is [ [ring1], [ring2]... ]
        // Check outer ring (index 0)
        return isPointInPolygon(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        // geometry.coordinates is [ PolygonCoords, PolygonCoords... ]
        // PolygonCoords is [ [ring1], [ring2]... ]
        for (const polyCoords of geometry.coordinates) {
            if (isPointInPolygon(point, polyCoords[0])) return true;
        }
    }
    return false;
}

(async () => {
    console.log('Starting verification...');

    // 1. Get all municipalities needed
    const regions = global.MEDICAL_DATA.regions;
    const municipalityMap = global.MEDICAL_DATA.municipalityMapping;

    const municipalities = Object.keys(municipalityMap);
    console.log(`Fetching ${municipalities.length} municipality boundaries...`);

    const muniGeoms = {};

    // Fetch in batches
    const batchSize = 10;
    for (let i = 0; i < municipalities.length; i += batchSize) {
        const batch = municipalities.slice(i, i + batchSize);
        await Promise.all(batch.map(async (name) => {
            try {
                const fullName = name === '府中市' ? '広島県府中市' : name;
                const url = `https://uedayou.net/loa/${encodeURIComponent(fullName)}.geojson`;
                const json = await fetchJson(url);

                if (json.type === 'FeatureCollection' && json.features.length > 0) {
                    muniGeoms[name] = json.features[0].geometry;
                } else if (json.type === 'Feature') {
                    muniGeoms[name] = json.geometry;
                }
                process.stdout.write('.');
            } catch (e) {
                console.error(`\nError fetching ${name}: ${e.message}`);
            }
        }));
    }
    console.log('\nGeometries loaded.');

    // 2. Check each hospital
    let errors = 0;

    for (const [regionId, region] of Object.entries(regions)) {
        console.log(`Checking Region: ${region.name} (${regionId})`);

        for (const hospital of region.hospitals) {
            const point = [hospital.lng, hospital.lat];

            let found = false;

            const regionMunis = Object.entries(municipalityMap)
                .filter(([mName, rId]) => rId === regionId)
                .map(([mName]) => mName);

            for (const muniName of regionMunis) {
                const geom = muniGeoms[muniName];
                if (!geom) continue;
                if (classifyPoint(point, geom)) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.error(`[MISMATCH] Hospital "${hospital.name}" is NOT in any municipality of region "${region.name}"! Coord: ${point}`);
                errors++;
            }
        }
    }

    if (errors === 0) {
        console.log('All hospitals match their regions!');
    } else {
        console.log(`Found ${errors} mismatches.`);
    }

})();
