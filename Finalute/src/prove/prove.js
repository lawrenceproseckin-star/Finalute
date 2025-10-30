// prove.js - Functions for generating ZK proofs with serialized nargo execution

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Serialize nargo prove runs to avoid multiple concurrent instances
let proveQueue = Promise.resolve();

function runNargoProve(noirDir) {
  return new Promise((resolve, reject) => {
    logger.debug('Starting nargo prove', { noirDir });
    const child = exec('cd ' + noirDir + ' && nargo prove', (error, stdout, stderr) => {
      if (stdout) {
        logger.debug('nargo stdout', { stdout });
      }
      if (stderr) {
        logger.debug('nargo stderr', { stderr });
      }
      if (error) {
        logger.error('Error generating proof', { message: error.message });
        try { child.kill('SIGKILL'); } catch (_) {}
        reject(error);
        return;
      }
      logger.info('nargo prove completed successfully');
      resolve(true);
    });
  });
}

/**
 * Generate a ZK proof using Noir
 * @param {string} witnessPath - Path to the witness file
 * @param {string} outputDir - Directory to save the proof
 * @returns {Promise<string>} - Path to the generated proof
 */
async function generateProof(witnessPath, outputDir) {
  const noirDir = path.join(__dirname, '../../zk/noir');
  logger.info('Preparing to generate proof', { witnessPath, outputDir, noirDir });

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    logger.debug('Created output directory', { outputDir });
  }

  // Copy witness to Noir directory
  const noirWitnessPath = path.join(noirDir, 'witness.json');
  fs.copyFileSync(witnessPath, noirWitnessPath);
  logger.debug('Copied witness to noir directory', { noirWitnessPath });

  // Enqueue and serialize the nargo execution to avoid multiple instances
  proveQueue = proveQueue.then(() => runNargoProve(noirDir));
  await proveQueue;

  // Copy proof to output directory
  const proofPath = path.join(noirDir, 'proofs/file_commit.proof');
  const outputPath = path.join(outputDir, 'file.proof');

  if (fs.existsSync(proofPath)) {
    fs.copyFileSync(proofPath, outputPath);
    logger.info('Proof copied to output directory', { outputPath });
    return outputPath;
  } else {
    logger.error('Proof file not found', { proofPath });
    throw new Error('Proof file not found');
  }
}

/**
 * Compute the hash of a proof file
 * @param {string} proofPath - Path to the proof file
 * @returns {string} - Hex string of the proof hash
 */
function computeProofHash(proofPath) {
  const crypto = require('crypto');
  const proofData = fs.readFileSync(proofPath);
  const hash = crypto.createHash('sha256').update(proofData).digest('hex');
  const hex = '0x' + hash;
  logger.debug('Computed proof hash', { proofPath, hash: hex });
  return hex;
}

module.exports = {
  generateProof,
  computeProofHash
};