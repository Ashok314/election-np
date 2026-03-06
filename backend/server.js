const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const DATA_DIR = path.join(__dirname, 'data');

// Serve Lookup Data
app.get('/api/lookups/:type', (req, res) => {
    const { type } = req.params; // 'districts' or 'constituencies'
    const filePath = path.join(DATA_DIR, 'lookup', `${type}.json`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Lookup not found ' });
    }
});

// Serve GeoJSON Maps
app.get('/api/geojson/:type/:id', (req, res) => {
    const { type, id } = req.params; // type: 'District' or 'Const'

    let fileName = '';
    if (type === 'District') {
        fileName = `STATE_C_${id}.json`;
    } else if (type === 'Const') {
        fileName = `dist-${id}.json`;
    }

    const filePath = path.join(DATA_DIR, 'geojson', type, fileName);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'GeoJSON not found' });
    }
});

// Serve Candidate Results
app.get('/api/candidates/:distId/:constId', (req, res) => {
    const { distId, constId } = req.params;
    const filePath = path.join(DATA_DIR, 'candidates', `HOR-${distId}-${constId}.json`);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // If we don't have it yet, return empty array gracefully
        res.json([]);
    }
});

// Aggregate all cached candidates (for dashboard overall stats)
app.get('/api/candidates/all', (req, res) => {
    const filePath = path.join(DATA_DIR, 'candidates', 'all-results.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Election Backend Server running on port ${PORT}`);
});
