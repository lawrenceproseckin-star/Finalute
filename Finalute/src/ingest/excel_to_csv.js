// excel_to_csv.js - Convert Excel files in a directory to CSVs per sheet

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const logger = require('../utils/logger');

/**
 * Convert all .xlsx files in dir to CSV files, one per sheet.
 * Output file naming: <workbook> - <sheet>.csv in the same directory.
 * @param {string} dirPath
 */
function convertExcelDirToCSVs(dirPath) {
  try {
    const files = fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith('.xlsx'));
    if (files.length === 0) {
      logger.debug('No Excel files found to convert', { dirPath });
      return;
    }
    for (const file of files) {
      const workbookPath = path.join(dirPath, file);
      logger.info('Converting Excel workbook to CSV', { workbookPath });
      const workbook = XLSX.readFile(workbookPath);
      const baseName = path.basename(file, path.extname(file));

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n' });
        const safeSheetName = sheetName.replace(/[\\/:*?"<>|]/g, '_').trim();
        const outCsvName = `${baseName} - ${safeSheetName}.csv`;
        const outCsvPath = path.join(dirPath, outCsvName);
        fs.writeFileSync(outCsvPath, csv, 'utf-8');
        logger.info('Wrote CSV from sheet', { outCsvPath });
      }
    }
  } catch (error) {
    logger.error('Failed converting Excel to CSV', { message: error.message, dirPath });
    throw error;
  }
}

module.exports = {
  convertExcelDirToCSVs,
};