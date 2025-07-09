// Lobby System - Manages game rooms and player connections
class LobbyManager {
    constructor() {
        this.currentState = 'lobby';
        this.gamesList = [];
        this.refreshInterval = null;
        this.playerSelectedChampion = null;
        this.botHasSelected = false;
        this.setupEventListeners();
    }

    // Set up event listeners for lobby UI
    setupEventListeners() {
        // Host game button
        document.getElementById('host-game-btn').addEventListener('click', () => {
            this.hostGame();
        });

        // VS Bot button
        document.getElementById('vs-bot-btn').addEventListener('click', () => {
            this.hostBotGame();
        });

        // Refresh games button
        document.getElementById('refresh-games-btn').addEventListener('click', () => {
            this.refreshGames();
        });

        // Champion select cards
        document.querySelectorAll('.champion-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectChampion(card.dataset.champion);
            });

            card.addEventListener('mouseenter', () => {
                if (audioManager) {
                    audioManager.playUISound('hover');
                }
            });
        });

        // Return to lobby button
        document.getElementById('return-lobby-btn').addEventListener('click', () => {
            this.returnToLobby();
        });

        // UI sound effects
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (audioManager) {
                    audioManager.playUISound('click');
                }
            });
        });
    }

    // Show lobby screen
    showLobby() {
        console.log('LobbyManager: showLobby called');
        
        try {
            this.currentState = 'lobby';
            this.botHasSelected = false;
            this.playerSelectedChampion = null;
            this.showScreen('lobby-screen');
            console.log('Lobby screen should now be visible');
            
            this.refreshGames();
            this.startAutoRefresh();
            
            console.log('Lobby initialization complete');
        } catch (error) {
            console.error('Error showing lobby:', error);
        }
    }

    // Show champion select screen
    showChampionSelect() {
        this.currentState = 'champion_select';
        this.showScreen('champion-select-screen');
        this.startChampionSelectTimer();
    }

    // Show game screen
    showGame() {
        this.currentState = 'game';
        this.showScreen('game-screen');
        this.stopAutoRefresh();
    }

    // Show victory screen
    showVictory(winner, finalScore) {
        this.currentState = 'victory';
        this.showScreen('victory-screen');
        
        // Update victory screen
        const victoryTitle = document.getElementById('victory-title');
        const finalScoreboard = document.getElementById('final-scoreboard');
        
        if (winner === firebaseManager.currentUser.uid) {
            victoryTitle.textContent = 'Victory!';
            victoryTitle.style.color = '#4CAF50';
            
            if (audioManager) {
                audioManager.playVictorySound();
            }
        } else {
            victoryTitle.textContent = 'Defeat';
            victoryTitle.style.color = '#F44336';
        }
        
        // Display final scoreboard
        finalScoreboard.innerHTML = this.generateFinalScoreboard(finalScore);
    }

    // Show specific screen
    showScreen(screenId) {
        console.log('LobbyManager: showScreen called with:', screenId);
        
        try {
            // Hide all screens
            const allScreens = document.querySelectorAll('.screen');
            console.log('Found screens:', allScreens.length);
            
            allScreens.forEach(screen => {
                screen.classList.add('hidden');
                console.log('Hidden screen:', screen.id);
            });
            
            // Show target screen
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.remove('hidden');
                console.log('Showing screen:', screenId);
            } else {
                console.error('Screen not found:', screenId);
            }
        } catch (error) {
            console.error('Error in showScreen:', error);
        }
    }

    // Host a new game
    async hostGame() {
        if (!firebaseManager.currentUser) {
            console.error('User not authenticated');
            return;
        }

        try {
            const gameId = await firebaseManager.createGameRoom(firebaseManager.currentUser);
            if (gameId) {
                console.log('Game created:', gameId);
                
                // Listen for game state changes
                firebaseManager.listenToGameRoom(gameId, (gameState) => {
                    this.handleGameStateChange(gameState);
                });
                
                // Show waiting for players message
                this.showWaitingForPlayers();
            } else {
                console.error('Failed to create game');
            }
        } catch (error) {
            console.error('Error hosting game:', error);
        }
    }

    // Host a bot game
    async hostBotGame() {
        if (!firebaseManager.currentUser) {
            console.error('User not authenticated');
            return;
        }

        try {
            const gameId = await firebaseManager.createBotGameRoom(firebaseManager.currentUser);
            if (gameId) {
                console.log('Bot game created:', gameId);
                
                // Listen for game state changes
                firebaseManager.listenToGameRoom(gameId, (gameState) => {
                    this.handleBotGameStateChange(gameState);
                });
                
                // Skip waiting and go directly to champion select
                this.showChampionSelect();
            } else {
                console.error('Failed to create bot game');
            }
        } catch (error) {
            console.error('Error hosting bot game:', error);
        }
    }

    // Join an existing game
    async joinGame(gameId) {
        if (!firebaseManager.currentUser) {
            console.error('User not authenticated');
            return;
        }

        try {
            const success = await firebaseManager.joinGameRoom(gameId, firebaseManager.currentUser);
            if (success) {
                console.log('Joined game:', gameId);
                
                // Listen for game state changes
                firebaseManager.listenToGameRoom(gameId, (gameState) => {
                    this.handleGameStateChange(gameState);
                });
            } else {
                console.error('Failed to join game');
            }
        } catch (error) {
            console.error('Error joining game:', error);
        }
    }

    // Refresh games list
    async refreshGames() {
        try {
            this.gamesList = await firebaseManager.getPublicGames();
            this.updateGamesDisplay();
        } catch (error) {
            console.error('Error refreshing games:', error);
        }
    }

    // Update games display
    updateGamesDisplay() {
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.innerHTML = '';

        if (this.gamesList.length === 0) {
            gamesContainer.innerHTML = '<div class="no-games">No games available. Host one to get started!</div>';
            return;
        }

        this.gamesList.forEach(game => {
            const gameElement = document.createElement('div');
            gameElement.className = 'game-item';
            gameElement.innerHTML = `
                <div class="game-info">
                    <div class="game-host">Host: ${game.hostName}</div>
                    <div class="game-players">Players: ${game.playerCount}/2</div>
                </div>
                <div class="game-actions">
                    <button class="btn" onclick="lobbyManager.joinGame('${game.id}')">Join Game</button>
                </div>
            `;
            gamesContainer.appendChild(gameElement);
        });
    }

    // Start auto-refresh for games list
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            if (this.currentState === 'lobby') {
                this.refreshGames();
            }
        }, 5000); // Refresh every 5 seconds
    }

    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Handle game state changes
    handleGameStateChange(gameState) {
        if (!gameState) {
            console.log('Game ended or deleted');
            this.returnToLobby();
            return;
        }

        switch (gameState.state) {
            case 'waiting':
                this.showWaitingForPlayers();
                break;
            case 'champion_select':
                this.showChampionSelect();
                this.updateChampionSelect(gameState.championSelect);
                break;
            case 'game':
                this.showGame();
                this.startGame(gameState);
                break;
            case 'round_end':
                this.handleRoundEnd(gameState);
                break;
            case 'match_end':
                this.showVictory(gameState.winner, gameState.finalScore);
                break;
        }
    }

    // Handle bot game state changes
    handleBotGameStateChange(gameState) {
        if (!gameState) {
            console.log('Bot game ended or deleted');
            this.returnToLobby();
            return;
        }

        // Bot games have simplified state management
        switch (gameState.state) {
            case 'champion_select':
                this.showChampionSelect();
                break;
            case 'game':
                this.showGame();
                this.startBotGame(gameState);
                break;
            case 'round_end':
                this.handleRoundEnd(gameState);
                break;
            case 'match_end':
                this.showVictory(gameState.winner, gameState.finalScore);
                break;
        }
    }

    // Show waiting for players
    showWaitingForPlayers() {
        const gameMessage = document.getElementById('game-message');
        if (gameMessage) {
            gameMessage.textContent = 'Waiting for players...';
        }
    }

    // Start champion select timer
    startChampionSelectTimer() {
        let timeLeft = CONFIG.CHAMPION_SELECT_TIME / 1000;
        const timerElement = document.getElementById('select-timer');
        
        const updateTimer = () => {
            timerElement.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timerInterval);
                // Auto-select random champion if none selected
                const selectedChampion = document.querySelector('.champion-card.selected');
                if (!selectedChampion) {
                    const randomChampion = ['vanguard', 'ranger', 'mage'][Math.floor(Math.random() * 3)];
                    console.log('Timer expired, auto-selecting:', randomChampion);
                    this.selectChampion(randomChampion);
                }
                
                // If this is a bot game and no bot selection happened, force it
                if (firebaseManager.isBotGame && !this.botHasSelected) {
                    console.log('Forcing bot selection due to timer expiry');
                    setTimeout(() => {
                        this.selectBotChampion();
                    }, 1000);
                }
            }
        };
        
        const timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }

    // Select champion
    async selectChampion(championType) {
        if (!firebaseManager.gameRoom) return;

        // Store player's selection
        this.playerSelectedChampion = championType.toUpperCase();

        // Update UI
        document.querySelectorAll('.champion-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-champion="${championType}"]`).classList.add('selected');

        // Play sound
        if (audioManager) {
            audioManager.playChampionSelectSound();
        }

        // Send to server
        await firebaseManager.selectChampion(
            firebaseManager.gameRoom,
            firebaseManager.currentUser.uid,
            championType.toUpperCase()
        );
        
        // If this is a bot game, immediately select bot champion
        if (firebaseManager.isBotGame && !this.botHasSelected) {
            console.log('Player selected, now selecting bot champion...');
            setTimeout(() => {
                this.selectBotChampion();
            }, 500);
        }
    }

    // Select bot champion
    async selectBotChampion() {
        if (!firebaseManager.gameRoom || this.botHasSelected) return;

        console.log('Selecting bot champion...');
        this.botHasSelected = true;

        // Auto-select a champion for the bot
        const champions = ['vanguard', 'ranger', 'mage'];
        const botChampion = champions[Math.floor(Math.random() * champions.length)];
        
        console.log('Bot selected champion:', botChampion);
        
        // Select champion for bot
        await firebaseManager.selectChampion(
            firebaseManager.gameRoom,
            'bot_player',
            botChampion.toUpperCase()
        );
        
        // After both players have selected, start the game
        setTimeout(() => {
            if (firebaseManager.listeners.gameRoom) {
                console.log('Starting bot game...');
                firebaseManager.listeners.gameRoom({
                    id: firebaseManager.gameRoom,
                    state: 'game',
                    isBotGame: true,
                    players: {
                        [firebaseManager.currentUser.uid]: {
                            uid: firebaseManager.currentUser.uid,
                            displayName: firebaseManager.currentUser.displayName,
                            champion: this.playerSelectedChampion,
                            position: { x: 100, y: 300 },
                            health: 100,
                            stats: { kills: 0, deaths: 0, damage: 0 }
                        },
                        'bot_player': {
                            uid: 'bot_player',
                            displayName: 'AI Bot',
                            champion: botChampion.toUpperCase(),
                            position: { x: 900, y: 300 },
                            health: 100,
                            stats: { kills: 0, deaths: 0, damage: 0 },
                            isBot: true
                        }
                    },
                    gameState: {
                        round: 1,
                        score: { player1: 0, player2: 0 },
                        arena: firebaseManager.generateArena(),
                        projectiles: [],
                        effects: []
                    }
                });
            }
        }, 1000);
    }

    // Start bot game
    startBotGame(gameState) {
        if (gameEngine) {
            gameEngine.startGame(gameState);
        }
        
        // Play round start sound
        if (audioManager) {
            audioManager.playRoundStartSound();
        }
    }

    // Update champion select UI
    updateChampionSelect(championSelectData) {
        const player1Selection = document.getElementById('player1-selection');
        const player2Selection = document.getElementById('player2-selection');
        
        const playerIds = Object.keys(championSelectData.selections);
        const player1Id = playerIds[0];
        const player2Id = playerIds[1];
        
        if (player1Id && championSelectData.selections[player1Id]) {
            player1Selection.textContent = `Player 1: ${championSelectData.selections[player1Id]}`;
        }
        
        if (player2Id && championSelectData.selections[player2Id]) {
            player2Selection.textContent = `Player 2: ${championSelectData.selections[player2Id]}`;
        }
    }

    // Start the game
    startGame(gameState) {
        if (gameEngine) {
            gameEngine.startGame(gameState);
        }
        
        // Play round start sound
        if (audioManager) {
            audioManager.playRoundStartSound();
        }
    }

    // Handle round end
    handleRoundEnd(gameState) {
        // Play round end sound
        if (audioManager) {
            audioManager.playRoundEndSound();
        }
        
        // Update UI with round result
        const gameMessage = document.getElementById('game-message');
        if (gameMessage) {
            gameMessage.textContent = `Round ${gameState.gameState.round} Complete!`;
        }
        
        // Update match score
        const matchScore = document.getElementById('match-score');
        if (matchScore) {
            const score = gameState.gameState.score;
            matchScore.textContent = `${score.player1} - ${score.player2}`;
        }
        
        // Check if match is over
        if (this.isMatchOver(gameState.gameState.score)) {
            const winner = this.getMatchWinner(gameState.gameState.score);
            this.showVictory(winner, gameState.gameState.score);
        }
    }

    // Check if match is over
    isMatchOver(score) {
        return score.player1 >= CONFIG.ROUNDS_TO_WIN || score.player2 >= CONFIG.ROUNDS_TO_WIN;
    }

    // Get match winner
    getMatchWinner(score) {
        return score.player1 >= CONFIG.ROUNDS_TO_WIN ? 'player1' : 'player2';
    }

    // Generate final scoreboard HTML
    generateFinalScoreboard(finalScore) {
        if (!finalScore || !finalScore.players) {
            return '<p>No score data available</p>';
        }

        let html = '<table class="final-scoreboard"><thead><tr><th>Player</th><th>Kills</th><th>Deaths</th><th>Damage</th></tr></thead><tbody>';
        
        Object.keys(finalScore.players).forEach(playerId => {
            const player = finalScore.players[playerId];
            html += `
                <tr>
                    <td>${player.displayName}</td>
                    <td>${player.stats.kills}</td>
                    <td>${player.stats.deaths}</td>
                    <td>${player.stats.damage}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        return html;
    }

    // Return to lobby
    returnToLobby() {
        // Clean up game state
        if (firebaseManager.gameRoom) {
            firebaseManager.leaveGameRoom(firebaseManager.gameRoom, firebaseManager.currentUser.uid);
        }
        
        // Clean up game engine
        if (gameEngine) {
            gameEngine.reset();
        }
        
        // Show lobby
        this.showLobby();
    }

    // Update player name display
    updatePlayerName(playerName) {
        const playerNameElement = document.getElementById('player-name');
        if (playerNameElement) {
            playerNameElement.textContent = playerName;
        }
    }

    // Update health bars
    updateHealthBars(players) {
        const playerIds = Object.keys(players);
        
        playerIds.forEach((playerId, index) => {
            const player = players[playerId];
            const healthBarId = `player${index + 1}-health`;
            const healthTextId = `player${index + 1}-health-text`;
            
            const healthBar = document.getElementById(healthBarId);
            const healthText = document.getElementById(healthTextId);
            
            if (healthBar && healthText) {
                const healthPercentage = (player.health / player.maxHealth) * 100;
                healthBar.style.width = `${healthPercentage}%`;
                healthText.textContent = player.health;
                
                // Change color based on health
                if (healthPercentage > 60) {
                    healthBar.style.background = 'linear-gradient(90deg, #4caf50, #8bc34a)';
                } else if (healthPercentage > 30) {
                    healthBar.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)';
                } else {
                    healthBar.style.background = 'linear-gradient(90deg, #f44336, #e57373)';
                }
            }
        });
    }

    // Update ability cooldowns
    updateAbilityCooldowns(champion) {
        const cooldowns = champion.getAbilityCooldowns();
        
        const qSlot = document.getElementById('player1-q');
        const eSlot = document.getElementById('player1-e');
        
        if (qSlot) {
            qSlot.className = 'ability-slot ' + (cooldowns.q.ready ? 'ready' : 'cooldown');
            if (!cooldowns.q.ready) {
                qSlot.textContent = Math.ceil(cooldowns.q.cooldown / 1000);
            } else {
                qSlot.textContent = 'Q';
            }
        }
        
        if (eSlot) {
            eSlot.className = 'ability-slot ' + (cooldowns.e.ready ? 'ready' : 'cooldown');
            if (!cooldowns.e.ready) {
                eSlot.textContent = Math.ceil(cooldowns.e.cooldown / 1000);
            } else {
                eSlot.textContent = 'E';
            }
        }
    }

    // Cleanup
    cleanup() {
        this.stopAutoRefresh();
        
        if (firebaseManager.gameRoom) {
            firebaseManager.leaveGameRoom(firebaseManager.gameRoom, firebaseManager.currentUser.uid);
        }
    }

    // Debug function to force bot selection (can be called from console)
    forceStartBotGame() {
        console.log('Forcing bot game start...');
        
        // If no player champion selected, select ranger
        if (!this.playerSelectedChampion) {
            this.playerSelectedChampion = 'RANGER';
        }
        
        // Force bot selection
        this.botHasSelected = false;
        this.selectBotChampion();
    }
}

// Create global lobby manager instance
const lobbyManager = new LobbyManager(); 