// Firebase Configuration and Management
class FirebaseManager {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.gameRoom = null;
        this.listeners = {};
    }

    // Initialize Firebase
    async init() {
        // Check if we're in demo mode
        if (CONFIG.DEMO_MODE) {
            console.log('Running in DEMO MODE - Firebase disabled');
            
            // Create a mock user for demo
            this.currentUser = {
                uid: 'demo_player_' + Math.random().toString(36).substr(2, 9),
                displayName: 'Demo Player',
                isAnonymous: true
            };
            
            // Simulate successful authentication after a short delay
            setTimeout(() => {
                this.onAuthStateChanged(this.currentUser);
            }, 1000);
            
            return true;
        }

        try {
            // Import Firebase modules
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js');
            const { getAuth, signInAnonymously, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js');
            const { getFirestore, doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js');

            // Initialize Firebase app
            this.app = initializeApp(CONFIG.FIREBASE_CONFIG);
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);

            // Store Firebase functions for later use
            this.firebaseFunctions = {
                doc, setDoc, updateDoc, deleteDoc, onSnapshot, 
                collection, query, where, orderBy, getDocs, signInAnonymously
            };

            // Set up authentication listener
            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        displayName: user.displayName || `Player_${user.uid.slice(0, 8)}`,
                        isAnonymous: user.isAnonymous
                    };
                    this.onAuthStateChanged(this.currentUser);
                } else {
                    this.currentUser = null;
                    this.onAuthStateChanged(null);
                }
            });

            // Sign in anonymously
            await signInAnonymously(this.auth);
            return true;

        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return false;
        }
    }

    // Authentication state change handler
    onAuthStateChanged(user) {
        if (this.listeners.authStateChanged) {
            this.listeners.authStateChanged(user);
        }
    }

    // Create a new game room
    async createGameRoom(hostPlayer) {
        if (CONFIG.DEMO_MODE) {
            console.log('Demo mode: Creating local game room');
            const gameId = this.generateGameId();
            this.gameRoom = gameId;
            
            // In demo mode, immediately start champion select
            setTimeout(() => {
                if (this.listeners.gameRoom) {
                    this.listeners.gameRoom({
                        id: gameId,
                        state: 'champion_select',
                        championSelect: {
                            phase: 'selecting',
                            timeLeft: 30,
                            selections: {}
                        },
                        players: {
                            [hostPlayer.uid]: {
                                ...hostPlayer,
                                champion: null,
                                ready: false,
                                position: { x: 100, y: 300 },
                                health: 100,
                                stats: { kills: 0, deaths: 0, damage: 0 }
                            }
                        }
                    });
                }
            }, 500);
            
            return gameId;
        }

        try {
            const gameId = this.generateGameId();
            const gameData = {
                id: gameId,
                host: hostPlayer.uid,
                hostName: hostPlayer.displayName,
                players: {
                    [hostPlayer.uid]: {
                        ...hostPlayer,
                        champion: null,
                        ready: false,
                        position: { x: 100, y: 300 },
                        health: 100,
                        stats: { kills: 0, deaths: 0, damage: 0 }
                    }
                },
                state: 'waiting',
                championSelect: {
                    phase: 'waiting',
                    timeLeft: 30,
                    selections: {}
                },
                gameState: {
                    round: 1,
                    score: { player1: 0, player2: 0 },
                    arena: this.generateArena(),
                    projectiles: [],
                    effects: []
                },
                createdAt: Date.now(),
                isPublic: true
            };

            const gameRef = this.firebaseFunctions.doc(this.db, 'games', gameId);
            await this.firebaseFunctions.setDoc(gameRef, gameData);
            
            this.gameRoom = gameId;
            return gameId;

        } catch (error) {
            console.error('Error creating game room:', error);
            return null;
        }
    }

    // Create a new bot game room
    async createBotGameRoom(hostPlayer) {
        if (CONFIG.DEMO_MODE) {
            console.log('Demo mode: Creating bot game room');
            const gameId = this.generateGameId();
            this.gameRoom = gameId;
            this.isBotGame = true;
            
            // Create bot player
            const botPlayer = {
                uid: 'bot_player',
                displayName: 'AI Bot',
                champion: null,
                ready: false,
                position: { x: 900, y: 300 },
                health: 100,
                stats: { kills: 0, deaths: 0, damage: 0 },
                isBot: true
            };
            
            // Immediately start champion select
            setTimeout(() => {
                if (this.listeners.gameRoom) {
                    this.listeners.gameRoom({
                        id: gameId,
                        state: 'champion_select',
                        isBotGame: true,
                        championSelect: {
                            phase: 'selecting',
                            timeLeft: 30,
                            selections: {}
                        },
                        players: {
                            [hostPlayer.uid]: {
                                ...hostPlayer,
                                champion: null,
                                ready: false,
                                position: { x: 100, y: 300 },
                                health: 100,
                                stats: { kills: 0, deaths: 0, damage: 0 }
                            },
                            [botPlayer.uid]: botPlayer
                        }
                    });
                }
            }, 500);
            
            return gameId;
        }

        // For non-demo mode, create similar structure
        try {
            const gameId = this.generateGameId();
            const botPlayer = {
                uid: 'bot_player',
                displayName: 'AI Bot',
                champion: null,
                ready: false,
                position: { x: 900, y: 300 },
                health: 100,
                stats: { kills: 0, deaths: 0, damage: 0 },
                isBot: true
            };
            
            const gameData = {
                id: gameId,
                host: hostPlayer.uid,
                hostName: hostPlayer.displayName,
                isBotGame: true,
                players: {
                    [hostPlayer.uid]: {
                        ...hostPlayer,
                        champion: null,
                        ready: false,
                        position: { x: 100, y: 300 },
                        health: 100,
                        stats: { kills: 0, deaths: 0, damage: 0 }
                    },
                    [botPlayer.uid]: botPlayer
                },
                state: 'champion_select',
                championSelect: {
                    phase: 'selecting',
                    timeLeft: 30,
                    selections: {}
                },
                gameState: {
                    round: 1,
                    score: { player1: 0, player2: 0 },
                    arena: this.generateArena(),
                    projectiles: [],
                    effects: []
                },
                createdAt: Date.now(),
                isPublic: false // Bot games are not public
            };

            const gameRef = this.firebaseFunctions.doc(this.db, 'games', gameId);
            await this.firebaseFunctions.setDoc(gameRef, gameData);
            
            this.gameRoom = gameId;
            this.isBotGame = true;
            return gameId;

        } catch (error) {
            console.error('Error creating bot game room:', error);
            return null;
        }
    }

    // Join an existing game room
    async joinGameRoom(gameId, player) {
        try {
            const gameRef = this.firebaseFunctions.doc(this.db, 'games', gameId);
            const playerData = {
                ...player,
                champion: null,
                ready: false,
                position: { x: 900, y: 300 },
                health: 100,
                stats: { kills: 0, deaths: 0, damage: 0 }
            };

            await this.firebaseFunctions.updateDoc(gameRef, {
                [`players.${player.uid}`]: playerData,
                state: 'champion_select',
                'championSelect.phase': 'selecting',
                'championSelect.timeLeft': 30
            });

            this.gameRoom = gameId;
            return true;

        } catch (error) {
            console.error('Error joining game room:', error);
            return false;
        }
    }

    // Get public games with cleanup
    async getPublicGames() {
        if (CONFIG.DEMO_MODE) {
            console.log('Demo mode: No online games available');
            return [];
        }

        try {
            // Clean up old games first (older than 1 hour)
            await this.cleanupOldGames();
            
            const gamesRef = this.firebaseFunctions.collection(this.db, 'games');
            const q = this.firebaseFunctions.query(
                gamesRef,
                this.firebaseFunctions.where('isPublic', '==', true),
                this.firebaseFunctions.where('state', '==', 'waiting'),
                this.firebaseFunctions.orderBy('createdAt', 'desc'),
                this.firebaseFunctions.limit(10) // Limit to 10 most recent games
            );
            
            const querySnapshot = await this.firebaseFunctions.getDocs(q);
            const games = [];
            
            querySnapshot.forEach((doc) => {
                const gameData = doc.data();
                games.push({
                    id: doc.id,
                    ...gameData
                });
            });
            
            console.log('Found public games:', games.length);
            return games;
        } catch (error) {
            console.error('Error getting public games:', error);
            return [];
        }
    }

    // Clean up old games (older than 1 hour)
    async cleanupOldGames() {
        try {
            const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour ago
            const gamesRef = this.firebaseFunctions.collection(this.db, 'games');
            const q = this.firebaseFunctions.query(
                gamesRef,
                this.firebaseFunctions.where('createdAt', '<', oneHourAgo)
            );
            
            const querySnapshot = await this.firebaseFunctions.getDocs(q);
            const batch = this.firebaseFunctions.writeBatch(this.db);
            
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            if (querySnapshot.size > 0) {
                await batch.commit();
                console.log(`Cleaned up ${querySnapshot.size} old games`);
            }
        } catch (error) {
            console.error('Error cleaning up old games:', error);
        }
    }

    // Listen to game state changes
    listenToGameRoom(gameId, callback) {
        if (CONFIG.DEMO_MODE) {
            console.log('Demo mode: Setting up game room listener');
            this.listeners.gameRoom = callback;
            return;
        }

        if (this.listeners.gameRoom) {
            this.listeners.gameRoom();
        }

        const gameRef = this.firebaseFunctions.doc(this.db, 'games', gameId);
        this.listeners.gameRoom = this.firebaseFunctions.onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            } else {
                callback(null);
            }
        });
    }

    // Update game state
    async updateGameState(gameId, updates) {
        if (CONFIG.DEMO_MODE) {
            console.log('Demo mode: Game state update', updates);
            return true; // Just return success in demo mode
        }

        try {
            const gameRef = this.firebaseFunctions.doc(this.db, 'games', gameId);
            await this.firebaseFunctions.updateDoc(gameRef, updates);
            return true;
        } catch (error) {
            console.error('Error updating game state:', error);
            return false;
        }
    }

    // Select champion
    async selectChampion(gameId, playerId, championType) {
        if (CONFIG.DEMO_MODE) {
            console.log(`Demo mode: Selected champion ${championType}`);
            
            // In demo mode, immediately start the game after champion selection
            setTimeout(() => {
                if (this.listeners.gameRoom) {
                    this.listeners.gameRoom({
                        id: gameId,
                        state: 'game',
                        players: {
                            [playerId]: {
                                uid: playerId,
                                displayName: 'Demo Player',
                                champion: championType,
                                position: { x: 100, y: 300 },
                                health: 100,
                                stats: { kills: 0, deaths: 0, damage: 0 }
                            }
                        },
                        gameState: {
                            round: 1,
                            score: { player1: 0, player2: 0 },
                            arena: this.generateArena(),
                            projectiles: [],
                            effects: []
                        }
                    });
                }
            }, 1000);
            
            return true;
        }

        try {
            const updates = {
                [`players.${playerId}.champion`]: championType,
                [`championSelect.selections.${playerId}`]: championType
            };

            return await this.updateGameState(gameId, updates);
        } catch (error) {
            console.error('Error selecting champion:', error);
            return false;
        }
    }

    // Update player position
    async updatePlayerPosition(gameId, playerId, position) {
        try {
            const updates = {
                [`players.${playerId}.position`]: position,
                [`players.${playerId}.lastUpdate`]: Date.now()
            };

            return await this.updateGameState(gameId, updates);
        } catch (error) {
            console.error('Error updating player position:', error);
            return false;
        }
    }

    // Update player health
    async updatePlayerHealth(gameId, playerId, health) {
        try {
            const updates = {
                [`players.${playerId}.health`]: health
            };

            return await this.updateGameState(gameId, updates);
        } catch (error) {
            console.error('Error updating player health:', error);
            return false;
        }
    }

    // Add projectile
    async addProjectile(gameId, projectile) {
        try {
            const updates = {
                [`gameState.projectiles`]: [...this.currentGameState.gameState.projectiles, projectile]
            };

            return await this.updateGameState(gameId, updates);
        } catch (error) {
            console.error('Error adding projectile:', error);
            return false;
        }
    }

    // Update match score
    async updateMatchScore(gameId, score) {
        try {
            const updates = {
                'gameState.score': score
            };

            return await this.updateGameState(gameId, updates);
        } catch (error) {
            console.error('Error updating match score:', error);
            return false;
        }
    }

    // Leave game room
    async leaveGameRoom(gameId, playerId) {
        try {
            const gameRef = this.firebaseFunctions.doc(this.db, 'games', gameId);
            const updates = {
                [`players.${playerId}`]: this.firebaseFunctions.deleteDoc()
            };

            await this.firebaseFunctions.updateDoc(gameRef, updates);
            
            // Clean up listener
            if (this.listeners.gameRoom) {
                this.listeners.gameRoom();
                this.listeners.gameRoom = null;
            }

            this.gameRoom = null;
            return true;

        } catch (error) {
            console.error('Error leaving game room:', error);
            return false;
        }
    }

    // Delete game room
    async deleteGameRoom(gameId) {
        try {
            const gameRef = this.firebaseFunctions.doc(this.db, 'games', gameId);
            await this.firebaseFunctions.deleteDoc(gameRef);
            
            // Clean up listener
            if (this.listeners.gameRoom) {
                this.listeners.gameRoom();
                this.listeners.gameRoom = null;
            }

            this.gameRoom = null;
            return true;

        } catch (error) {
            console.error('Error deleting game room:', error);
            return false;
        }
    }

    // Generate unique game ID
    generateGameId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Generate arena layout
    generateArena() {
        return {
            walls: [
                // Outer walls
                { x: 0, y: 0, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: CONFIG.ARENA_HEIGHT - CONFIG.WALL_THICKNESS, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT },
                { x: CONFIG.ARENA_WIDTH - CONFIG.WALL_THICKNESS, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT }
            ],
            destructibleCover: [
                // Central cover pieces
                { x: 300, y: 200, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 620, y: 200, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 300, y: 320, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 620, y: 320, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 460, y: 260, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH }
            ]
        };
    }

    // Set event listeners
    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }

    // Remove event listeners
    removeEventListener(event) {
        if (this.listeners[event]) {
            if (typeof this.listeners[event] === 'function' && this.listeners[event].toString().includes('unsubscribe')) {
                this.listeners[event]();
            }
            delete this.listeners[event];
        }
    }

    // Cleanup
    cleanup() {
        Object.keys(this.listeners).forEach(event => {
            this.removeEventListener(event);
        });
        this.gameRoom = null;
        this.currentUser = null;
    }
}

// Create global Firebase manager instance
const firebaseManager = new FirebaseManager(); 