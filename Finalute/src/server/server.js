// server.js - Simple HTTP server for Finalute

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { loadTabRoots } = require('../commit/file_merkle');
const { computeProofHash } = require('../prove/prove');
const { anchorOnChain } = require('../anchor/post');
const { convertExcelDirToCSVs } = require('../ingest/excel_to_csv');
const { spawn } = require('child_process');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Use 0.0.0.0 to listen on all network interfaces

// Configure multer for uploads (accept .xlsx or .csv)
const storageUpload = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original file name
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storageUpload,
  fileFilter: (req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (!(name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.proof'))) {
      return cb(new Error('Only .csv, .xlsx, or .proof files are allowed'), false);
    }
    cb(null, true);
  }
});

// Serve static files from the out directory
app.use('/out', express.static(path.join(__dirname, '../../out')));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get tab roots
app.get('/api/tabroots', (req, res) => {
  try {
    const tabRootsPath = path.join(__dirname, '../../out/tabRoots.json');
    if (fs.existsSync(tabRootsPath)) {
      const tabRoots = loadTabRoots(tabRootsPath);
      // Convert BigInts to strings for JSON serialization
      const serializedTabRoots = {
        filePath: tabRoots.filePath,
        tabs: tabRoots.tabs.map(tab => ({
          name: tab.name,
          root: tab.root.toString()
        })),
        fileRoot: tabRoots.fileRoot.toString()
      };
      res.json(serializedTabRoots);
    } else {
      res.status(404).json({ error: 'Tab roots file not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Serialize processing jobs to avoid concurrent nargo/prove runs
let jobQueue = Promise.resolve();

function runCommandStream(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env });
    child.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

// Upload and process endpoint: accept Excel/CSV, compute roots, prove, and anchor
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadDir = path.dirname(req.file.path);
    const fileName = req.file.originalname.toLowerCase();

    // Enqueue entire processing to serialize jobs
    jobQueue = jobQueue.then(async () => {
      // If Excel, convert to CSVs first
      if (fileName.endsWith('.xlsx')) {
        convertExcelDirToCSVs(uploadDir);
      }

      // Run commit
      await runCommandStream('node', ['src/cli/finalute.js', 'commit', '--dir', uploadDir], path.join(__dirname, '../..'));

      // Run prove
      await runCommandStream('node', ['src/cli/finalute.js', 'prove', '--tabs', 'out/tabRoots.json'], path.join(__dirname, '../..'));

      // Read fileRoot
      const tabRootsPath = path.join(__dirname, '../../out/tabRoots.json');
      const tabRoots = JSON.parse(fs.readFileSync(tabRootsPath, 'utf8'));
      const fileRoot = tabRoots.fileRoot;

      // Anchor
      await runCommandStream('node', ['src/cli/finalute.js', 'anchor', '--file-root', fileRoot, '--proof', 'out/proofs/file.proof'], path.join(__dirname, '../..'));

      // Return response data
      res.json({
        message: 'File processed and anchored successfully',
        fileRoot: fileRoot,
        tabRoots: tabRoots.tabs
      });
    }).catch(err => {
      console.error('Processing job failed:', err);
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Finalute server running at http://${HOST}:${PORT}`);
  console.log(`Access from other devices on your network using your machine's IP address`);
  console.log(`For example: http://<your-ip-address>:${PORT}`);
});