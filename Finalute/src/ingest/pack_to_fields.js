// pack_to_fields.js - Module for packing byte data into field elements

const BYTES_PER_FIELD = 31; // BN254 field can safely store 31 bytes per field element

/**
 * Pack a buffer into field elements (31 bytes per field)
 * @param {Buffer} buffer - Input buffer to pack
 * @returns {BigInt[]} - Array of field elements as BigInts
 */
function packBufferToFields(buffer) {
  const fields = [];
  
  // Process full chunks
  for (let i = 0; i < buffer.length; i += BYTES_PER_FIELD) {
    const chunkSize = Math.min(BYTES_PER_FIELD, buffer.length - i);
    const chunk = buffer.slice(i, i + chunkSize);
    
    // Convert chunk to BigInt
    let fieldValue = 0n;
    for (let j = 0; j < chunk.length; j++) {
      fieldValue = (fieldValue << 8n) | BigInt(chunk[j]);
    }
    
    fields.push(fieldValue);
  }
  
  return fields;
}

/**
 * Pack serialized tab data into field elements
 * @param {Buffer} serializedData - CBOR or JSON serialized tab data
 * @returns {Object} - Object with chunk count and field elements
 */
function packTabDataToFields(serializedData) {
  const fields = packBufferToFields(serializedData);
  
  return {
    chunkCount: fields.length,
    chunks: fields
  };
}

/**
 * Save packed field elements to a file
 * @param {string} filePath - Path to save the field elements
 * @param {Object} packedData - Object with chunk count and field elements
 */
function savePackedFields(filePath, packedData) {
  const fs = require('fs');
  
  // Convert BigInts to strings for JSON serialization
  const serializable = {
    chunkCount: packedData.chunkCount,
    chunks: packedData.chunks.map(field => field.toString())
  };
  
  fs.writeFileSync(filePath, JSON.stringify(serializable, null, 2));
}

/**
 * Load packed field elements from a file
 * @param {string} filePath - Path to load the field elements from
 * @returns {Object} - Object with chunk count and field elements as BigInts
 */
function loadPackedFields(filePath) {
  const fs = require('fs');
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  return {
    chunkCount: data.chunkCount,
    chunks: data.chunks.map(str => BigInt(str))
  };
}

module.exports = {
  packBufferToFields,
  packTabDataToFields,
  savePackedFields,
  loadPackedFields,
  BYTES_PER_FIELD
};