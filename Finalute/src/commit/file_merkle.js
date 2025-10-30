// file_merkle.js - Functions for building Merkle trees over tab roots

const { poseidonHash2 } = require('./poseidon_sponge');
const { computeTabLeaf } = require('./tab_hash');

/**
 * Compute the Merkle root from tab leaves
 * @param {BigInt[]} leaves - Array of leaf values
 * @returns {BigInt} - Merkle root
 */
function computeMerkleRoot(leaves) {
  if (leaves.length === 0) {
    return 0n;
  }
  
  if (leaves.length === 1) {
    return leaves[0];
  }
  
  // Simple binary Merkle tree implementation
  let currentLevel = [...leaves];
  
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    // Process pairs of nodes
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Hash pair of nodes
        nextLevel.push(poseidonHash2([currentLevel[i], currentLevel[i + 1]]));
      } else {
        // Odd number of nodes - promote the last one
        nextLevel.push(currentLevel[i]);
      }
    }
    
    currentLevel = nextLevel;
  }
  
  return currentLevel[0];
}

/**
 * Compute file root from tab names and tab roots
 * @param {Object[]} tabs - Array of {name, root} objects
 * @returns {BigInt} - File root
 */
function computeFileRoot(tabs) {
  // Compute leaves: Poseidon(tabName || tabRoot)
  const leaves = tabs.map(tab => computeTabLeaf(tab.name, BigInt(tab.root)));
  
  // Compute Merkle root
  return computeMerkleRoot(leaves);
}

/**
 * Save tab roots and file root to JSON file
 * @param {string} filePath - Path to the Excel file
 * @param {Object[]} tabs - Array of {name, root} objects
 * @param {BigInt} fileRoot - File root
 * @param {string} outputPath - Path to save the JSON file
 */
function saveTabRoots(filePath, tabs, fileRoot, outputPath) {
  const fs = require('fs');
  
  const data = {
    filePath,
    tabs: tabs.map(tab => ({
      name: tab.name,
      root: tab.root.toString()
    })),
    fileRoot: fileRoot.toString()
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

/**
 * Load tab roots from JSON file
 * @param {string} inputPath - Path to the JSON file
 * @returns {Object} - Object with filePath, tabs, and fileRoot
 */
function loadTabRoots(inputPath) {
  const fs = require('fs');
  
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  
  return {
    filePath: data.filePath,
    tabs: data.tabs.map(tab => ({
      name: tab.name,
      root: BigInt(tab.root)
    })),
    fileRoot: BigInt(data.fileRoot)
  };
}

module.exports = {
  computeMerkleRoot,
  computeFileRoot,
  saveTabRoots,
  loadTabRoots
};