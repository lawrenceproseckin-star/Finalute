// build_witness.js - Functions for building witness for Noir circuit

const fs = require('fs');
const path = require('path');
const { computeTabNamesHash } = require('../commit/tab_hash');

/**
 * Build witness for the Noir circuit
 * @param {string} tabRootsPath - Path to the tabRoots.json file
 * @param {string} preimagesDir - Directory containing preimage chunks
 * @returns {Object} - Witness object for Noir
 */
function buildWitness(tabRootsPath, preimagesDir) {
  // Load tab roots
  const tabRootsData = JSON.parse(fs.readFileSync(tabRootsPath, 'utf8'));
  const fileRoot = tabRootsData.fileRoot;
  const tabs = tabRootsData.tabs;
  
  // Compute tab names hash
  const tabNames = tabs.map(tab => tab.name);
  const tabNamesHash = computeTabNamesHash(tabNames).toString();
  
  // Prepare public inputs
  const publicInputs = {
    file_root: fileRoot,
    tab_count: tabs.length,
    tab_names_hash: tabNamesHash,
    tab_roots: []
  };
  
  // Fill tab roots array (pad with zeros if needed)
  const MAX_TABS = 16;
  for (let i = 0; i < MAX_TABS; i++) {
    if (i < tabs.length) {
      publicInputs.tab_roots.push(tabs[i].root);
    } else {
      publicInputs.tab_roots.push("0");
    }
  }
  
  // Load preimage chunks for each tab
  const tabPreimages = [];
  for (let i = 0; i < tabs.length; i++) {
    const tabName = tabs[i].name;
    const preimageFile = path.join(preimagesDir, `${tabName.replace(/\s+/g, '_')}_preimage.json`);
    
    if (!fs.existsSync(preimageFile)) {
      throw new Error(`Preimage file not found for tab: ${tabName}`);
    }
    
    const preimageData = JSON.parse(fs.readFileSync(preimageFile, 'utf8'));
    
    // Prepare preimage data
    const MAX_CHUNKS_PER_TAB = 100; // Reduced from 1000 to 100 to match circuit
    const preimage = {
      chunk_count: preimageData.chunkCount,
      chunks: []
    };
    
    // Fill chunks array (pad with zeros if needed)
    for (let j = 0; j < MAX_CHUNKS_PER_TAB; j++) {
      if (j < preimageData.chunks.length) {
        preimage.chunks.push(preimageData.chunks[j]);
      } else {
        preimage.chunks.push("0");
      }
    }
    
    tabPreimages.push(preimage);
  }
  
  // Pad tab preimages array if needed
  for (let i = tabs.length; i < MAX_TABS; i++) {
    tabPreimages.push({
      chunk_count: 0,
      chunks: Array(100).fill("0") // Also updated here
    });
  }
  
  // Build final witness
  const witness = {
    public: publicInputs,
    tab_names: tabNames.map(name => name.padEnd(32, '\0')),
    tab_preimages: tabPreimages
  };
  
  return witness;
}

/**
 * Save witness to a file
 * @param {Object} witness - Witness object
 * @param {string} outputPath - Path to save the witness
 */
function saveWitness(witness, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(witness, null, 2));
}

module.exports = {
  buildWitness,
  saveWitness
};