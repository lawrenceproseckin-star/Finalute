// file_commit.nr - Main circuit for proving tab preimages -> tab roots -> file root

use dep::std;

// Constants
global MAX_TABS: u32 = 16;
global MAX_CHUNKS_PER_TAB: u32 = 100; // Reduced from 1000 to 100 for faster proving

// Public inputs
struct PublicInputs {
    file_root: Field,
    tab_count: u32,
    tab_names_hash: Field,
    tab_roots: [Field; MAX_TABS]
}

// Private inputs (witness)
struct TabPreimage {
    chunk_count: u32,
    chunks: [Field; MAX_CHUNKS_PER_TAB]
}

fn main(
    public: PublicInputs,
    tab_names: [str<32>; MAX_TABS],
    tab_preimages: [TabPreimage; MAX_TABS]
) {
    // Validate tab count
    assert(public.tab_count <= MAX_TABS);
    
    // Verify tab names hash
    let computed_names_hash = compute_tab_names_hash(tab_names, public.tab_count);
    assert(computed_names_hash == public.tab_names_hash);
    
    // Verify each tab's root
    let mut leaves: [Field; MAX_TABS] = [0; MAX_TABS];
    
    for i in 0..MAX_TABS {
        if i < public.tab_count {
            // Compute tab root from preimage chunks
            let preimage = tab_preimages[i];
            let computed_tab_root = poseidon_sponge(preimage.chunks, preimage.chunk_count);
            
            // Verify tab root matches public input
            assert(computed_tab_root == public.tab_roots[i]);
            
            // Create leaf for Merkle tree: Poseidon(tabName || tabRoot)
            let name_hash = poseidon_hash_string(tab_names[i]);
            leaves[i] = poseidon_hash_2([name_hash, public.tab_roots[i]]);
        }
    }
    
    // Compute Merkle root and verify
    let computed_file_root = compute_merkle_root(leaves, public.tab_count);
    assert(computed_file_root == public.file_root);
}

// Poseidon hash for a single value
fn poseidon_hash_1(input: Field) -> Field {
    std::hash::poseidon::bn254::hash_1([input])
}

// Poseidon hash for two values
fn poseidon_hash_2(input: [Field; 2]) -> Field {
    std::hash::poseidon::bn254::hash_2(input)
}

// Poseidon hash for a string
fn poseidon_hash_string(input: str<32>) -> Field {
    let mut result = 0;
    let bytes = input.as_bytes();
    let len = bytes.len();
    
    // Simple implementation - in production would use a proper sponge
    for i in 0..len {
        result = poseidon_hash_2([result, bytes[i] as Field]);
    }
    
    result
}

// Poseidon sponge construction for absorbing many field elements
fn poseidon_sponge(chunks: [Field; MAX_CHUNKS_PER_TAB], chunk_count: u32) -> Field {
    let mut state = 0;
    
    for i in 0..MAX_CHUNKS_PER_TAB {
        if i < chunk_count {
            state = poseidon_hash_2([state, chunks[i]]);
        }
    }
    
    state
}

// Compute Merkle root from leaves using Poseidon
fn compute_merkle_root(leaves: [Field; MAX_TABS], leaf_count: u32) -> Field {
    let mut out = 0;

    if leaf_count == 0 {
        out = 0;
    } else if leaf_count == 1 {
        out = leaves[0];
    } else {
        // Simple binary Merkle tree implementation without while-loop
        let mut current_level = leaves;
        let mut current_count = leaf_count;

        // Iterate a fixed number of times, only updating while current_count > 1
        for _k in 0..MAX_TABS {
            if current_count > 1 {
                let next_count = (current_count + 1) / 2;
                let mut next_level: [Field; MAX_TABS] = [0; MAX_TABS];

                // Use fixed bound MAX_TABS/2 with runtime check
                for i in 0..MAX_TABS/2 {
                    if i < current_count / 2 {
                        next_level[i] = poseidon_hash_2([
                            current_level[i * 2],
                            current_level[i * 2 + 1]
                        ]);
                    }
                }

                // Handle odd number of nodes
                if current_count % 2 == 1 {
                    next_level[next_count - 1] = current_level[current_count - 1];
                }

                current_level = next_level;
                current_count = next_count;
            }
        }

        out = current_level[0];
    }

    out
}

// Compute hash of tab names to lock ordering
fn compute_tab_names_hash(tab_names: [str<32>; MAX_TABS], tab_count: u32) -> Field {
    let mut result = 0;
    
    for i in 0..MAX_TABS {
        if i < tab_count {
            let name_hash = poseidon_hash_string(tab_names[i]);
            result = poseidon_hash_2([result, name_hash]);
        }
    }
    
    result
}