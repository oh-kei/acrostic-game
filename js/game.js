/**
 * Main Game Logic
 */

let puzzleData = null;
let mapping = null;
let quoteState = []; 
let clueState = [];  

// Timer & State
let startTime = null;
let timerInterval = null;
let isPaused = false;
let gameFinished = false;
let secondsElapsed = 0;
let clueCount = 3;
let totalHintsUsed = 0;
let isHintMode = false;
let firstHintUsed = false;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    console.log("Current URL Search Params:", window.location.search);
    const puzzleId = params.get('id');

    if (!puzzleId) {
        console.error("No puzzle ID found in URL.");
        document.getElementById('puzzle-title').innerText = 'No Puzzle Selected';
        // Only redirect after a delay so we can see the error, or just let the user go back manually
        return;
    }

    try {
        const manifestResponse = await fetch('data/manifest.json');
        const manifest = await manifestResponse.json();
        const puzzle = manifest.find(p => p.id === puzzleId);

        if (!puzzle) {
            throw new Error('Puzzle not found');
        }

        const response = await fetch(puzzle.file);
        puzzleData = await response.json();
        
        initGame();
        startTimer();
        updateProgress();
        setupEventListeners();

        // Auto-focus the word entry box
        const genInput = document.getElementById('general-word-input');
        if (genInput) genInput.focus();
    } catch (error) {
        console.error('Error loading puzzle:', error);
        document.getElementById('puzzle-title').innerText = 'Error Loading Puzzle';
    }
});

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            togglePause();
        }
    });

    const genInput = document.getElementById('general-word-input');
    if (genInput) {
        genInput.addEventListener('input', () => {
            handleGeneralSubmit();
        });
        genInput.addEventListener('focus', () => {
            clearAllHighlights();
            // Default: no cursor
            genInput.style.caretColor = 'transparent';
        });
        genInput.addEventListener('click', () => {
            // If already focused, show cursor
            if (document.activeElement === genInput) {
                genInput.style.caretColor = 'var(--accent-color)';
            }
        });
    }

    // Scroll listener for sticky entry box
    window.addEventListener('scroll', () => {
        const entry = document.querySelector('.entry-section');
        if (entry) {
            if (window.scrollY > 20) {
                entry.classList.add('scrolled');
            } else {
                entry.classList.remove('scrolled');
            }
        }
    });
}

function initGame() {
    document.getElementById('puzzle-title').innerText = puzzleData.title;

    // Generate mapping
    mapping = Utils.generateMapping(puzzleData.quote, puzzleData.clues);
    
    // Initialize states
    const cleanQuote = puzzleData.quote.toUpperCase().replace(/[^A-Z]/g, "");
    quoteState = new Array(cleanQuote.length).fill("");
    clueState = mapping.map(wordMap => wordMap.map(m => m.isAlpha ? "" : m.char));

    renderQuote();
    renderClues();
}

function renderQuote() {
    const quoteGrid = document.getElementById('quote-grid');
    quoteGrid.innerHTML = '';

    const words = puzzleData.quote.split(" ");
    let globalCharIndex = 0;

    words.forEach(word => {
        const wordBlock = document.createElement('div');
        wordBlock.className = 'word-block';

        for (let char of word) {
            const cleanChar = char.toUpperCase();
            const isAlpha = /[A-Z]/.test(cleanChar);

            const cell = document.createElement('div');
            cell.className = 'letter-cell';
            
            if (isAlpha) {
                const charIdx = globalCharIndex++;
                cell.id = `quote-cell-${charIdx}`;
                cell.innerHTML = `
                    <span class="letter-val">${quoteState[charIdx]}</span>
                    <span class="letter-num">${charIdx + 1}</span>
                `;
                
                if (quoteState[charIdx]) cell.classList.add('filled');
                
                // Clicking a quote cell highlights the corresponding clue cell or reveals a hint
                cell.onclick = () => {
                    if (isHintMode) {
                        useClue('quote', charIdx);
                    } else {
                        focusClueFromQuote(charIdx);
                    }
                };
            } else {
                cell.classList.add('non-alpha');
                cell.classList.add('punctuation');
                cell.innerHTML = `<span class="letter-val">${char}</span>`;
            }
            
            wordBlock.appendChild(cell);
        }
        quoteGrid.appendChild(wordBlock);
    });
}

