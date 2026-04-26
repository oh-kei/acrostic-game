/**
 * Utility functions for Acrostic Game
 */

const Utils = {
    /**
     * Generates a mapping between clue word letters and quote letters.
     * @param {string} quote - The full quote string.
     * @param {Array} clues - Array of {word, hint} objects.
     */
    generateMapping(quote, clues) {
        const cleanQuote = quote.toUpperCase().replace(/[^A-Z]/g, "");
        const quoteChars = cleanQuote.split("");
        
        // Create an array of indices [0, 1, ..., N-1]
        const indices = Array.from({ length: quoteChars.length }, (_, i) => i);
        
        // Shuffle indices deterministically for the puzzle
        this.shuffle(indices);

        const mapping = []; // Array of word mappings
        let currentIndex = 0;

        clues.forEach(clue => {
            const word = clue.word.toUpperCase();
            const wordMapping = [];
            
            for (let i = 0; i < word.length; i++) {
                const char = word[i];
                const isAlpha = /[A-Z]/.test(char);

                if (isAlpha) {
                    // Find a position in the quote that matches this character and hasn't been used
                    const foundIndex = indices.findIndex(idx => quoteChars[idx] === char);
                    
                    if (foundIndex === -1) {
                        console.error(`Letter ${char} not found in quote or exhausted!`);
                        wordMapping.push({ char, quoteIndex: -1, isAlpha: true });
                    } else {
                        const quoteIdx = indices.splice(foundIndex, 1)[0];
                        wordMapping.push({ char, quoteIndex: quoteIdx, isAlpha: true });
                    }
                } else {
                    // Non-alpha characters are there by default and don't map to the quote
                    wordMapping.push({ char, quoteIndex: -1, isAlpha: false });
                }
            }
            mapping.push(wordMapping);
        });

        return mapping;
    },

    /**
     * Fisher-Yates Shuffle
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
};
