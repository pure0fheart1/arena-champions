// Main Game Orchestrator - Initializes and manages all game systems
class GameOrchestrator {
    constructor() {
        this.initialized = false;
        this.gameState = GAME_STATES.LOADING;
        this.systems = {
            firebase: null,
            audio: null,
            lobby: null,
            game: null,
            multiplayer: null,
            renderer: null
        };
        this.loadingProgress = 0;
        this.errorHandler = new ErrorHandler();
    }

    // Initialize the game
    async init() {
        try {
            console.log('Initializing Arena Champions...');
            this.showLoadingScreen();
            
            // Initialize Firebase first
            await this.initFirebase();
            this.updateLoadingProgress(20);
            
            // Initialize audio system
            await this.initAudio();
            this.updateLoadingProgress(40);
            
            // Initialize game engine
            await this.initGameEngine();
            this.updateLoadingProgress(60);
            
            // Initialize multiplayer system
            await this.initMultiplayer();
            this.updateLoadingProgress(80);
            
            // Initialize lobby system
            await this.initLobby();
            this.updateLoadingProgress(100);
            
            // All systems initialized
            this.initialized = true;
            this.gameState = GAME_STATES.LOBBY;
            
            console.log('Arena Champions initialized successfully!');
            
            // Start game immediately if we already have a user (demo mode)
            if (firebaseManager.currentUser) {
                this.startGame();
            } else {
                // Wait a bit for authentication, then start anyway
                setTimeout(() => {
                    if (!this.initialized || this.gameState === GAME_STATES.LOADING) {
                        console.log('Forcing game start after timeout...');
                        this.startGame();
                    }
                }, 2000);
            }
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.handleInitializationError(error);
        }
    }

    // Initialize Firebase
    async initFirebase() {
        console.log('Initializing Firebase...');
        
        // In demo mode, skip Firebase config check
        if (!CONFIG.DEMO_MODE && (!CONFIG.FIREBASE_CONFIG.apiKey || CONFIG.FIREBASE_CONFIG.apiKey === 'your-api-key')) {
            throw new Error('Firebase configuration not provided. Please update CONFIG.FIREBASE_CONFIG in config.js');
        }
        
        const success = await firebaseManager.init();
        if (!success) {
            throw new Error('Failed to initialize Firebase');
        }
        
        // Set up authentication listener
        firebaseManager.addEventListener('authStateChanged', (user) => {
            this.handleAuthStateChange(user);
        });
        
        this.systems.firebase = firebaseManager;
        console.log('Firebase initialized successfully');
    }

    // Initialize audio system
    async initAudio() {
        console.log('Initializing audio system...');
        
        // AudioManager is already instantiated globally
        this.systems.audio = new AudioManager();
        
        // Test audio context
        if (!this.systems.audio.audioContext) {
            console.warn('Audio system not available - running in silent mode');
        }
        
        console.log('Audio system initialized');
    }

    // Initialize game engine
    async initGameEngine() {
        console.log('Initializing game engine...');
        
        // GameEngine is already instantiated globally
        this.systems.game = gameEngine;
        
        // Initialize the game engine
        gameEngine.init();
        
        console.log('Game engine initialized');
    }

    // Initialize multiplayer system
    async initMultiplayer() {
        console.log('Initializing multiplayer system...');
        
        // MultiplayerManager is already instantiated globally
        this.systems.multiplayer = multiplayerManager;
        
        // Initialize multiplayer
        multiplayerManager.init();
        
        console.log('Multiplayer system initialized');
    }

    // Initialize lobby system
    async initLobby() {
        console.log('Initializing lobby system...');
        
        // LobbyManager is already instantiated globally
        this.systems.lobby = lobbyManager;
        
        console.log('Lobby system initialized');
    }

    // Handle authentication state change
    handleAuthStateChange(user) {
        console.log('Auth state changed, user:', user);
        
        if (user) {
            console.log('User authenticated:', user.displayName);
            
            try {
                // Update player name
                if (typeof lobbyManager !== 'undefined' && lobbyManager.updatePlayerName) {
                    lobbyManager.updatePlayerName(user.displayName);
                }
                
                // Show demo indicator if in demo mode
                if (CONFIG.DEMO_MODE) {
                    const demoIndicator = document.getElementById('demo-indicator');
                    if (demoIndicator) {
                        demoIndicator.style.display = 'block';
                    }
                }
                
                // Show lobby if we're in loading state
                console.log('Current game state:', this.gameState);
                if (this.gameState === GAME_STATES.LOADING) {
                    console.log('Starting game from loading state...');
                    this.startGame();
                }
            } catch (error) {
                console.error('Error in handleAuthStateChange:', error);
            }
        } else {
            console.log('User not authenticated');
            this.gameState = GAME_STATES.LOADING;
        }
    }