function renderClues() {
    const cluesList = document.getElementById('clues-list');
    cluesList.innerHTML = '';

    puzzleData.clues.forEach((clue, clueIdx) => {
        const row = document.createElement('div');
        row.className = 'clue-panel';
        row.id = `clue-panel-${clueIdx}`;
        
        row.innerHTML = `
            <div class="clue-label">${String.fromCharCode(65 + clueIdx)}.</div>
            <div class="clue-text">${clue.hint}</div>
            <div class="clue-input-group" id="clue-inputs-${clueIdx}"></div>
        `;
        
        const inputGroup = row.querySelector('.clue-input-group');
        const wordMapping = mapping[clueIdx];

        wordMapping.forEach((mapEntry, charIdx) => {
            if (mapEntry.isAlpha) {
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.className = 'clue-char-input';
                input.dataset.clueIdx = clueIdx;
                input.dataset.charIdx = charIdx;
                input.dataset.quoteIdx = mapEntry.quoteIndex;
                input.id = `clue-input-${clueIdx}-${charIdx}`;
                input.value = clueState[clueIdx][charIdx];

                input.oninput = (e) => handleInput(e.target);
                input.onkeydown = (e) => handleKeyDown(e);
                input.onfocus = () => {
                    if (input.readOnly) return;
                    highlightQuoteCell(mapEntry.quoteIndex);
                    highlightCluePanel(clueIdx);
                };
                
                input.onclick = (e) => {
                    if (isHintMode) {
                        e.preventDefault();
                        input.blur(); // Prevent focus/cursor
                        useClue('clue', mapEntry.quoteIndex, clueIdx, charIdx);
                    }
                };

                inputGroup.appendChild(input);
            } else {
                const span = document.createElement('span');
                span.className = 'clue-punctuation';
                span.innerText = mapEntry.char;
                inputGroup.appendChild(span);
            }
        });

        cluesList.appendChild(row);
    });
}

function handleInput(input) {
    const clueIdx = parseInt(input.dataset.clueIdx);
    const charIdx = parseInt(input.dataset.charIdx);
    const quoteIdx = parseInt(input.dataset.quoteIdx);
    const val = input.value.toUpperCase();

    input.value = val;
    clueState[clueIdx][charIdx] = val;

    // Update quote state if mapped
    if (quoteIdx !== -1) {
        quoteState[quoteIdx] = val;
        updateQuoteCell(quoteIdx, val);
        
        // Sync other clue inputs that might map to the same quote position (if any)
        // Note: In standard acrostics, each clue letter maps to ONE quote cell.
    }

    // Move to next input
    if (val !== "") {
        focusNextInput(clueIdx, charIdx);
    }

    updateProgress();
    validateWords();
    checkVictory();
}

function focusNextInput(clueIdx, charIdx) {
    let nextCharIdx = charIdx + 1;

    // Only advance if within the current word
    if (nextCharIdx < mapping[clueIdx].length) {
        const nextInput = document.getElementById(`clue-input-${clueIdx}-${nextCharIdx}`);
        if (nextInput) {
            if (nextInput.readOnly || nextInput.tagName === 'SPAN') {
                focusNextInput(clueIdx, nextCharIdx);
            } else {
                nextInput.focus();
            }
        }
    }
    // Logic to jump to next word removed per request
}

function handleKeyDown(e) {
    const input = e.target;
    if (input.readOnly) return;

    const clueIdx = parseInt(input.dataset.clueIdx);
    const charIdx = parseInt(input.dataset.charIdx);

    if (e.key === 'Backspace') {
        if (input.value === '') {
            // Prevent accidental multi-deletion when holding down
            if (e.repeat) {
                e.preventDefault();
                return;
            }
            
            // Move to previous non-readOnly input
            focusPreviousInput(clueIdx, charIdx);
        }
    }
}

function focusPreviousInput(clueIdx, charIdx) {
    let prevClueIdx = clueIdx;
    let prevCharIdx = charIdx - 1;

    if (prevCharIdx < 0) {
        prevClueIdx--;
        if (prevClueIdx < 0) return;
        prevCharIdx = mapping[prevClueIdx].length - 1;
    }

    const prevInput = document.getElementById(`clue-input-${prevClueIdx}-${prevCharIdx}`);
    if (prevInput) {
        if (prevInput.readOnly || prevInput.tagName === 'SPAN') {
            focusPreviousInput(prevClueIdx, prevCharIdx);
        } else {
            prevInput.focus();
        }
    }
}

function updateQuoteCell(idx, val) {
    const cell = document.getElementById(`quote-cell-${idx}`);
    if (cell) {
        cell.querySelector('.letter-val').innerText = val;
        if (val) cell.classList.add('filled');
        else cell.classList.remove('filled');
    }
}

