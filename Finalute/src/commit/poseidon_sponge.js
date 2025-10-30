// poseidon_sponge.js - Implementation of Poseidon hash and sponge construction

// Note: This is a simplified implementation for demonstration purposes
// In production, use a proper cryptographic library for Poseidon hash

const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Simple Poseidon hash for a single field element
 * @param {BigInt} input - Field element to hash
 * @returns {BigInt} - Resulting hash
 */
function poseidonHash1(input) {
  // Simplified implementation - in production use a proper Poseidon implementation
  // This is just a placeholder that simulates the hash behavior
  return (input * 7n + 1n) % BN254_PRIME;
}

/**
 * Simple Poseidon hash for two field elements
 * @param {BigInt[]} inputs - Array of two field elements
 * @returns {BigInt} - Resulting hash
 */
function poseidonHash2(inputs) {
  // Simplified implementation - in production use a proper Poseidon implementation
  if (inputs.length !== 2) {
    throw new Error('poseidonHash2 requires exactly 2 inputs');
  }
  
  // Simple mixing function to simulate Poseidon
  return ((inputs[0] * 7n + inputs[1] * 11n) + 1n) % BN254_PRIME;
}

/**
 * Poseidon sponge construction for absorbing many field elements
 * @param {BigInt[]} chunks - Array of field elements to absorb
 * @returns {BigInt} - Final hash value
 */
function poseidonSponge(chunks) {
  let state = 0n;
  
  for (const chunk of chunks) {
    state = poseidonHash2([state, chunk]);
  }
  
  return state;
}

/**
 * Hash a string using Poseidon
 * @param {string} input - String to hash
 * @returns {BigInt} - Resulting hash
 */
function poseidonHashString(input) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let state = 0n;
  
  for (const byte of bytes) {
    state = poseidonHash2([state, BigInt(byte)]);
  }
  
  return state;
}

module.exports = {
  poseidonHash1,
  poseidonHash2,
  poseidonSponge,
  poseidonHashString,
  BN254_PRIME
};