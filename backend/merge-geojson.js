/**
 * merge-geojson.js
 * Merges all dist-{1..77}.json files into a single nepal-constituencies.geojson
 * Each feature gets `distId` and `constId` injected into properties.
 */
const fs = require('fs');
const path = require('path');

const GEOJSON_DIR = path.join(__dirname, 'data', 'geojson', 'Const');
const OUTPUT_FILE = path.join(
  __dirname,
  '..',
  'frontend',
  'public',
  'data',
  'nepal-constituencies.geojson',
);

// Ensure output dir exists
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

const merged = {
  type: 'FeatureCollection',
  features: [],
};

let totalFeatures = 0;
let missingFiles = 0;

for (let distId = 1; distId <= 77; distId++) {
  const filePath = path.join(GEOJSON_DIR, `dist-${distId}.json`);
  if (!fs.existsSync(filePath)) {
    missingFiles++;
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`Failed to parse dist-${distId}.json:`, e.message);
    continue;
  }

  // Data may be a FeatureCollection or an array of features
  const features = Array.isArray(data) ? data : data.features || [];

  features.forEach((feature) => {
    // Inject distId and constId from properties or fallback
    const props = feature.properties || {};
    feature.properties = {
      ...props,
      distId: distId,
      constId: props.F_CONST || props.CONST_ID || null,
      districtName: props.DISTRICT || props.DISTRICT_N || `District ${distId}`,
      districtNameNp: props.DISTRICT_N || props.DISTRICT || `जिल्ला ${distId}`,
      provinceName: props.STATE_N || '',
      provinceCode: props.STATE_C || null,
    };
    merged.features.push(feature);
    totalFeatures++;
  });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged));
console.log(`✅ Merged ${totalFeatures} constituency features into nepal-constituencies.geojson`);
console.log(`   Missing district files: ${missingFiles}`);
console.log(`   Output: ${OUTPUT_FILE}`);
