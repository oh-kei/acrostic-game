
const quote = "Maddi has charm and beaut thats another way to say shes cute".toUpperCase().replace(/[^A-Z]/g, "");
const words = ["CHUNDER", "ASS", "THEMATIC", "DATASHEET", "BROADWAY", "SAMANTHA", "YOUTHS"].map(w => w.toUpperCase());

const quoteCount = {};
for (const char of quote) {
    quoteCount[char] = (quoteCount[char] || 0) + 1;
}

const wordsCount = {};
for (const word of words) {
    for (const char of word) {
        wordsCount[char] = (wordsCount[char] || 0) + 1;
    }
}

console.log("Quote Letters:", quote.length);
console.log("Words Letters:", words.reduce((acc, w) => acc + w.length, 0));

console.log("Quote Counts:", JSON.stringify(quoteCount, null, 2));
console.log("Words Counts:", JSON.stringify(wordsCount, null, 2));

const diff = {};
const allChars = new Set([...Object.keys(quoteCount), ...Object.keys(wordsCount)]);
for (const char of allChars) {
    const q = quoteCount[char] || 0;
    const w = wordsCount[char] || 0;
    if (q !== w) {
        diff[char] = { quote: q, words: w };
    }
}

console.log("Differences:", JSON.stringify(diff, null, 2));