    // Start the game
    startGame() {
        console.log('startGame called, initialized:', this.initialized);
        
        if (!this.initialized) {
            console.error('Cannot start game - not initialized');
            return;
        }
        
        try {
            console.log('Hiding loading screen and showing lobby...');
            this.hideLoadingScreen();
            this.gameState = GAME_STATES.LOBBY;
            
            // Ensure lobby manager exists
            if (typeof lobbyManager !== 'undefined') {
                lobbyManager.showLobby();
                console.log('Lobby shown successfully');
            } else {
                console.error('lobbyManager not found!');
            }
            
            // Play background music or ambient sounds
            if (this.systems.audio) {
                // Could add background music here
            }
            
            console.log('Game started - showing lobby');
        } catch (error) {
            console.error('Error starting game:', error);
            this.showErrorScreen('Failed to start game: ' + error.message);
        }
    }

    // Show loading screen
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
        
        // Hide other screens
        document.querySelectorAll('.screen:not(#loading-screen)').forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    // Hide loading screen
    hideLoadingScreen() {
        console.log('Hiding loading screen...');
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            console.log('Loading screen hidden');
        } else {
            console.error('Loading screen element not found!');
        }
    }

    // Update loading progress
    updateLoadingProgress(progress) {
        this.loadingProgress = progress;
        
        // Update loading bar if it exists
        const loadingBar = document.querySelector('.loading-progress');
        if (loadingBar) {
            loadingBar.style.width = `${progress}%`;
        }
        
        // Update loading text
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Loading... ${progress}%`;
        }
    }

    // Handle initialization error
    handleInitializationError(error) {
        console.error('Initialization error:', error);
        
        // Show error message to user
        const errorMessage = this.getErrorMessage(error);
        this.showErrorScreen(errorMessage);
        
        // Report error if analytics is available
        this.reportError(error);
    }

    // Get user-friendly error message
    getErrorMessage(error) {
        if (error.message.includes('Firebase')) {
            return 'Unable to connect to game servers. Please check your internet connection and try again.';
        } else if (error.message.includes('Audio')) {
            return 'Audio system unavailable. The game will run in silent mode.';
        } else {
            return 'An unexpected error occurred. Please refresh the page and try again.';
        }
    }

    // Show error screen
    showErrorScreen(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="error-content">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn primary">Retry</button>
                </div>
            `;
        }
    }

    // Report error for analytics
    reportError(error) {
        // Could integrate with error reporting service
        console.error('Reported error:', error);
    }

    // Handle game state changes
    handleGameStateChange(newState) {
        const oldState = this.gameState;
        this.gameState = newState;
        
        console.log(`Game state changed: ${oldState} -> ${newState}`);
        
        // Handle state-specific logic
        switch (newState) {
            case GAME_STATES.LOBBY:
                this.onEnterLobby();
                break;
            case GAME_STATES.CHAMPION_SELECT:
                this.onEnterChampionSelect();
                break;
            case GAME_STATES.GAME:
                this.onEnterGame();
                break;
            case GAME_STATES.VICTORY:
                this.onEnterVictory();
                break;
        }
    }

    // Handle entering lobby
    onEnterLobby() {
        if (this.systems.multiplayer) {
            this.systems.multiplayer.stopSyncLoop();
        }
        
        if (this.systems.game) {
            this.systems.game.reset();
        }
    }

    // Handle entering champion select
    onEnterChampionSelect() {
        if (this.systems.audio) {
            // Could play champion select music
        }
    }

    // Handle entering game
    onEnterGame() {
        if (this.systems.multiplayer) {
            this.systems.multiplayer.startSyncLoop();
        }
        
        if (this.systems.audio) {
            // Could play battle music
        }
    }

    // Handle entering victory screen
    onEnterVictory() {
        if (this.systems.multiplayer) {
            this.systems.multiplayer.stopSyncLoop();
        }
    }

    // Get game statistics
    getGameStats() {
        return {
            initialized: this.initialized,
            currentState: this.gameState,
            loadingProgress: this.loadingProgress,
            systems: {
                firebase: !!this.systems.firebase,
                audio: !!this.systems.audio,
                lobby: !!this.systems.lobby,
                game: !!this.systems.game,
                multiplayer: !!this.systems.multiplayer
            }
        };
    }

    // Cleanup and shutdown
    cleanup() {
        console.log('Cleaning up game systems...');
        
        // Cleanup each system
        if (this.systems.multiplayer) {
            this.systems.multiplayer.cleanup();
        }
        
        if (this.systems.lobby) {
            this.systems.lobby.cleanup();
        }
        
        if (this.systems.game) {
            this.systems.game.cleanup();
        }
        
        if (this.systems.audio) {
            this.systems.audio.cleanup();
        }
        
        if (this.systems.firebase) {
            this.systems.firebase.cleanup();
        }
        
        this.initialized = false;
        console.log('Game systems cleaned up');
    }

    // Handle page visibility changes
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden - pause or reduce activity
            if (this.systems.audio) {
                this.systems.audio.setEnabled(false);
            }
            
            if (this.systems.multiplayer) {
                this.systems.multiplayer.stopSyncLoop();
            }
        } else {
            // Page is visible - resume activity
            if (this.systems.audio) {
                this.systems.audio.setEnabled(CONFIG.AUDIO_ENABLED);
            }
            
            if (this.systems.multiplayer && this.gameState === GAME_STATES.GAME) {
                this.systems.multiplayer.startSyncLoop();
            }
        }
    }

    // Handle window resize
    handleResize() {
        if (this.systems.game && this.systems.game.canvas) {
            // Could adjust canvas size here if needed
        }
    }

    // Handle before unload
    handleBeforeUnload() {
        // Leave current game room if in one
        if (this.systems.firebase && this.systems.firebase.gameRoom) {
            this.systems.firebase.leaveGameRoom(
                this.systems.firebase.gameRoom,
                this.systems.firebase.currentUser.uid
            );
        }
    }
}