function highlightQuoteCell(idx) {
    // Clear previous highlights
    document.querySelectorAll('.letter-cell').forEach(c => c.classList.remove('active'));
    
    const cell = document.getElementById(`quote-cell-${idx}`);
    if (cell) cell.classList.add('active');
}

function focusClueFromQuote(quoteIdx) {
    // Clear previous panel highlights
    document.querySelectorAll('.clue-panel').forEach(p => p.classList.remove('active'));

    // Find which clue cell maps to this quote cell
    for (let cIdx = 0; cIdx < mapping.length; cIdx++) {
        for (let charIdx = 0; charIdx < mapping[cIdx].length; charIdx++) {
            if (mapping[cIdx][charIdx].quoteIndex === quoteIdx) {
                const input = document.getElementById(`clue-input-${cIdx}-${charIdx}`);
                if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    highlightCluePanel(cIdx);
                }
                return;
            }
        }
    }
}

function highlightCluePanel(idx) {
    document.querySelectorAll('.clue-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`clue-panel-${idx}`);
    if (panel) panel.classList.add('active');
}

function clearAllHighlights() {
    document.querySelectorAll('.letter-cell').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.clue-panel').forEach(p => p.classList.remove('active'));
}

function updateProgress() {
    const total = quoteState.length;
    const filled = quoteState.filter(c => c !== "").length;
    const percent = Math.floor((filled / total) * 100);
    
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('progress-text').innerText = `${filled} of ${total} filled — ${percent}%`;
}

function checkVictory() {
    const cleanQuote = puzzleData.quote.toUpperCase().replace(/[^A-Z]/g, "");
    const currentState = quoteState.join("");
    
    if (currentState === cleanQuote && !gameFinished) {
        gameFinished = true;
        stopTimer();
        saveBestTime();
        
        const finalTime = document.getElementById('timer').innerText;
        document.getElementById('final-stats').innerText = `You completed the puzzle in ${finalTime} with ${totalHintsUsed} hints!`;
        document.getElementById('success-overlay').style.display = 'flex';
    }
}

function closeSuccessOverlay() {
    document.getElementById('success-overlay').style.display = 'none';
}


/**
 * Validates individual words in the quote and clues.
 * Gives correct words a light green background.
 */
function validateWords() {
    // 1. Identify Correct Clue Words
    const correctClueIndices = new Set();
    mapping.forEach((wordMapping, clueIdx) => {
        const targetWord = puzzleData.clues[clueIdx].word.toUpperCase();
        let isCorrect = true;
        
        wordMapping.forEach((mapEntry, charIdx) => {
            if (clueState[clueIdx][charIdx] !== targetWord[charIdx]) {
                isCorrect = false;
            }
        });

        if (isCorrect) correctClueIndices.add(clueIdx);

        // Highlight the whole panel if correct
        const panel = document.getElementById(`clue-panel-${clueIdx}`);
        if (panel) {
            if (isCorrect) panel.classList.add('correct-panel');
            else panel.classList.remove('correct-panel');
        }
    });

    // 2. Identify Correct Quote Words and map cells to words
    const quoteWords = puzzleData.quote.toUpperCase().split(" ");
    const correctQuoteWordIndices = new Set();
    const cellToWordMap = []; // Maps globalCharIndex to wordIdx
    let currentCellOffset = 0;

    quoteWords.forEach((word, wordIdx) => {
        const cleanWord = word.replace(/[^A-Z]/g, "");
        const wordLength = cleanWord.length;
        
        let isWordCorrect = true;
        for (let i = 0; i < wordLength; i++) {
            const idx = currentCellOffset + i;
            cellToWordMap[idx] = wordIdx;
            if (quoteState[idx] !== cleanWord[i]) {
                isWordCorrect = false;
            }
        }
        if (isWordCorrect) correctQuoteWordIndices.add(wordIdx);
        currentCellOffset += wordLength;
    });

    // 3. Apply Styles and Locking to Quote Grid
    currentCellOffset = 0;
    quoteWords.forEach((word, wordIdx) => {
        const cleanWord = word.replace(/[^A-Z]/g, "");
        const wordLength = cleanWord.length;
        const isQuoteWordCorrect = correctQuoteWordIndices.has(wordIdx);

        for (let i = 0; i < wordLength; i++) {
            const cellIdx = currentCellOffset + i;
            const cell = document.getElementById(`quote-cell-${cellIdx}`);
            if (cell) {
                // Find if the clue providing this letter is correct
                let clueIsCorrectForCell = false;
                for (let cIdx = 0; cIdx < mapping.length; cIdx++) {
                    if (mapping[cIdx].some(m => m.quoteIndex === cellIdx)) {
                        if (correctClueIndices.has(cIdx)) {
                            clueIsCorrectForCell = true;
                        }
                        break;
                    }
                }

                if (isQuoteWordCorrect || clueIsCorrectForCell) {
                    cell.classList.add('correct');
                    cell.style.pointerEvents = 'none';
                } else {
                    cell.classList.remove('correct');
                    cell.style.pointerEvents = 'auto';
                }
                cell.classList.remove('letter-correct');
            }
        }
        currentCellOffset += wordLength;
    });

    // 4. Apply Styles and Locking to Clue Inputs
    mapping.forEach((wordMapping, clueIdx) => {
        const isClueWordCorrect = correctClueIndices.has(clueIdx);
        
        wordMapping.forEach((mapEntry, charIdx) => {
            const input = document.getElementById(`clue-input-${clueIdx}-${charIdx}`);
            if (input && mapEntry.isAlpha) {
                const quoteIdx = mapEntry.quoteIndex;
                const quoteWordIdx = cellToWordMap[quoteIdx];
                const isQuoteWordCorrect = correctQuoteWordIndices.has(quoteWordIdx);

                if (isClueWordCorrect || isQuoteWordCorrect) {
                    input.classList.add('correct');
                    input.readOnly = true;
                    input.tabIndex = -1;
                } else {
                    input.classList.remove('correct');
                    input.readOnly = false;
                    input.tabIndex = 0;
                }
            }
        });
    });
}



/**
 * Handles submission from the general word entry box.
 */
function handleGeneralSubmit() {
    const input = document.getElementById('general-word-input');
    const word = input.value.toUpperCase().trim();
    if (!word) return;

    let found = false;

    // 1. Check Clue Words
    puzzleData.clues.forEach((clue, clueIdx) => {
        const cleanClueWord = clue.word.toUpperCase().replace(/[^A-Z]/g, "");
        if (cleanClueWord === word) {
            // Check if this clue is already correct
            const panel = document.getElementById(`clue-panel-${clueIdx}`);
            if (panel && panel.classList.contains('correct-panel')) {
                return; // Already correct
            }

            found = true;
            // Autofill this clue
            mapping[clueIdx].forEach((mapEntry, charIdx) => {
                if (mapEntry.isAlpha) {
                    const char = mapEntry.char;
                    clueState[clueIdx][charIdx] = char;
                    quoteState[mapEntry.quoteIndex] = char;
                    
                    const clueInput = document.getElementById(`clue-input-${clueIdx}-${charIdx}`);
                    if (clueInput) clueInput.value = char;
                    
                    const quoteCell = document.getElementById(`quote-cell-${mapEntry.quoteIndex}`);
                    if (quoteCell) quoteCell.querySelector('.letter-val').innerText = char;
                }
            });
        }
    });

    // 2. Check Quote Words
    const quoteWords = puzzleData.quote.toUpperCase().split(" ");
    let charOffset = 0;
    quoteWords.forEach((qWord) => {
        const cleanQWord = qWord.replace(/[^A-Z]/g, "");
        if (cleanQWord === word) {
            // Check if this quote word is already correct
            let isAlreadyCorrect = true;
            for (let i = 0; i < cleanQWord.length; i++) {
                if (quoteState[charOffset + i] !== cleanQWord[i]) {
                    isAlreadyCorrect = false;
                    break;
                }
            }
            
            if (isAlreadyCorrect) {
                charOffset += cleanQWord.length;
                return;
            }

            found = true;
            // Autofill this word in the quote grid
            for (let i = 0; i < cleanQWord.length; i++) {
                const qIdx = charOffset + i;
                const char = cleanQWord[i];
                quoteState[qIdx] = char;
                
                const quoteCell = document.getElementById(`quote-cell-${qIdx}`);
                if (quoteCell) quoteCell.querySelector('.letter-val').innerText = char;

                // Also find and update the corresponding clue input
                mapping.forEach((wordMapping, clueIdx) => {
                    wordMapping.forEach((mapEntry, clueCharIdx) => {
                        if (mapEntry.quoteIndex === qIdx) {
                            clueState[clueIdx][clueCharIdx] = char;
                            const clueInput = document.getElementById(`clue-input-${clueIdx}-${clueCharIdx}`);
                            if (clueInput) clueInput.value = char;
                        }
                    });
                });
            }
        }
        charOffset += cleanQWord.length;
    });

    if (found) {
        updateProgress();
        validateWords();
        checkVictory();
        // Clear box only if word is fully typed and matches? 
        // User said "autocheck... for every character entered"
        // If it's a full match, we can clear or just let them continue.
        // Let's clear if it's a full match for a clue or quote word.
        input.value = ''; 
    }
}

/**
 * Timer Functions
 */
function startTimer() {
    secondsElapsed = 0;
    timerInterval = setInterval(() => {
        if (!isPaused) {
            secondsElapsed++;
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    document.getElementById('timer').innerText = 
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function togglePause() {
    if (gameFinished) return;
    isPaused = !isPaused;
    document.getElementById('pause-overlay').style.display = isPaused ? 'flex' : 'none';
}

function saveBestTime() {
    const finalTime = document.getElementById('timer').innerText;
    const puzzleId = puzzleData.id;
    const currentBestStr = localStorage.getItem(`bestTime_${puzzleId}`);
    
    let isNewBest = false;
    if (!currentBestStr) {
        isNewBest = true;
    } else {
        try {
            const currentBest = JSON.parse(currentBestStr);
            if (compareTimes(finalTime, currentBest.time) < 0) {
                isNewBest = true;
            } else if (compareTimes(finalTime, currentBest.time) === 0 && totalHintsUsed < currentBest.hints) {
                isNewBest = true;
            }
        } catch (e) {
            // Fallback for old format
            if (compareTimes(finalTime, currentBestStr) < 0) isNewBest = true;
        }
    }

    if (isNewBest) {
        localStorage.setItem(`bestTime_${puzzleId}`, JSON.stringify({
            time: finalTime,
            hints: totalHintsUsed
        }));
    }
}

function compareTimes(t1, t2) {
    const [m1, s1] = t1.split(":").map(Number);
    const [m2, s2] = t2.split(":").map(Number);
    return (m1 * 60 + s1) - (m2 * 60 + s2);
}

/**
 * Clue/Hint Logic
 */
function toggleHintMode() {
    if (clueCount <= 0) {
        alert("No clues remaining!");
        return;
    }
    
    isHintMode = !isHintMode;
    const hintBtn = document.getElementById('hint-btn');
    const hintMsg = document.getElementById('hint-message');
    
    if (isHintMode) {
        hintBtn.classList.add('active');
        hintBtn.innerText = 'Cancel';
        document.body.style.cursor = 'help';
        
        hintMsg.innerText = "Select a letter to reveal it";
        hintMsg.classList.add('visible');

        // Add visual target class to all inputs/cells
        document.querySelectorAll('.letter-cell:not(.non-alpha), .clue-char-input:not([readonly])').forEach(el => {
            el.classList.add('hint-target');
        });
    } else {
        deactivateHintMode();
    }
}

function deactivateHintMode() {
    isHintMode = false;
    const hintBtn = document.getElementById('hint-btn');
    const hintMsg = document.getElementById('hint-message');
    
    hintBtn.classList.remove('active');
    hintBtn.innerText = 'Hint';
    document.body.style.cursor = 'default';
    
    hintMsg.classList.remove('visible');
    
    document.querySelectorAll('.hint-target').forEach(el => {
        el.classList.remove('hint-target');
    });
}

function useClue(type, quoteIdx, clueIdx, charIdx) {
    if (!isHintMode || clueCount <= 0) return;

    // Get the correct character
    const cleanQuote = puzzleData.quote.toUpperCase().replace(/[^A-Z]/g, "");
    const correctChar = cleanQuote[quoteIdx];

    // Check if it's already correct
    if (quoteState[quoteIdx] === correctChar) {
        // Just deactivate if they click a correct cell, or show a small message
        const hintMsg = document.getElementById('hint-message');
        hintMsg.innerText = "Letter already correct!";
        setTimeout(() => {
            if (isHintMode) hintMsg.innerText = "Select a letter to reveal it";
        }, 1500);
        return;
    }

    // Apply the clue
    clueCount--;
    totalHintsUsed++;
    document.getElementById('clue-count').innerText = `${clueCount} clues left`;

    // Update quote state
    quoteState[quoteIdx] = correctChar;
    updateQuoteCell(quoteIdx, correctChar);

    // Sync all clue inputs that map to this quote position
    mapping.forEach((wordMapping, cIdx) => {
        wordMapping.forEach((mapEntry, cCharIdx) => {
            if (mapEntry.quoteIndex === quoteIdx) {
                clueState[cIdx][cCharIdx] = correctChar;
                const input = document.getElementById(`clue-input-${cIdx}-${cCharIdx}`);
                if (input) {
                    input.value = correctChar;
                }
            }
        });
    });

    deactivateHintMode();
    updateProgress();
    validateWords();
    checkVictory();
}

// Removed the redundant DOMContentLoaded listener at the bottom since I moved it to setupEventListeners
