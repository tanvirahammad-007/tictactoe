// Firebase Integration
import { db } from './firebase-config.js';

// Game State
const gameState = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameMode: null,
    difficulty: null,
    p1Name: 'Player one',
    p2Name: 'Player two',
    isGameOver: false,
    stats: JSON.parse(localStorage.getItem('ttt_stats')) || {
        total: 0,
        p1Wins: 0,
        p2Wins: 0,
        draws: 0
    },
    scores: { p1: 0, p2: 0 },
    musicEnabled: localStorage.getItem('ttt_music') === 'true' || false,
    fromGame: false,
    // Online game state
    isOnline: false,
    gameCode: null,
    isHost: false,
    mySymbol: null,
    opponentName: null,
    checkInterval: null
};

// Win Combinations
const winCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Audio
let bgMusic = null;

// Get bgMusic element when DOM is ready
function getBgMusicElement() {
    if (!bgMusic) {
        bgMusic = document.getElementById('bgMusic');
    }
    return bgMusic;
}

// Check if storage API is available
const hasStorage = typeof window !== 'undefined' && window.localStorage;

// Initialize
window.addEventListener('load', () => {
    showMenu();
    initMusic();
    setupMusicToggle();
});

// Music Functions
function setupMusicToggle() {
    const musicToggle = document.getElementById('musicToggle');
    if (musicToggle) {
        musicToggle.addEventListener('click', toggleMusic);
        musicToggle.style.cursor = 'pointer';
    }
}

function initMusic() {
    const musicToggle = document.getElementById('musicToggle');
    
    if (gameState.musicEnabled && musicToggle) {
        musicToggle.parentElement.classList.add('active');
        playMusic();
    }
}

function toggleMusic() {
    const musicToggle = document.getElementById('musicToggle');
    
    gameState.musicEnabled = !gameState.musicEnabled;
    localStorage.setItem('ttt_music', gameState.musicEnabled);
    
    if (musicToggle) {
        if (gameState.musicEnabled) {
            musicToggle.parentElement.classList.add('active');
            playMusic();
        } else {
            musicToggle.parentElement.classList.remove('active');
            pauseMusic();
        }
    }
}

