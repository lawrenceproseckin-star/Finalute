#!/usr/bin/env node

// finalute.js - CLI for Finalute ZK Layer

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { readCSVTabs } = require('../ingest/read_csv');
const { normalizeGrid, serializeTabToCBOR, serializeTabToJSON } = require('../ingest/normalize');
const { packTabDataToFields, savePackedFields } = require('../ingest/pack_to_fields');
const { computeTabRoot } = require('../commit/tab_hash');
const { computeFileRoot, saveTabRoots } = require('../commit/file_merkle');
const { buildWitness, saveWitness } = require('../prove/build_witness');
const { generateProof, computeProofHash } = require('../prove/prove');
const { verifyProof } = require('../prove/verify');
const { anchorOnChain } = require('../anchor/post');
const { convertExcelDirToCSVs } = require('../ingest/excel_to_csv');

// No longer need predefined tab names as we'll read them from the files

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Flags
const isMockMode = args.includes('--mock');

// Create output directories if they don't exist
const outDir = path.join(__dirname, '../../out');
const proofsDir = path.join(outDir, 'proofs');
const preimagesDir = path.join(outDir, 'preimages');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
if (!fs.existsSync(proofsDir)) {
  fs.mkdirSync(proofsDir, { recursive: true });
}
if (!fs.existsSync(preimagesDir)) {
  fs.mkdirSync(preimagesDir, { recursive: true });
}

