// read_csv.js - Module for reading CSV files

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

/**
 * Read CSV file and extract the data from all tabs
 * @param {string} dirPath - Path to the directory containing CSV files
 * @returns {Object} - Object with tab names as keys and 2D arrays as values
 */
function readCSVTabs(dirPath) {
  try {
    const result = {};
    
    // Get all CSV files in the directory
    const files = fs.readdirSync(dirPath).filter(file => file.toLowerCase().endsWith('.csv'));
    
    if (files.length === 0) {
      throw new Error('No CSV files found in directory');
    }
    
    // Process each CSV file
    for (const file of files) {
      const csvPath = `${dirPath}/${file}`;
      const fileContent = fs.readFileSync(csvPath, 'utf-8');
      
      // Parse CSV file
      const data = csv.parse(fileContent, {
        skip_empty_lines: true,
        trim: true,
        columns: false // Return array of arrays instead of objects
      });
      
      // Use the file name without extension as the tab name
      const tabName = path.basename(file, '.csv');
      result[tabName] = data;
    }
    
    return result;
  } catch (error) {
    console.error(`Error reading CSV files: ${error.message}`);
    throw error;
  }
}

module.exports = {
  readCSVTabs
};