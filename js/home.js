document.addEventListener('DOMContentLoaded', async () => {
    const puzzleList = document.getElementById('puzzle-list');

    try {
        const response = await fetch('data/manifest.json');
        const puzzles = await response.json();

        puzzleList.innerHTML = '';

        puzzles.forEach(puzzle => {
            const bestTime = localStorage.getItem(`bestTime_${puzzle.id}`);
            
            const card = document.createElement('div');
            card.className = `puzzle-card`;
            card.innerHTML = `
                <h3 style="font-size: 1.1rem; color: var(--text-primary);">${puzzle.title}</h3>
                <div class="pill-group">
                    <span class="pill">${puzzle.difficulty}</span>
                    <span class="pill">${puzzle.letters} Letters</span>
                </div>
                <div class="card-footer">
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Best Record</span>
                    <span style="font-size: 0.85rem; font-weight: 500; color: ${bestTime ? 'var(--accent-color)' : 'var(--text-secondary)'};">
                        ${bestTime || '--:--'}
                    </span>
                </div>
            `;
            card.onclick = () => location.href = `game?id=${puzzle.id}`;
            puzzleList.appendChild(card);
        });

        // Add Placeholders to make total of 9
        const totalTarget = 9;
        const numPlaceholders = Math.max(0, totalTarget - puzzles.length);
        
        for (let i = 0; i < numPlaceholders; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'puzzle-card placeholder';
            placeholder.innerHTML = `
                <div style="color: var(--text-secondary); font-size: 1.5rem; letter-spacing: 0.2em;">
                    ...
                </div>
            `;
            puzzleList.appendChild(placeholder);
        }
    } catch (error) {
        console.error('Error loading manifest:', error);
        puzzleList.innerHTML = '<div class="error">Failed to load puzzles. Please try again later.</div>';
    }
});