// Handle commands
async function main() {
  try {
    switch (command) {
      case 'commit':
        await handleCommit();
        break;
      case 'prove':
        await handleProve();
        break;
      case 'verify':
        await handleVerify();
        break;
      case 'anchor':
        await handleAnchor();
        break;
      default:
        showHelp();
        break;
    }
  } catch (error) {
    logger.error('CLI encountered an error', { message: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Handle 'commit' command
async function handleCommit() {
  // Get directory path from arguments
  const dirArg = args.findIndex(arg => arg === '--dir');
  if (dirArg === -1 || !args[dirArg + 1]) {
    logger.error('Missing directory path. Use --dir <path>');
    process.exit(1);
  }
  
  const dirPath = args[dirArg + 1];
  logger.info('Processing files from directory', { dirPath });
  
  // Convert any Excel files to CSV first
  try {
    convertExcelDirToCSVs(dirPath);
  } catch (e) {
    // Conversion errors are logged in the converter; continue if no Excel files
  }

  // Read CSV tabs
  logger.info('Reading CSV files...');
  let tabData;
  
  if (isMockMode) {
    logger.warn('Running in MOCK mode with sample data');
    // Generate mock data for sample tabs
    tabData = {
      'Sample_Tab_1': [
        ['Header1', 'Header2', 'Header3'],
        ['Value1', 100, 'Text'],
        ['Value2', 200, 'Sample'],
        ['Value3', 300, 'Data']
      ],
      'Sample_Tab_2': [
        ['Header1', 'Header2', 'Header3'],
        ['Value1', 100, 'Text'],
        ['Value2', 200, 'Sample'],
        ['Value3', 300, 'Data']
      ]
    };
  } else {
    tabData = readCSVTabs(dirPath);
  }
  
  // Process each tab
  const tabRoots = [];
  
  for (const tabName of Object.keys(tabData)) {
    logger.info('Processing tab', { tabName });
    
    // Normalize grid
    const normalizedGrid = normalizeGrid(tabData[tabName]);
    
    // Serialize tab data (using JSON for simplicity)
    const serializedData = Buffer.from(serializeTabToJSON(tabName, normalizedGrid));
    
    // Pack to field elements
    const packedData = packTabDataToFields(serializedData);
    
    // Save preimage chunks
    const preimageFilePath = path.join(preimagesDir, `${tabName.replace(/\s+/g, '_')}_preimage.json`);
    savePackedFields(preimageFilePath, packedData);
    
    // Compute tab root
    const tabRoot = computeTabRoot(tabName, packedData.chunks);
    
    tabRoots.push({
      name: tabName,
      root: tabRoot
    });
  }
  
  // Compute file root
  const fileRoot = computeFileRoot(tabRoots);
  
  // Save tab roots
  const tabRootsPath = path.join(outDir, 'tabRoots.json');
  saveTabRoots(dirPath, tabRoots, fileRoot, tabRootsPath);
  
  logger.info('Tab roots and file root saved', { tabRootsPath });
  logger.info('Computed file root', { fileRoot: fileRoot.toString() });
}

// Handle 'prove' command
async function handleProve() {
  // Get tabs file path from arguments
  const tabsArg = args.findIndex(arg => arg === '--tabs');
  if (tabsArg === -1 || !args[tabsArg + 1]) {
    logger.error('Missing tabs file path. Use --tabs <path>');
    process.exit(1);
  }
  
  const tabRootsPath = args[tabsArg + 1];
  logger.info('Using tab roots file', { tabRootsPath });
  
  // Build witness
  logger.info('Building witness');
  const witness = buildWitness(tabRootsPath, preimagesDir);
  
  // Save witness
  const witnessPath = path.join(outDir, 'witness.json');
  saveWitness(witness, witnessPath);
  
  // Generate proof
  logger.info('Generating proof');
  try {
    const proofPath = await generateProof(witnessPath, proofsDir);
    logger.info('Proof generated', { proofPath });
  } catch (error) {
    logger.error('Failed to generate proof', { message: error.message });
    process.exit(1);
  }
}

// Handle 'verify' command
async function handleVerify() {
  // Get tabs file path from arguments
  const tabsArg = args.findIndex(arg => arg === '--tabs');
  if (tabsArg === -1 || !args[tabsArg + 1]) {
    logger.error('Missing tabs file path. Use --tabs <path>');
    process.exit(1);
  }
  
  // Get proof file path from arguments
  const proofArg = args.findIndex(arg => arg === '--proof');
  if (proofArg === -1 || !args[proofArg + 1]) {
    logger.error('Missing proof file path. Use --proof <path>');
    process.exit(1);
  }
  
  const tabRootsPath = args[tabsArg + 1];
  const proofPath = args[proofArg + 1];
  
  logger.info('Verifying proof', { proofPath, tabRootsPath });
  
  // Verify proof
  const isValid = await verifyProof(tabRootsPath, proofPath);
  
  if (isValid) {
    logger.info('Verification successful');
  } else {
    logger.error('Verification failed');
    process.exit(1);
  }
}

// Handle 'anchor' command
async function handleAnchor() {
  // Get file root from arguments
  const fileRootArg = args.findIndex(arg => arg === '--file-root');
  if (fileRootArg === -1 || !args[fileRootArg + 1]) {
    logger.error('Missing file root. Use --file-root <hash>');
    process.exit(1);
  }
  
  // Get proof file path from arguments
  const proofArg = args.findIndex(arg => arg === '--proof');
  if (proofArg === -1 || !args[proofArg + 1]) {
    logger.error('Missing proof file path. Use --proof <path>');
    process.exit(1);
  }
  
  const fileRoot = args[fileRootArg + 1];
  const proofPath = args[proofArg + 1];
  
  logger.info('Anchoring file root', { fileRoot, proofPath });
  
  // Compute proof hash
  const proofHash = computeProofHash(proofPath);
  logger.info('Computed proof hash', { proofHash });
  
  // Anchor on-chain
  const txId = await anchorOnChain(fileRoot, proofHash);
  logger.info('Anchored on-chain', { txId });
}

// Show help message
function showHelp() {
  console.log(`
Finalute - ZK Layer for Financial Reconciliation

Usage:
  finalute commit --file <path>
    Computes tab roots and file root from Excel file
    
  finalute prove --tabs <tabRoots.json>
    Generates ZK proof from tab roots
    
  finalute verify --tabs <tabRoots.json> --proof <file.proof>
    Verifies ZK proof against tab roots
    
  finalute anchor --file-root <hash> --proof <file.proof>
    Anchors file root and proof hash on-chain
  `);
}

// Run the CLI
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});