// Game Engine - Core game loop, rendering, and input handling
class GameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = null;
        this.localPlayer = null;
        this.champions = new Map();
        this.projectiles = [];
        this.effects = [];
        this.traps = [];
        this.arena = null;
        this.inputHandler = null;
        this.renderer = null;
        this.audioManager = null;
        this.lastUpdate = 0;
        this.clientPrediction = {
            enabled: true,
            position: { x: 0, y: 0 },
            health: 100,
            reconciliation: []
        };
        this.networkBuffer = [];
        this.gameRunning = false;
        this.roundEndTime = 0;
        this.mouse = { x: 0, y: 0 };
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 0;
    }

    // Initialize the game engine
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize components
        this.inputHandler = new InputHandler();
        this.renderer = new GameRenderer(this.ctx);
        this.audioManager = new AudioManager();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
        
        console.log('Game engine initialized');
    }

    // Set up event listeners for input
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.handleShoot();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.inputHandler.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.inputHandler.handleKeyUp(e);
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Handle tab key for scoreboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' || e.keyCode === KEYS.TAB) {
                e.preventDefault();
                console.log('Tab pressed - toggling scoreboard');
                const scoreboard = document.getElementById('scoreboard');
                const isHidden = scoreboard.classList.contains('hidden');
                this.toggleScoreboard(!isHidden);
            }
            // ESC always hides scoreboard
            if (e.key === 'Escape' || e.keyCode === KEYS.ESC) {
                e.preventDefault();
                console.log('Escape pressed - hiding scoreboard');
                this.toggleScoreboard(false);
            }
        });

        // Click outside scoreboard to close it
        document.addEventListener('click', (e) => {
            const scoreboard = document.getElementById('scoreboard');
            if (scoreboard && !scoreboard.classList.contains('hidden')) {
                if (!scoreboard.contains(e.target)) {
                    this.toggleScoreboard(false);
                }
            }
        });
    }

    // Start a new game
    startGame(gameState) {
        this.gameState = gameState;
        this.gameRunning = true;
        this.roundEndTime = 0;
        this.botAI = null;
        this.isBotGame = gameState.isBotGame || false;
        
        // Initialize champions
        this.champions.clear();
        Object.keys(gameState.players).forEach(playerId => {
            const playerData = gameState.players[playerId];
            if (playerData.champion) {
                const champion = ChampionFactory.createChampion(
                    playerData.champion,
                    playerId,
                    playerData.position
                );
                this.champions.set(playerId, champion);
                
                // Set local player
                if (playerId === firebaseManager.currentUser.uid) {
                    this.localPlayer = champion;
                    this.clientPrediction.position = { ...playerData.position };
                    this.clientPrediction.health = playerData.health;
                }
                
                // Initialize bot AI if this is a bot
                if (playerData.isBot && this.isBotGame) {
                    this.botAI = new BotAI(champion, this);
                }
            }
        });

        // Initialize arena
        this.arena = new Arena(gameState.gameState.arena);
        
        // Clear projectiles and effects
        this.projectiles = [];
        this.effects = [];
        this.traps = [];
        
        console.log('Game started', this.isBotGame ? '(vs Bot)' : '');
    }

    // Update game state from server
    updateGameState(newGameState) {
        this.gameState = newGameState;
        
        // Update champions
        Object.keys(newGameState.players).forEach(playerId => {
            const playerData = newGameState.players[playerId];
            const champion = this.champions.get(playerId);
            
            if (champion) {
                // Server reconciliation for non-local players
                if (playerId !== firebaseManager.currentUser.uid) {
                    champion.position = playerData.position;
                    champion.health = playerData.health;
                } else {
                    // Handle client-side prediction reconciliation
                    this.reconcileClientPrediction(playerData);
                }
                
                champion.alive = playerData.health > 0;
                champion.rotation = playerData.rotation || 0;
            }
        });

        // Update projectiles
        this.projectiles = newGameState.gameState.projectiles || [];
        
        // Update effects
        this.effects = newGameState.gameState.effects || [];
        
        // Update arena
        if (this.arena) {
            this.arena.updateState(newGameState.gameState.arena);
        }
        
        // Handle round end
        if (newGameState.state === 'round_end' && this.roundEndTime === 0) {
            this.roundEndTime = Date.now();
            this.gameRunning = false;
        }
    }

    // Main game loop
    gameLoop() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Update FPS counter
        this.frameCount++;
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }

        // Update input handler
        if (this.inputHandler) {
            this.inputHandler.update();
        }

        if (this.gameRunning) {
            // Update game state
            this.update(deltaTime);
            
            // Handle input
            this.handleInput(deltaTime);
        }

        // Render
        this.render();

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    // Update game state
    update(deltaTime) {
        // Update champions
        this.champions.forEach(champion => {
            champion.update(deltaTime);
        });

        // Update bot AI
        if (this.botAI && this.localPlayer) {
            this.botAI.update(deltaTime, this.localPlayer.position, this.gameState);
        }

        // Update projectiles
        this.updateProjectiles(deltaTime);

        // Update effects
        this.updateEffects(deltaTime);

        // Update traps
        this.updateTraps(deltaTime);

        // Update client prediction
        if (this.clientPrediction.enabled && this.localPlayer) {
            this.updateClientPrediction(deltaTime);
        }

        // Check for deaths and trigger round end (for bot games)
        if (this.isBotGame && this.gameRunning) {
            this.checkForRoundEnd();
        }
    }

    // Check for deaths and trigger round end (for bot games)
    checkForRoundEnd() {
        if (this.roundEndTime > 0) return; // Round already ending
        
        const alivePlayers = [];
        this.champions.forEach((champion, playerId) => {
            if (champion.alive) {
                alivePlayers.push(playerId);
            }
        });
        
        // Check if only one player is alive or no players are alive
        if (alivePlayers.length <= 1) {
            const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
            console.log('Round ended, winner:', winner);
            
            // Play death sound for the loser
            if (this.audioManager) {
                this.audioManager.playDeathSound();
            }
            
            // Trigger round end
            this.triggerRoundEnd(winner);
        }
    }
    
    // Trigger round end
    triggerRoundEnd(winner) {
        console.log('Triggering round end, winner:', winner);
        this.roundEndTime = Date.now();
        this.gameRunning = false;
        
        // Update game state with round end
        if (this.isBotGame) {
            // For bot games, handle round end locally
            this.handleBotRoundEnd(winner);
        }
    }
    
    // Handle bot game round end
    handleBotRoundEnd(winner) {
        console.log('Handling bot round end, winner:', winner);
        
        // Determine if this was player or bot victory
        const isPlayerVictory = winner === firebaseManager.currentUser.uid;
        
        // Update score (placeholder - you might want to implement actual score tracking)
        const currentScore = { player: 0, bot: 0 };
        if (isPlayerVictory) {
            currentScore.player++;
        } else {
            currentScore.bot++;
        }
        
        // Show round end message
        setTimeout(() => {
            this.showRoundEndMessage(isPlayerVictory);
        }, 1000);
        
        // Start next round after delay
        setTimeout(() => {
            this.startNextRound();
        }, 3000);
    }
    
    // Show round end message
    showRoundEndMessage(playerWon) {
        const message = playerWon ? 'Round Won!' : 'Round Lost!';
        console.log('Round end message:', message);
        
        // You could show a UI message here
        // For now, just log it
        if (this.audioManager) {
            if (playerWon) {
                this.audioManager.playRoundEndSound();
            } else {
                this.audioManager.playDeathSound();
            }
        }
    }
    
    // Start next round
    startNextRound() {
        console.log('Starting next round...');
        
        // Reset champions
        this.champions.forEach(champion => {
            champion.reset();
        });
        
        // Reset game state
        this.projectiles = [];
        this.effects = [];
        this.traps = [];
        this.roundEndTime = 0;
        this.gameRunning = true;
        
        // Reset arena
        if (this.arena) {
            this.arena.reset();
        }
        
        // Reset bot AI
        if (this.botAI) {
            this.botAI.reset();
        }
        
        console.log('Next round started');
    }

    // Handle player input
    handleInput(deltaTime) {
        if (!this.localPlayer || !this.localPlayer.alive) return;

        const keys = this.inputHandler.getKeys();
        let moved = false;
        let newPosition = { ...this.localPlayer.position };

        // Movement
        const speed = this.localPlayer.getCurrentSpeed();
        const moveDistance = speed * deltaTime;

        if (keys[KEYS.W]) {
            newPosition.y -= moveDistance;
            moved = true;
        }
        if (keys[KEYS.S]) {
            newPosition.y += moveDistance;
            moved = true;
        }
        if (keys[KEYS.A]) {
            newPosition.x -= moveDistance;
            moved = true;
        }
        if (keys[KEYS.D]) {
            newPosition.x += moveDistance;
            moved = true;
        }

        // Collision detection with arena
        if (this.arena) {
            newPosition = this.arena.checkCollision(newPosition, CONFIG.PLAYER_SIZE);
        }

        // Update position
        if (moved) {
            this.localPlayer.position = newPosition;
            
            // Client-side prediction
            if (this.clientPrediction.enabled) {
                this.clientPrediction.position = { ...newPosition };
            }
            
            // Send to server
            this.sendPlayerPosition(newPosition);
        }

        // Update rotation to face mouse
        this.localPlayer.rotation = Math.atan2(
            this.mouse.y - this.localPlayer.position.y,
            this.mouse.x - this.localPlayer.position.x
        );

        // Abilities
        if (keys[KEYS.Q] && this.inputHandler.isKeyJustPressed(KEYS.Q)) {
            this.handleAbilityQ();
        }
        if (keys[KEYS.E] && this.inputHandler.isKeyJustPressed(KEYS.E)) {
            this.handleAbilityE();
        }
    }

    // Handle shooting
    handleShoot() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        const projectiles = this.localPlayer.shoot(this.mouse.x, this.mouse.y);
        if (projectiles) {
            // Add to local projectiles for immediate feedback
            this.projectiles.push(...projectiles);
            
            // Send to server
            this.sendPlayerShoot(this.mouse.x, this.mouse.y);
            
            // Play sound
            this.audioManager.playWeaponSound(this.localPlayer.type);
        }
    }

    // Handle Q ability
    handleAbilityQ() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        const result = this.localPlayer.useAbilityQ(this.mouse.x, this.mouse.y);
        if (result) {
            // Handle different ability types
            this.handleAbilityResult(result);
            
            // Send to server
            this.sendAbilityUse('q', this.mouse.x, this.mouse.y);
            
            // Play sound
            this.audioManager.playAbilitySound(this.localPlayer.type, 'q');
        }
    }

    // Handle E ability
    handleAbilityE() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        const result = this.localPlayer.useAbilityE(this.mouse.x, this.mouse.y);
        if (result) {
            // Handle different ability types
            this.handleAbilityResult(result);
            
            // Send to server
            this.sendAbilityUse('e', this.mouse.x, this.mouse.y);
            
            // Play sound
            this.audioManager.playAbilitySound(this.localPlayer.type, 'e');
        }
    }

    // Handle ability results
    handleAbilityResult(result) {
        switch (result.type) {
            case 'charge':
                this.localPlayer.position = result.endPos;
                this.addEffect('charge', result.startPos, result.endPos);
                break;
            case 'ground_slam':
                this.addEffect('ground_slam', result.position, null, result.radius);
                break;
            case 'piercing_shot':
                this.projectiles.push(result.projectile);
                break;
            case 'scout_trap':
                this.traps.push(result);
                break;
            case 'fireball':
                this.projectiles.push(result.projectile);
                break;
            case 'teleport':
                this.localPlayer.position = result.endPos;
                this.addEffect('teleport', result.startPos, result.endPos);
                break;
        }
    }

    // Handle bot weapon fire
    handleBotWeaponFire(botPlayerId, targetX, targetY) {
        const botChampion = this.champions.get(botPlayerId);
        if (!botChampion || !botChampion.alive) return;
        
        const projectiles = botChampion.shoot(targetX, targetY);
        if (projectiles) {
            // Add to local projectiles for immediate feedback
            this.projectiles.push(...projectiles);
            
            // Play sound
            this.audioManager.playWeaponSound(botChampion.type);
        }
    }

    // Handle bot ability usage
    handleBotAbility(botPlayerId, ability, targetPosition) {
        const botChampion = this.champions.get(botPlayerId);
        if (!botChampion || !botChampion.alive) return;
        
        let result = null;
        
        if (ability === 'Q') {
            result = botChampion.useAbilityQ(targetPosition.x, targetPosition.y);
        } else if (ability === 'E') {
            result = botChampion.useAbilityE(targetPosition.x, targetPosition.y);
        }
        
        if (result) {
            // Handle different ability types
            this.handleBotAbilityResult(result, botChampion);
            
            // Play sound
            this.audioManager.playAbilitySound(botChampion.type, ability.toLowerCase());
        }
    }

    // Handle bot ability results
    handleBotAbilityResult(result, botChampion) {
        switch (result.type) {
            case 'charge':
                botChampion.position = result.endPos;
                this.addEffect('charge', result.startPos, result.endPos);
                break;
            case 'ground_slam':
                this.addEffect('ground_slam', result.position, null, result.radius);
                break;
            case 'piercing_shot':
                this.projectiles.push(result.projectile);
                break;
            case 'scout_trap':
                this.traps.push(result);
                break;
            case 'fireball':
                this.projectiles.push(result.projectile);
                break;
            case 'teleport':
                botChampion.position = result.endPos;
                this.addEffect('teleport', result.startPos, result.endPos);
                break;
        }
    }

    // Update player position (for bot movement)
    updatePlayerPosition(playerId, newPosition) {
        const champion = this.champions.get(playerId);
        if (champion && this.arena) {
            // Check collision with arena
            const validPosition = this.arena.checkCollision(newPosition, CONFIG.PLAYER_SIZE);
            champion.position = validPosition;
        }
    }

    // Update projectiles
    updateProjectiles(deltaTime) {
        this.projectiles = this.projectiles.filter(projectile => {
            // Add start position if not present (for range calculation)
            if (!projectile.startX) {
                projectile.startX = projectile.x;
                projectile.startY = projectile.y;
            }
            
            // Update position
            projectile.x += projectile.vx * deltaTime;
            projectile.y += projectile.vy * deltaTime;
            
            // Check range
            const distanceTraveled = Math.sqrt(
                Math.pow(projectile.x - projectile.startX, 2) + 
                Math.pow(projectile.y - projectile.startY, 2)
            );
            
            if (distanceTraveled >= projectile.range) {
                return false;
            }
            
            // Check collision with arena
            if (this.arena && this.arena.checkProjectileCollision(projectile)) {
                return false;
            }
            
            // Check collision with champions
            this.champions.forEach(champion => {
                if (champion.playerId !== projectile.owner && champion.alive) {
                    const distance = Math.sqrt(
                        Math.pow(projectile.x - champion.position.x, 2) + 
                        Math.pow(projectile.y - champion.position.y, 2)
                    );
                    
                    if (distance <= CONFIG.PLAYER_SIZE) {
                        const damage = champion.takeDamage(projectile.damage);
                        
                        // Create damage effect
                        this.addEffect('damage', champion.position, null, damage);
                        
                        // Play sound
                        this.audioManager.playDamageSound();
                        
                        // Remove projectile if not piercing
                        if (!projectile.piercing) {
                            return false;
                        }
                    }
                }
            });
            
            return true;
        });
    }

    // Update effects
    updateEffects(deltaTime) {
        this.effects = this.effects.filter(effect => {
            effect.age += deltaTime;
            return effect.age < effect.duration;
        });
    }

    // Update traps
    updateTraps(deltaTime) {
        this.traps = this.traps.filter(trap => {
            trap.age += deltaTime;
            
            // Check for activation
            if (!trap.activated) {
                this.champions.forEach(champion => {
                    if (champion.playerId !== trap.playerId && champion.alive) {
                        const distance = Math.sqrt(
                            Math.pow(trap.position.x - champion.position.x, 2) + 
                            Math.pow(trap.position.y - champion.position.y, 2)
                        );
                        
                        if (distance <= trap.radius) {
                            trap.activated = true;
                            champion.applyRoot(trap.rootDuration);
                            
                            // Create activation effect
                            this.addEffect('trap_activation', trap.position, null, trap.radius);
                            
                            // Play sound
                            this.audioManager.playTrapSound();
                        }
                    }
                });
            }
            
            return trap.age < trap.duration;
        });
    }

    // Add visual effect
    addEffect(type, position, endPosition = null, value = 0) {
        const effect = {
            type: type,
            position: { ...position },
            endPosition: endPosition ? { ...endPosition } : null,
            value: value,
            age: 0,
            duration: this.getEffectDuration(type)
        };
        
        this.effects.push(effect);
    }

    // Get effect duration based on type
    getEffectDuration(type) {
        switch (type) {
            case 'damage': return 1.0;
            case 'explosion': return 0.5;
            case 'charge': return 0.3;
            case 'ground_slam': return 0.8;
            case 'teleport': return 0.4;
            case 'trap_activation': return 0.6;
            default: return 1.0;
        }
    }

    // Client-side prediction
    updateClientPrediction(deltaTime) {
        // This would typically include lag compensation logic
        // For now, we'll keep it simple
        if (this.localPlayer) {
            this.clientPrediction.position = { ...this.localPlayer.position };
            this.clientPrediction.health = this.localPlayer.health;
        }
    }

    // Reconcile client prediction with server state
    reconcileClientPrediction(serverPlayerData) {
        if (!this.clientPrediction.enabled) return;
        
        const positionDiff = Math.sqrt(
            Math.pow(this.clientPrediction.position.x - serverPlayerData.position.x, 2) + 
            Math.pow(this.clientPrediction.position.y - serverPlayerData.position.y, 2)
        );
        
        // If position difference is significant, snap to server position
        if (positionDiff > 50) {
            this.localPlayer.position = serverPlayerData.position;
            this.clientPrediction.position = { ...serverPlayerData.position };
        }
        
        // Always trust server for health
        this.localPlayer.health = serverPlayerData.health;
        this.clientPrediction.health = serverPlayerData.health;
    }

    // Network communication methods
    sendPlayerPosition(position) {
        if (firebaseManager.gameRoom) {
            firebaseManager.updatePlayerPosition(
                firebaseManager.gameRoom,
                firebaseManager.currentUser.uid,
                position
            );
        }
    }

    sendPlayerShoot(targetX, targetY) {
        // This would typically send to server for validation
        // For now, we'll handle it locally and sync via Firebase
    }

    sendAbilityUse(ability, targetX, targetY) {
        // This would typically send to server for validation
        // For now, we'll handle it locally and sync via Firebase
    }

    // Toggle scoreboard
    toggleScoreboard(show) {
        console.log('toggleScoreboard called with show:', show);
        const scoreboard = document.getElementById('scoreboard');
        console.log('Scoreboard element found:', scoreboard);
        
        if (scoreboard) {
            if (show) {
                scoreboard.classList.remove('hidden');
                this.updateScoreboard();
                console.log('Scoreboard shown');
            } else {
                scoreboard.classList.add('hidden');
                console.log('Scoreboard hidden');
            }
        } else {
            console.error('Scoreboard element not found!');
        }
    }

    // Update scoreboard
    updateScoreboard() {
        const tbody = document.getElementById('scoreboard-body');
        tbody.innerHTML = '';
        
        if (this.gameState && this.gameState.players) {
            Object.keys(this.gameState.players).forEach(playerId => {
                const player = this.gameState.players[playerId];
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${player.displayName}</td>
                    <td>${player.stats.kills}</td>
                    <td>${player.stats.deaths}</td>
                    <td>${player.stats.damage}</td>
                `;
                
                tbody.appendChild(row);
            });
        }
    }

    // Render game
    render() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Render arena
        if (this.arena) {
            this.renderer.renderArena(this.arena);
        }
        
        // Render champions
        this.champions.forEach(champion => {
            this.renderer.renderChampion(champion);
        });
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            this.renderer.renderProjectile(projectile);
        });
        
        // Render effects
        this.effects.forEach(effect => {
            this.renderer.renderEffect(effect);
        });
        
        // Render traps
        this.traps.forEach(trap => {
            this.renderer.renderTrap(trap);
        });
        
        // Render UI elements
        this.renderer.renderUI(this.localPlayer, this.mouse);
        
        // Render debug info
        if (this.gameState && this.gameState.debug) {
            this.renderer.renderDebugInfo(this.fps, this.clientPrediction);
        }
    }

    // Reset game
    reset() {
        this.gameRunning = false;
        this.champions.clear();
        this.projectiles = [];
        this.effects = [];
        this.traps = [];
        this.localPlayer = null;
        this.clientPrediction.position = { x: 0, y: 0 };
        this.clientPrediction.health = 100;
        this.roundEndTime = 0;
    }

    // Cleanup
    cleanup() {
        this.reset();
        if (this.audioManager) {
            this.audioManager.cleanup();
        }
    }

    // Debug function to test scoreboard
    debugScoreboard() {
        console.log('Manual scoreboard test...');
        const scoreboard = document.getElementById('scoreboard');
        if (scoreboard) {
            const isHidden = scoreboard.classList.contains('hidden');
            console.log('Current scoreboard state - hidden:', isHidden);
            this.toggleScoreboard(!isHidden);
        } else {
            console.error('Scoreboard element not found in debugScoreboard');
        }
    }
}

// Input Handler
class InputHandler {
    constructor() {
        this.keys = {};
        this.previousKeys = {};
    }

    handleKeyDown(event) {
        this.keys[event.keyCode] = true;
    }

    handleKeyUp(event) {
        this.keys[event.keyCode] = false;
    }

    getKeys() {
        return this.keys;
    }

    isKeyJustPressed(keyCode) {
        return this.keys[keyCode] && !this.previousKeys[keyCode];
    }

    update() {
        this.previousKeys = { ...this.keys };
    }
}

// Create global game engine instance
const gameEngine = new GameEngine(); 