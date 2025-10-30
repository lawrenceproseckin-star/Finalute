// poseidon.nr - Poseidon hash utility functions

use dep::std;

// Poseidon hash for a single value
pub fn hash_1(input: Field) -> Field {
    std::hash::poseidon::bn254::hash_1([input])
}

// Poseidon hash for two values
pub fn hash_2(input: [Field; 2]) -> Field {
    std::hash::poseidon::bn254::hash_2(input)
}

// Poseidon hash for three values
pub fn hash_3(input: [Field; 3]) -> Field {
    std::hash::poseidon::bn254::hash_3(input)
}

// Poseidon hash for a string
pub fn hash_string(input: str<32>) -> Field {
    let mut result = 0;
    let bytes = input.as_bytes();
    let len = bytes.len();
    
    // Simple implementation - in production would use a proper sponge
    for i in 0..len {
        result = hash_2([result, bytes[i] as Field]);
    }
    
    result
}

// Poseidon sponge construction for absorbing many field elements
pub fn sponge(chunks: [Field], chunk_count: u32) -> Field {
    let mut state = 0;
    
    for i in 0..chunk_count {
        state = hash_2([state, chunks[i]]);
    }
    
    state
}