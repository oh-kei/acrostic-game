document.addEventListener('DOMContentLoaded', async () => {
    const puzzleList = document.getElementById('puzzle-list');
    const featuredPuzzle = document.getElementById('featured-puzzle');
    const toggleBtn = document.getElementById('toggle-all-puzzles');
    const allPuzzlesContent = document.getElementById('all-puzzles-content');

    // Toggle logic
    toggleBtn.addEventListener('click', () => {
        toggleBtn.classList.toggle('active');
        allPuzzlesContent.classList.toggle('active');
    });

    try {
        const response = await fetch('data/manifest.json');
        const puzzles = await response.json();

        // Latest puzzle is the last one in manifest
        const latest = puzzles[puzzles.length - 1];
        const others = puzzles.slice(0, -1).reverse(); // Rest in reverse order

        featuredPuzzle.innerHTML = '';
        puzzleList.innerHTML = '';

        // Render Featured
        renderPuzzleCard(latest, featuredPuzzle, true);

        // Render Others
        others.forEach(puzzle => {
            renderPuzzleCard(puzzle, puzzleList, false);
        });

        // Add Placeholders to grid if needed
        const totalTarget = 6;
        const numPlaceholders = Math.max(0, totalTarget - others.length);
        for (let i = 0; i < numPlaceholders; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'puzzle-card placeholder';
            placeholder.innerHTML = `<div style="color: var(--text-secondary); font-size: 1.5rem; letter-spacing: 0.2em;">...</div>`;
            puzzleList.appendChild(placeholder);
        }

    } catch (error) {
        console.error('Error loading manifest:', error);
        puzzleList.innerHTML = '<div class="error">Failed to load puzzles.</div>';
    }
});

function renderPuzzleCard(puzzle, container, isFeatured) {
    const bestTimeRaw = localStorage.getItem(`bestTime_${puzzle.id}`);
    let bestTimeDisplay = '--:--';
    
    if (bestTimeRaw) {
        try {
            const parsed = JSON.parse(bestTimeRaw);
            bestTimeDisplay = `${parsed.time} (${parsed.hints} hints)`;
        } catch (e) {
            bestTimeDisplay = bestTimeRaw;
        }
    }
    
    const card = document.createElement('div');
    card.className = isFeatured ? 'featured-card' : 'puzzle-card';
    card.innerHTML = `
        <h3 style="${isFeatured ? '' : 'font-size: 1.1rem;'} color: var(--text-primary);">${puzzle.title}</h3>
        <div class="pill-group">
            <span class="pill">${puzzle.difficulty}</span>
            <span class="pill">${puzzle.letters} Letters</span>
        </div>
        <div class="card-footer">
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Best Record</span>
            <span style="font-size: 0.85rem; font-weight: 500; color: ${bestTimeRaw ? 'var(--accent-color)' : 'var(--text-secondary)'};">
                ${bestTimeDisplay}
            </span>
        </div>
    `;
    card.onclick = (e) => {
        e.preventDefault();
        window.location.href = `game?id=${puzzle.id}`;
    };
    container.appendChild(card);
}
