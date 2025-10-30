// logger.js - Centralized logging utility

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../out');
const logsDir = path.join(outDir, 'logs');
const logFilePath = path.join(logsDir, 'finalute.log');

// Ensure logs directory exists
try {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (e) {
  // Fallback to console only if directory creation fails
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Default to debug to show all logs in terminal; can be overridden via LOG_LEVEL
let currentLevel = process.env.LOG_LEVEL && levels[process.env.LOG_LEVEL] !== undefined
  ? levels[process.env.LOG_LEVEL]
  : levels.debug;

function setLevel(levelName) {
  if (levels[levelName] !== undefined) {
    currentLevel = levels[levelName];
  }
}

function formatLine(level, message, meta) {
  const timestamp = new Date().toISOString();
  const levelTag = level.toUpperCase();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${levelTag}] ${message}${metaStr}`;
}

function writeToFile(line) {
  // Only write to file if explicitly enabled
  if (process.env.LOG_TO_FILE === 'true') {
    try {
      fs.appendFileSync(logFilePath, line + '\n');
    } catch (e) {
      // If file write fails, ignore silently
    }
  }
}

function log(levelName, message, meta) {
  const levelVal = levels[levelName] ?? levels.info;
  if (levelVal <= currentLevel) {
    const line = formatLine(levelName, message, meta);
    // Console output
    if (levelName === 'error') {
      console.error(line);
    } else if (levelName === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
    // File output
    writeToFile(line);
  }
}

module.exports = {
  setLevel,
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};