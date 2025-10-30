// tab_hash.js - Functions for hashing tab data

const { poseidonSponge, poseidonHashString } = require('./poseidon_sponge');

/**
 * Compute the Poseidon hash of a tab's serialized data
 * @param {string} tabName - Name of the tab
 * @param {BigInt[]} chunks - Field element chunks of the serialized tab data
 * @returns {BigInt} - Tab root hash
 */
function computeTabRoot(tabName, chunks) {
  return poseidonSponge(chunks);
}

/**
 * Compute the leaf value for a tab in the Merkle tree
 * @param {string} tabName - Name of the tab
 * @param {BigInt} tabRoot - Tab root hash
 * @returns {BigInt} - Leaf value
 */
function computeTabLeaf(tabName, tabRoot) {
  const nameHash = poseidonHashString(tabName);
  return computeLeafFromHash(nameHash, tabRoot);
}

/**
 * Compute the leaf value from a name hash and tab root
 * @param {BigInt} nameHash - Hash of the tab name
 * @param {BigInt} tabRoot - Tab root hash
 * @returns {BigInt} - Leaf value
 */
function computeLeafFromHash(nameHash, tabRoot) {
  const { poseidonHash2 } = require('./poseidon_sponge');
  return poseidonHash2([nameHash, tabRoot]);
}

/**
 * Compute the hash of tab names to lock ordering
 * @param {string[]} tabNames - Array of tab names
 * @returns {BigInt} - Hash of tab names
 */
function computeTabNamesHash(tabNames) {
  let result = 0n;
  
  for (const name of tabNames) {
    const nameHash = poseidonHashString(name);
    result = require('./poseidon_sponge').poseidonHash2([result, nameHash]);
  }
  
  return result;
}

module.exports = {
  computeTabRoot,
  computeTabLeaf,
  computeLeafFromHash,
  computeTabNamesHash
};