// merkle.nr - Merkle tree utility functions

use dep::std;
use crate::common::poseidon;

// Compute Merkle root from leaves using Poseidon
pub fn compute_root(leaves: [Field], leaf_count: u32) -> Field {
    if leaf_count == 0 {
        return 0;
    }
    
    if leaf_count == 1 {
        return leaves[0];
    }
    
    // Simple binary Merkle tree implementation
    let mut current_level = leaves;
    let mut current_count = leaf_count;
    
    while current_count > 1 {
        let next_count = (current_count + 1) / 2;
        let mut next_level: [Field] = [0; next_count];
        
        for i in 0..(current_count / 2) {
            next_level[i] = poseidon::hash_2([current_level[i * 2], current_level[i * 2 + 1]]);
        }
        
        // Handle odd number of nodes
        if current_count % 2 == 1 {
            next_level[next_count - 1] = current_level[current_count - 1];
        }
        
        current_level = next_level;
        current_count = next_count;
    }
    
    current_level[0]
}