// Error Handler
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    logError(error, context = '') {
        const errorEntry = {
            timestamp: Date.now(),
            error: error.message || error,
            stack: error.stack,
            context: context,
            gameState: gameOrchestrator ? gameOrchestrator.gameState : 'unknown'
        };
        
        this.errors.push(errorEntry);
        
        // Keep only the most recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        console.error('Error logged:', errorEntry);
    }

    getErrors() {
        return this.errors;
    }

    clearErrors() {
        this.errors = [];
    }
}

// Game Renderer - Simple 2D renderer for the game
class GameRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.camera = { x: 0, y: 0 };
        this.particleSystem = new ParticleSystem();
    }

    // Render the arena
    renderArena(arena) {
        const arenaData = arena.getVisualData();
        
        // Render walls
        this.ctx.fillStyle = '#444';
        arenaData.walls.forEach(wall => {
            this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        });
        
        // Render destructible cover
        arenaData.destructibleCover.forEach(cover => {
            if (cover.health > 0) {
                // Color based on health
                const healthPercent = cover.healthPercentage;
                this.ctx.fillStyle = `rgb(${255 - healthPercent * 100}, ${100 + healthPercent * 100}, 50)`;
                this.ctx.fillRect(cover.x, cover.y, cover.width, cover.height);
                
                // Health bar
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(cover.x, cover.y - 10, cover.width, 5);
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(cover.x, cover.y - 10, cover.width * healthPercent, 5);
            }
        });
    }

    // Render a champion
    renderChampion(champion) {
        const data = champion.getVisualData();
        if (!data.alive) return;
        
        this.ctx.save();
        
        // Translate to champion position
        this.ctx.translate(data.position.x, data.position.y);
        
        // Rotate to face direction
        this.ctx.rotate(data.rotation);
        
        // Champion body
        this.ctx.fillStyle = CHAMPIONS[data.champion].color;
        this.ctx.fillRect(-CONFIG.PLAYER_SIZE/2, -CONFIG.PLAYER_SIZE/2, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);
        
        // Champion icon
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(CHAMPIONS[data.champion].icon, 0, 5);
        
        // Effects
        if (data.effects.shield.active) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, CONFIG.PLAYER_SIZE/2 + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    // Render a projectile
    renderProjectile(projectile) {
        this.ctx.save();
        
        // Color based on projectile type
        switch (projectile.type) {
            case 'shotgun_pellet':
                this.ctx.fillStyle = '#ff6b6b';
                break;
            case 'rifle_bullet':
                this.ctx.fillStyle = '#4ecdc4';
                break;
            case 'energy_bolt':
                this.ctx.fillStyle = '#a8e6cf';
                break;
            default:
                this.ctx.fillStyle = '#fff';
        }
        
        this.ctx.fillRect(
            projectile.x - CONFIG.PROJECTILE_SIZE/2,
            projectile.y - CONFIG.PROJECTILE_SIZE/2,
            CONFIG.PROJECTILE_SIZE,
            CONFIG.PROJECTILE_SIZE
        );
        
        this.ctx.restore();
    }

    // Render an effect
    renderEffect(effect) {
        this.ctx.save();
        
        const alpha = 1 - (effect.age / effect.duration);
        this.ctx.globalAlpha = alpha;
        
        switch (effect.type) {
            case 'damage':
                this.ctx.fillStyle = '#ff0000';
                this.ctx.font = '20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`-${effect.value}`, effect.position.x, effect.position.y - effect.age * 20);
                break;
            case 'explosion':
                this.ctx.fillStyle = '#ff6b6b';
                const radius = (effect.age / effect.duration) * effect.value;
                this.ctx.beginPath();
                this.ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                break;
        }
        
        this.ctx.restore();
    }

    // Render a trap
    renderTrap(trap) {
        if (trap.activated) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(trap.position.x, trap.position.y, trap.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Render UI elements
    renderUI(localPlayer, mouse) {
        if (!localPlayer) return;
        
        // Crosshair
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(mouse.x - 10, mouse.y);
        this.ctx.lineTo(mouse.x + 10, mouse.y);
        this.ctx.moveTo(mouse.x, mouse.y - 10);
        this.ctx.lineTo(mouse.x, mouse.y + 10);
        this.ctx.stroke();
    }

    // Render debug information
    renderDebugInfo(fps, clientPrediction) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`FPS: ${fps}`, 10, 20);
        this.ctx.fillText(`Prediction: ${clientPrediction.enabled ? 'ON' : 'OFF'}`, 10, 35);
        this.ctx.fillText(`Position: ${Math.round(clientPrediction.position.x)}, ${Math.round(clientPrediction.position.y)}`, 10, 50);
    }
}

