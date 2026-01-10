const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Load the mock data
const dataPath = path.join(__dirname, 'mock_data.json');
let mockData = [];

try {
  const fileContent = fs.readFileSync(dataPath, 'utf8');
  mockData = JSON.parse(fileContent);
  console.log('Mock data loaded successfully');
} catch (error) {
  console.error('Error loading mock data:', error);
  // Fallback if file is missing or empty
  mockData = { error: "Failed to load mock data" };
}

// Serve the data at the root
app.get('/', (req, res) => {
  res.json(mockData);
});

// Serve the data at the original path structure as well
app.get('/tickets/asset/resolved/', (req, res) => {
  res.json(mockData);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
