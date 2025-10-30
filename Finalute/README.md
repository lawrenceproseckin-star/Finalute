# Finalute ZK Layer

A minimal ZK layer for financial reconciliation that:
- Computes a Poseidon hash per tab (treating each tab as a private blob)
- Computes a file-level Merkle root over (tabName || tabRoot) pairs
- Generates a single ZK proof that the prover knows private inputs whose Poseidon hashes equal the public tab roots
- Publishes only: {fileRoot, [tabRoots], proof} off-chain + anchors {fileRoot, proofHash} on-chain

## Project Structure

```
zk/
  noir/
    circuits/
      file_commit.nr      # proves tab preimages -> tab roots -> file root
    common/
      poseidon.nr
      merkle.nr
    Nargo.toml
src/
  ingest/
    read_excel.js
    normalize.js          # JSON normalization
    pack_to_fields.js     # byte->Field packing
  commit/
    poseidon_sponge.js
    tab_hash.js
    file_merkle.js
  prove/
    build_witness.js
    prove.js
    verify.js
  anchor/
    post.js               # store {fileRoot, proofHash}
  cli/
    finalute.js
out/
  tabRoots.json
  proofs/
```

## Prerequisites

- Node.js (v14+)
- Noir (v0.10.5)
- CSV files with the following names:
  - WE_12_10_25.csv
  - IMPORT_SHEET.csv
  - Physical_GVs.csv
  - Digital_GVs.csv
  - CC_bank.csv
  - CC_TIPS.csv
  - CC_Rec_06_10.csv
  - CC_Rec_10_10.csv
  - CC_Rec_12_10.csv

## Installation

1. Clone the repository
2. Install dependencies:
```
npm install csv-parse cbor
```

## Usage

### 1. Commit: Process CSV files and compute hashes

```
node src/cli/finalute.js commit --dir "/path/to/csv/files"
```

This command:
- Reads each CSV file from the specified directory
- Normalizes the data (trims whitespace, normalizes Unicode, coerces numbers to canonical form)
- Serializes each file to a deterministic byte representation
- Computes a Poseidon hash for each file
- Builds a Merkle tree over the file hashes
- Saves the tab roots and file root to `out/tabRoots.json`
- Saves the preimage chunks for each file (private data)

### 2. Prove: Generate ZK proof

```
node src/cli/finalute.js prove --tabs out/tabRoots.json
```

This command:
- Builds a witness for the Noir circuit using the tab roots and preimages
- Runs the Noir prover to generate a ZK proof
- Saves the proof to `out/proofs/file.proof`

### 3. Verify: Verify the ZK proof

```
node src/cli/finalute.js verify --tabs out/tabRoots.json --proof out/proofs/file.proof
```

This command:
- Verifies the ZK proof against the public inputs (file root, tab roots)
- Returns success or failure

### 4. Anchor: Store proof and file root

```
node src/cli/finalute.js anchor --file-root <file-root-from-tabRoots.json> --proof out/proofs/file.proof
```

This command:
- Computes the hash of the proof
- Simulates anchoring the file root and proof hash on-chain
- Saves the anchoring data to `out/anchor_data.json`

## Security Features

- **Deterministic serialization**: Any change in even one cell will change the tab preimage → tabRoot → fileRoot
- **Order locking**: Tab order is locked via tab_names_hash
- **Chunked preimage**: Support for large tabs via streaming sponge to keep witness size manageable
- **Public/private boundary**: Only fileRoot, [tabRoots], tab_names_hash, and tab_count are public; tab preimages are private

## Acceptance Tests

1. Run commit twice on the same file → identical tabRoots.json and fileRoot
2. Modify a single cell in Digital GVs and re-run:
   - Only that tab's root should change; fileRoot must also change
   - The proof must still verify with the new roots; the old proof must fail against new roots
3. Reorder tabs in code without updating tab_names_hash → proof fails (ordering locked)
4. Very large tabs: proving stays within reasonable memory by chunking preimages