// Particle System
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    addParticle(x, y, vx, vy, color, life) {
        this.particles.push({
            x, y, vx, vy, color, life, maxLife: life
        });
    }

    update(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.life -= deltaTime;
            return particle.life > 0;
        });
    }

    render(ctx) {
        this.particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.life / particle.maxLife;
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
            ctx.restore();
        });
    }
}

// Global game orchestrator instance
const gameOrchestrator = new GameOrchestrator();

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    gameOrchestrator.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    gameOrchestrator.handleVisibilityChange();
});

// Handle window resize
window.addEventListener('resize', () => {
    gameOrchestrator.handleResize();
});

// Handle before unload
window.addEventListener('beforeunload', () => {
    gameOrchestrator.handleBeforeUnload();
});

// Global error handler
window.addEventListener('error', (event) => {
    if (gameOrchestrator.errorHandler) {
        gameOrchestrator.errorHandler.logError(event.error, 'Global error');
    }
});

// Expose game orchestrator globally for debugging
window.gameOrchestrator = gameOrchestrator;

// Firebase help function
function showFirebaseHelp() {
    alert(`🚀 TO ENABLE MULTIPLAYER:

1. Create Firebase Project:
   • Go to https://console.firebase.google.com
   • Click "Add project"

2. Enable Services:
   • Authentication → Sign-in method → Enable "Anonymous"
   • Firestore Database → Create database → Start in test mode

3. Get Configuration:
   • Project Settings → General → Add app (Web)
   • Copy the config object

4. Update Config:
   • Open js/config.js
   • Set DEMO_MODE: false
   • Replace FIREBASE_CONFIG with your values

5. Restart the game!

For detailed instructions, check the README.md file.`);
}

// Debug function to check screen states
function debugScreens() {
    console.log('=== SCREEN DEBUG ===');
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        const isHidden = screen.classList.contains('hidden');
        const computedStyle = window.getComputedStyle(screen);
        console.log(`Screen ${screen.id}: hidden=${isHidden}, opacity=${computedStyle.opacity}, display=${computedStyle.display}`);
    });
    console.log('Current game state:', gameOrchestrator ? gameOrchestrator.gameState : 'unknown');
    console.log('===================');
}

// Expose debug function globally
window.debugScreens = debugScreens; 