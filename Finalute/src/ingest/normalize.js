// normalize.js - Module for normalizing Excel data

/**
 * Normalize a cell value according to requirements
 * @param {any} value - Cell value to normalize
 * @returns {string} - Normalized string representation
 */
function normalizeCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  
  // Convert to string
  let strValue = String(value);
  
  // Trim whitespace
  strValue = strValue.trim();
  
  // Normalize Unicode (NFC)
  strValue = strValue.normalize('NFC');
  
  // Handle numbers - convert to canonical string form
  if (typeof value === 'number') {
    // Convert to string with fixed decimal point
    // For integers, no decimal point
    if (Number.isInteger(value)) {
      strValue = value.toString();
    } else {
      // For decimals, use fixed notation
      strValue = value.toFixed(2);
    }
  }
  
  return strValue;
}

/**
 * Normalize a 2D grid of Excel data
 * @param {Array<Array<any>>} grid - 2D array of cell values
 * @returns {Array<Array<string>>} - Normalized 2D array
 */
function normalizeGrid(grid) {
  return grid.map(row => row.map(cell => normalizeCell(cell)));
}

/**
 * Serialize a tab to CBOR format
 * @param {string} tabName - Name of the tab
 * @param {Array<Array<string>>} rows - Normalized 2D array of cell values
 * @returns {Buffer} - CBOR encoded buffer
 */
function serializeTabToCBOR(tabName, rows) {
  const cbor = require('cbor');
  
  const tabData = {
    name: tabName,
    rows: rows
  };
  
  return cbor.encode(tabData);
}

/**
 * Serialize a tab to JSON format
 * @param {string} tabName - Name of the tab
 * @param {Array<Array<string>>} rows - Normalized 2D array of cell values
 * @returns {string} - JSON string
 */
function serializeTabToJSON(tabName, rows) {
  const tabData = {
    name: tabName,
    rows: rows
  };
  
  return JSON.stringify(tabData);
}

module.exports = {
  normalizeCell,
  normalizeGrid,
  serializeTabToCBOR,
  serializeTabToJSON
};