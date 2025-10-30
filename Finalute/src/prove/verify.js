// verify.js - Functions for verifying ZK proofs

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Verify a ZK proof using Noir
 * @param {string} tabRootsPath - Path to the tabRoots.json file
 * @param {string} proofPath - Path to the proof file
 * @returns {Promise<boolean>} - True if verification succeeds
 */
async function verifyProof(tabRootsPath, proofPath) {
  return new Promise((resolve, reject) => {
    const noirDir = path.join(__dirname, '../../zk/noir');
    
    // Load tab roots data for public inputs
    const tabRootsData = JSON.parse(fs.readFileSync(tabRootsPath, 'utf8'));
    
    // Copy proof to Noir directory
    const noirProofPath = path.join(noirDir, 'proofs/file_commit.proof');
    
    // Ensure proofs directory exists
    const proofsDir = path.join(noirDir, 'proofs');
    if (!fs.existsSync(proofsDir)) {
      fs.mkdirSync(proofsDir, { recursive: true });
    }
    
    fs.copyFileSync(proofPath, noirProofPath);
    
    // Create public inputs file
    const publicInputsPath = path.join(noirDir, 'public_inputs.json');
    fs.writeFileSync(publicInputsPath, JSON.stringify({
      file_root: tabRootsData.fileRoot,
      tab_count: tabRootsData.tabs.length,
      tab_names_hash: computeTabNamesHash(tabRootsData.tabs.map(tab => tab.name)).toString(),
      tab_roots: tabRootsData.tabs.map(tab => tab.root)
    }));
    
    // Run nargo verify
    exec('cd ' + noirDir + ' && nargo verify', (error, stdout, stderr) => {
      if (error) {
        console.error(`Verification failed: ${error.message}`);
        console.error(stderr);
        resolve(false);
        return;
      }
      
      console.log('Verification succeeded');
      resolve(true);
    });
  });
}

/**
 * Compute the hash of tab names to lock ordering
 * @param {string[]} tabNames - Array of tab names
 * @returns {BigInt} - Hash of tab names
 */
function computeTabNamesHash(tabNames) {
  const { computeTabNamesHash } = require('../commit/tab_hash');
  return computeTabNamesHash(tabNames);
}

module.exports = {
  verifyProof
};