function playMusic() {
    const audio = getBgMusicElement();
    if (gameState.musicEnabled && audio) {
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
}

function pauseMusic() {
    const audio = getBgMusicElement();
    if (audio) {
        audio.pause();
    }
}

// Navigation Functions
function showMenu() {
    hideAll();
    gameState.fromGame = false;
    
    // Clean up online game
    if (gameState.checkInterval) {
        clearInterval(gameState.checkInterval);
        gameState.checkInterval = null;
    }
    
    if (gameState.isOnline && gameState.gameCode) {
        cleanupOnlineGame();
    }
    
    gameState.isOnline = false;
    gameState.gameCode = null;
    gameState.isHost = false;
    gameState.mySymbol = null;
    
    // Remove online status indicator
    const indicator = document.querySelector('.online-status');
    if (indicator) indicator.remove();
    
    document.getElementById('menuScreen').classList.remove('hidden');
}

function showDifficultySelection() {
    hideAll();
    document.getElementById('difficultyScreen').classList.remove('hidden');
}

function showNameInput() {
    hideAll();
    document.getElementById('nameInputScreen').classList.remove('hidden');
}

function showSettings() {
    hideAll();
    document.getElementById('settingsScreen').classList.remove('hidden');
}

function showSettingsFromGame() {
    gameState.fromGame = true;
    hideAll();
    document.getElementById('settingsScreen').classList.remove('hidden');
}

function backFromSettings() {
    if (gameState.fromGame) {
        backToGame();
    } else {
        showMenu();
    }
}

function backToGame() {
    hideAll();
    document.getElementById('gameScreen').classList.remove('hidden');
}

function showStatsFromSettings() {
    hideAll();
    showStats();
}

function showAbout() {
    hideAll();
    document.getElementById('aboutScreen').classList.remove('hidden');
}

function showOnlineMenu() {
    if (!hasStorage) {
        alert('Online multiplayer is not available in this environment. Please use the standalone version of the game.');
        return;
    }
    hideAll();
    document.getElementById('onlineMenuScreen').classList.remove('hidden');
}

function showCreateGame() {
    hideAll();
    document.getElementById('createGameScreen').classList.remove('hidden');
    document.getElementById('gameCodeSection').classList.add('hidden');
}

function hideAll() {
    document.querySelectorAll('.menu-screen, .name-input-screen, .game-screen, .stats-screen, .settings-screen, .about-screen')
        .forEach(s => s.classList.add('hidden'));
}

// Game Functions
function startGame(mode, diff = null) {
    gameState.gameMode = mode;
    gameState.difficulty = diff;
    gameState.scores = { p1: 0, p2: 0 };

    if (mode === 'computer') {
        const playerName = document.getElementById('playerNameInput').value.trim();
        gameState.p1Name = playerName || 'Player one';
        gameState.p2Name = 'Computer';
    } else {
        gameState.p1Name = document.getElementById('p1Input').value.trim() || 'Player one';
        gameState.p2Name = document.getElementById('p2Input').value.trim() || 'Player two';
    }

    document.getElementById('p1NameDisplay').textContent = gameState.p1Name;
    document.getElementById('p2NameDisplay').textContent = gameState.p2Name;

    resetGame();
    updateScoreDisplay();
    hideAll();
    document.getElementById('gameScreen').classList.remove('hidden');
}

function resetGame() {
    gameState.board = Array(9).fill(null);
    gameState.currentPlayer = 'X';
    gameState.isGameOver = false;
    renderBoard();
    document.querySelectorAll('.win-line').forEach(line => line.remove());
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    gameState.board.forEach((cell, i) => {
        const div = document.createElement('div');
        div.className = `cell ${cell ? 'taken ' + cell : ''}`;
        div.textContent = cell || '';
        div.onclick = () => handleMove(i);
        boardEl.appendChild(div);
    });

    addCornerDecorations(boardEl);
}

function addCornerDecorations(boardEl) {
    const bottomLeft = document.createElement('div');
    bottomLeft.style.cssText = `
        position: absolute;
        bottom: -4px;
        left: -4px;
        width: 30px;
        height: 30px;
        border: 4px solid #ffa500;
        border-top: none;
        border-right: none;
        border-radius: 0 0 0 25px;
        box-shadow: 0 0 15px #ffa500;
    `;
    boardEl.appendChild(bottomLeft);

    const bottomRight = document.createElement('div');
    bottomRight.style.cssText = `
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 30px;
        height: 30px;
        border: 4px solid #ffa500;
        border-top: none;
        border-left: none;
        border-radius: 0 0 25px 0;
        box-shadow: 0 0 15px #ffa500;
    `;
    boardEl.appendChild(bottomRight);
}

function handleMove(i) {
    if (gameState.isGameOver || gameState.board[i]) return;

    // For online games, check if it's my turn
    if (gameState.isOnline) {
        if (gameState.currentPlayer !== gameState.mySymbol) {
            return; // Not my turn
        }
    }

    gameState.board[i] = gameState.currentPlayer;
    renderBoard();

    // For online games, send move to server
    if (gameState.isOnline) {
        sendOnlineMove(i);
    }

    const winner = checkWin(gameState.board, gameState.currentPlayer);
    if (winner) {
        endGame(gameState.currentPlayer, winner.combo);
    } else if (gameState.board.every(b => b)) {
        endGame('draw');
    } else {
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';

        if (gameState.gameMode === 'computer' && gameState.currentPlayer === 'O') {
            setTimeout(computerMove, 800);
        }
    }
}

async function sendOnlineMove(moveIndex) {
    if (!hasStorage) return;
    
    try {
        const gameDataStr = localStorage.getItem(`game_${gameState.gameCode}`);
        if (gameDataStr) {
            const gameData = JSON.parse(gameDataStr);
            gameData.board = [...gameState.board];
            gameData.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
            
            if (gameState.isHost) {
                gameData.hostMove = moveIndex;
                gameData.guestMove = null;
            } else {
                gameData.guestMove = moveIndex;
                gameData.hostMove = null;
            }
            
            localStorage.setItem(`game_${gameState.gameCode}`, JSON.stringify(gameData));
        }
    } catch (error) {
        console.error('Error sending move:', error);
    }
}

function checkWin(board, player) {
    for (let combo of winCombos) {
        if (combo.every(idx => board[idx] === player)) {
            return { combo };
        }
    }
    return null;
}

// Computer AI
function computerMove() {
    let move;
    if (gameState.difficulty === 'easy') {
        move = getRandomMove();
    } else if (gameState.difficulty === 'medium') {
        move = Math.random() > 0.5 ? minimax(gameState.board, 'O').index : getRandomMove();
    } else {
        move = minimax(gameState.board, 'O').index;
    }
    handleMove(move);
}

function getRandomMove() {
    const avail = gameState.board
        .map((v, i) => v === null ? i : null)
        .filter(v => v !== null);
    return avail[Math.floor(Math.random() * avail.length)];
}

function minimax(newBoard, player) {
    const availSpots = newBoard
        .map((v, i) => v === null ? i : null)
        .filter(v => v !== null);

    if (checkWin(newBoard, 'X')) return { score: -10 };
    if (checkWin(newBoard, 'O')) return { score: 10 };
    if (availSpots.length === 0) return { score: 0 };

    const moves = [];
    for (let i = 0; i < availSpots.length; i++) {
        const move = {};
        move.index = availSpots[i];
        newBoard[availSpots[i]] = player;

        if (player === 'O') {
            move.score = minimax(newBoard, 'X').score;
        } else {
            move.score = minimax(newBoard, 'O').score;
        }

        newBoard[availSpots[i]] = null;
        moves.push(move);
    }

    let bestMove;
    if (player === 'O') {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }
    return moves[bestMove];
}

// End Game
function endGame(result, winCombo = null) {
    gameState.isGameOver = true;
    gameState.stats.total++;

    if (result === 'draw') {
        gameState.stats.draws++;
        showWinModal('Draw!', '🤝');
    } else {
        if (result === 'X') {
            gameState.scores.p1++;
            gameState.stats.p1Wins++;
        } else {
            gameState.scores.p2++;
            gameState.stats.p2Wins++;
        }

        const winnerName = result === 'X' ? gameState.p1Name : gameState.p2Name;
        const symbol = result === 'X' ? '✕' : '◯';
        const color = result === 'X' ? '#ff6b9d' : '#00d9ff';

        if (winCombo) {
            highlightWinningCells(winCombo);
            drawWinLine(winCombo);
        }

        showWinModal(winnerName, symbol, color);
    }

    updateScoreDisplay();
    localStorage.setItem('ttt_stats', JSON.stringify(gameState.stats));
}

function highlightWinningCells(combo) {
    const cells = document.querySelectorAll('.cell');
    combo.forEach(idx => {
        cells[idx].classList.add('winner');
    });
}

function drawWinLine(combo) {
    const boardEl = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');

    const firstCell = cells[combo[0]].getBoundingClientRect();
    const lastCell = cells[combo[2]].getBoundingClientRect();
    const boardRect = boardEl.getBoundingClientRect();

    const line = document.createElement('div');
    line.className = 'win-line';

    const x1 = firstCell.left + firstCell.width / 2 - boardRect.left;
    const y1 = firstCell.top + firstCell.height / 2 - boardRect.top;
    const x2 = lastCell.left + lastCell.width / 2 - boardRect.left;
    const y2 = lastCell.top + lastCell.height / 2 - boardRect.top;

    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

    line.style.width = length + 'px';
    line.style.height = '4px';
    line.style.left = x1 + 'px';
    line.style.top = y1 + 'px';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.transformOrigin = '0 50%';

    boardEl.appendChild(line);
}

// Modal Functions
function showWinModal(text, symbol, color = '#00d9ff') {
    const modal = document.getElementById('winModal');
    const symbolEl = document.getElementById('winnerSymbol');
    const textEl = document.getElementById('winnerText');
    
    symbolEl.textContent = symbol;
    symbolEl.style.color = color;
    symbolEl.style.textShadow = `0 0 30px ${color}, 0 0 60px ${color}`;

    textEl.textContent = text;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('winModal').classList.add('hidden');
    resetGame();
}

function goHomeFromModal() {
    document.getElementById('winModal').classList.add('hidden');
    showMenu();
}

function updateScoreDisplay() {
    document.getElementById('scoreDisplay').textContent = 
        `${gameState.scores.p1}:${gameState.scores.p2}`;
}

// Stats Functions
function showStats() {
    hideAll();
    const s = gameState.stats;
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <h3>Total Games</h3>
            <p>${s.total}</p>
        </div>
        <div class="stat-card">
            <h3>Player 1 Wins</h3>
            <p>${s.p1Wins}</p>
        </div>
        <div class="stat-card">
            <h3>Player 2 Wins</h3>
            <p>${s.p2Wins}</p>
        </div>
        <div class="stat-card">
            <h3>Draws</h3>
            <p>${s.draws}</p>
        </div>
    `;
    document.getElementById('statsScreen').classList.remove('hidden');
}

function resetStats() {
    if (confirm("Are you sure you want to reset all statistics? This action cannot be undone.")) {
        gameState.stats = { total: 0, p1Wins: 0, p2Wins: 0, draws: 0 };
        localStorage.setItem('ttt_stats', JSON.stringify(gameState.stats));
        alert("Statistics have been reset successfully!");
        showStats();
    }
}

// Online Game Functions
function generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function createOnlineGame() {
    if (!hasStorage) {
        alert('Local storage not available. Online multiplayer requires a browser with localStorage support.');
        return;
    }

    const hostName = document.getElementById('hostNameInput').value.trim();
    if (!hostName) {
        alert('Please enter your name!');
        return;
    }

    hideAll();
    document.getElementById('createGameScreen').classList.remove('hidden');
    document.getElementById('gameCodeSection').classList.remove('hidden');

    gameState.gameCode = generateGameCode();
    gameState.isHost = true;
    gameState.mySymbol = 'X';
    gameState.p1Name = hostName;
    gameState.isOnline = true;

    document.getElementById('gameCodeDisplay').textContent = gameState.gameCode;

    // Store game data in localStorage
    try {
        const gameData = {
            host: hostName,
            board: Array(9).fill(null),
            currentPlayer: 'X',
            guest: null,
            status: 'waiting',
            hostMove: null,
            guestMove: null,
            timestamp: Date.now()
        };
        localStorage.setItem(`game_${gameState.gameCode}`, JSON.stringify(gameData));

        // Start checking for opponent
        startCheckingForOpponent();
    } catch (error) {
        console.error('Error creating game:', error);
        alert('Failed to create game. Error: ' + error.message);
        showOnlineMenu();
    }
}

function copyGameCode() {
    const code = gameState.gameCode;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            alert(`Game code ${code} copied to clipboard!`);
        }).catch(() => {
            fallbackCopyCode(code);
        });
    } else {
        fallbackCopyCode(code);
    }
}

function fallbackCopyCode(code) {
    const tempInput = document.createElement('input');
    tempInput.value = code;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        alert(`Game code ${code} copied!`);
    } catch (err) {
        alert(`Game code: ${code}\n(Manual copy: Select and copy this code)`);
    }
    document.body.removeChild(tempInput);
}

async function startCheckingForOpponent() {
    gameState.checkInterval = setInterval(async () => {
        try {
            const gameDataStr = localStorage.getItem(`game_${gameState.gameCode}`);
            if (gameDataStr) {
                const gameData = JSON.parse(gameDataStr);
                if (gameData.guest && gameData.status === 'playing') {
                    clearInterval(gameState.checkInterval);
                    gameState.p2Name = gameData.guest;
                    startOnlineGame();
                }
            }
        } catch (error) {
            console.error('Error checking for opponent:', error);
        }
    }, 1000);
}

function showJoinGame() {
    hideAll();
    document.getElementById('joinGameScreen').classList.remove('hidden');
    document.getElementById('joinError').classList.add('hidden');
}

async function joinOnlineGame() {
    if (!hasStorage) {
        showError('Local storage not available. Online multiplayer requires a browser with localStorage support.');
        return;
    }

    const guestName = document.getElementById('joinNameInput').value.trim();
    const code = document.getElementById('gameCodeInput').value.trim().toUpperCase();

    if (!guestName) {
        showError('Please enter your name!');
        return;
    }

    if (!code || code.length !== 6) {
        showError('Please enter a valid 6-character game code!');
        return;
    }

    try {
        const gameDataStr = localStorage.getItem(`game_${code}`);
        
        if (!gameDataStr) {
            showError('Game not found! Please check the code.');
            return;
        }

        const gameData = JSON.parse(gameDataStr);
        
        if (gameData.status !== 'waiting') {
            showError('This game is already in progress!');
            return;
        }

        // Join the game
        gameData.guest = guestName;
        gameData.status = 'playing';
        
        localStorage.setItem(`game_${code}`, JSON.stringify(gameData));

        gameState.gameCode = code;
        gameState.isHost = false;
        gameState.mySymbol = 'O';
        gameState.p1Name = gameData.host;
        gameState.p2Name = guestName;
        gameState.isOnline = true;

        startOnlineGame();
    } catch (error) {
        console.error('Error joining game:', error);
        showError('Failed to join game: ' + error.message);
    }
}

function showError(message) {
    const errorEl = document.getElementById('joinError');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function startOnlineGame() {
    gameState.gameMode = 'online';
    gameState.scores = { p1: 0, p2: 0 };

    document.getElementById('p1NameDisplay').textContent = gameState.p1Name;
    document.getElementById('p2NameDisplay').textContent = gameState.p2Name;

    resetGame();
    updateScoreDisplay();
    hideAll();
    document.getElementById('gameScreen').classList.remove('hidden');

    // Add online status indicator
    addOnlineStatusIndicator();

    // Start checking for moves
    startOnlineGameLoop();
}

function addOnlineStatusIndicator() {
    const existing = document.querySelector('.online-status');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'online-status';
    indicator.innerHTML = '<span>Online</span>';
    document.querySelector('.container').appendChild(indicator);
}

async function startOnlineGameLoop() {
    gameState.checkInterval = setInterval(async () => {
        if (gameState.isGameOver) {
            clearInterval(gameState.checkInterval);
            return;
        }

        try {
            const gameDataStr = localStorage.getItem(`game_${gameState.gameCode}`);
            if (gameDataStr) {
                const gameData = JSON.parse(gameDataStr);
                
                // Update board if opponent made a move
                const isMyTurn = (gameState.currentPlayer === gameState.mySymbol);
                
                if (!isMyTurn) {
                    if (gameState.isHost && gameData.guestMove !== null) {
                        handleOnlineMove(gameData.guestMove, gameData);
                    } else if (!gameState.isHost && gameData.hostMove !== null) {
                        handleOnlineMove(gameData.hostMove, gameData);
                    }
                }
            }
        } catch (error) {
            console.error('Error in game loop:', error);
        }
    }, 1000);
}

async function handleOnlineMove(moveIndex, gameData) {
    if (gameState.board[moveIndex] !== null) return;

    gameState.board[moveIndex] = gameState.currentPlayer;
    renderBoard();

    const winner = checkWin(gameState.board, gameState.currentPlayer);
    if (winner) {
        endGame(gameState.currentPlayer, winner.combo);
    } else if (gameState.board.every(b => b)) {
        endGame('draw');
    } else {
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    }
}

async function cleanupOnlineGame() {
    if (!hasStorage) return;
    
    try {
        localStorage.removeItem(`game_${gameState.gameCode}`);
    } catch (error) {
        console.error('Error cleaning up game:', error);
    }
}

// Expose functions to global scope for onclick handlers
window.showMenu = showMenu;
window.showDifficultySelection = showDifficultySelection;
window.showNameInput = showNameInput;
window.showSettings = showSettings;
window.showSettingsFromGame = showSettingsFromGame;
window.backFromSettings = backFromSettings;
window.backToGame = backToGame;
window.showStatsFromSettings = showStatsFromSettings;
window.showStats = showStats;
window.showAbout = showAbout;
window.showOnlineMenu = showOnlineMenu;
window.showCreateGame = showCreateGame;
window.startGame = startGame;
window.handleMove = handleMove;
window.closeModal = closeModal;
window.goHomeFromModal = goHomeFromModal;
window.toggleMusic = toggleMusic;
window.createOnlineGame = createOnlineGame;
window.copyGameCode = copyGameCode;
window.showJoinGame = showJoinGame;
window.joinOnlineGame = joinOnlineGame;
window.resetStats = resetStats;

// Export db for potential use
export { db };