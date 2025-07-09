// Multiplayer Manager - Handles real-time synchronization and network communication
class MultiplayerManager {
    constructor() {
        this.syncInterval = null;
        this.networkBuffer = [];
        this.lastSyncTime = 0;
        this.lagCompensation = CONFIG.LAG_COMPENSATION;
        this.predictedInputs = [];
        this.serverReconciliation = true;
        this.clientPrediction = true;
        this.interpolation = true;
        this.networkStats = {
            ping: 0,
            packetLoss: 0,
            bandwidth: 0
        };
    }

    // Initialize multiplayer
    init() {
        this.startSyncLoop();
        this.setupNetworkListeners();
        console.log('Multiplayer manager initialized');
    }

    // Start the synchronization loop
    startSyncLoop() {
        this.stopSyncLoop();
        this.syncInterval = setInterval(() => {
            this.syncGameState();
        }, CONFIG.SYNC_INTERVAL);
    }

    // Stop the synchronization loop
    stopSyncLoop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Setup network event listeners
    setupNetworkListeners() {
        // Listen for game state updates
        firebaseManager.addEventListener('gameStateUpdate', (gameState) => {
            this.handleGameStateUpdate(gameState);
        });

        // Listen for player actions
        firebaseManager.addEventListener('playerAction', (action) => {
            this.handlePlayerAction(action);
        });

        // Listen for network events
        firebaseManager.addEventListener('networkEvent', (event) => {
            this.handleNetworkEvent(event);
        });
    }

    // Sync game state with server
    async syncGameState() {
        if (!firebaseManager.gameRoom || !gameEngine.gameRunning) return;

        const now = Date.now();
        const deltaTime = now - this.lastSyncTime;
        this.lastSyncTime = now;

        // Collect local player state
        const localPlayerState = this.getLocalPlayerState();
        
        // Send to server with lag compensation
        if (localPlayerState) {
            const packet = {
                timestamp: now,
                sequence: this.getNextSequence(),
                deltaTime: deltaTime,
                playerState: localPlayerState,
                lagCompensation: this.lagCompensation
            };
            
            await this.sendPacket(packet);
        }

        // Process network buffer
        this.processNetworkBuffer();
    }

    // Get local player state
    getLocalPlayerState() {
        if (!gameEngine.localPlayer) return null;

        return {
            playerId: firebaseManager.currentUser.uid,
            position: gameEngine.localPlayer.position,
            rotation: gameEngine.localPlayer.rotation,
            health: gameEngine.localPlayer.health,
            abilities: gameEngine.localPlayer.getAbilityCooldowns(),
            effects: gameEngine.localPlayer.effects,
            timestamp: Date.now()
        };
    }

    // Send packet to server
    async sendPacket(packet) {
        try {
            // Add to predicted inputs for client-side prediction
            if (this.clientPrediction) {
                this.predictedInputs.push({
                    sequence: packet.sequence,
                    timestamp: packet.timestamp,
                    playerState: { ...packet.playerState }
                });
            }

            // Send to Firebase
            await firebaseManager.updateGameState(firebaseManager.gameRoom, {
                [`players.${packet.playerState.playerId}`]: packet.playerState,
                lastUpdate: packet.timestamp
            });
            
        } catch (error) {
            console.error('Error sending packet:', error);
        }
    }

    // Handle game state update from server
    handleGameStateUpdate(gameState) {
        // Add to network buffer for processing
        this.networkBuffer.push({
            type: 'gameStateUpdate',
            data: gameState,
            timestamp: Date.now()
        });
    }

    // Handle player action from server
    handlePlayerAction(action) {
        // Add to network buffer for processing
        this.networkBuffer.push({
            type: 'playerAction',
            data: action,
            timestamp: Date.now()
        });
    }

    // Handle network event
    handleNetworkEvent(event) {
        switch (event.type) {
            case 'ping':
                this.handlePingEvent(event.data);
                break;
            case 'packetLoss':
                this.handlePacketLossEvent(event.data);
                break;
            case 'bandwidth':
                this.handleBandwidthEvent(event.data);
                break;
        }
    }

    // Process network buffer
    processNetworkBuffer() {
        const now = Date.now();
        
        // Sort buffer by timestamp
        this.networkBuffer.sort((a, b) => a.timestamp - b.timestamp);
        
        // Process each packet
        this.networkBuffer.forEach(packet => {
            const age = now - packet.timestamp;
            
            // Skip packets that are too old
            if (age > this.lagCompensation * 2) {
                return;
            }
            
            switch (packet.type) {
                case 'gameStateUpdate':
                    this.processGameStateUpdate(packet.data, age);
                    break;
                case 'playerAction':
                    this.processPlayerAction(packet.data, age);
                    break;
            }
        });
        
        // Clear processed packets
        this.networkBuffer = this.networkBuffer.filter(packet => {
            const age = now - packet.timestamp;
            return age <= this.lagCompensation * 2;
        });
    }

    // Process game state update
    processGameStateUpdate(gameState, age) {
        if (!gameEngine.gameState) return;

        // Update non-local players with interpolation
        Object.keys(gameState.players).forEach(playerId => {
            if (playerId === firebaseManager.currentUser.uid) {
                // Handle server reconciliation for local player
                this.handleServerReconciliation(gameState.players[playerId], age);
            } else {
                // Update remote player with interpolation
                this.updateRemotePlayer(playerId, gameState.players[playerId], age);
            }
        });

        // Update projectiles
        if (gameState.gameState.projectiles) {
            this.updateProjectiles(gameState.gameState.projectiles, age);
        }

        // Update arena state
        if (gameState.gameState.arena) {
            this.updateArena(gameState.gameState.arena, age);
        }
    }

    // Handle server reconciliation for local player
    handleServerReconciliation(serverPlayerState, age) {
        if (!this.serverReconciliation || !gameEngine.localPlayer) return;

        const localPlayer = gameEngine.localPlayer;
        const serverPosition = serverPlayerState.position;
        const localPosition = localPlayer.position;

        // Calculate position difference
        const positionDiff = Math.sqrt(
            Math.pow(localPosition.x - serverPosition.x, 2) + 
            Math.pow(localPosition.y - serverPosition.y, 2)
        );

        // If difference is significant, reconcile
        if (positionDiff > 10) {
            // Find the predicted input that matches the server timestamp
            const matchingInput = this.predictedInputs.find(input => 
                Math.abs(input.timestamp - serverPlayerState.timestamp) < 50
            );

            if (matchingInput) {
                // Rollback to server state
                localPlayer.position = { ...serverPosition };
                
                // Replay inputs from that point
                this.replayInputs(matchingInput.sequence);
                
                // Update client prediction position
                gameEngine.clientPrediction.position = { ...localPlayer.position };
            }
        }

        // Always trust server for health
        localPlayer.health = serverPlayerState.health;
        gameEngine.clientPrediction.health = serverPlayerState.health;
    }

    // Update remote player with interpolation
    updateRemotePlayer(playerId, playerState, age) {
        const champion = gameEngine.champions.get(playerId);
        if (!champion) return;

        if (this.interpolation) {
            // Interpolate position based on age
            const compensationFactor = Math.min(age / this.lagCompensation, 1);
            const currentPosition = champion.position;
            const targetPosition = playerState.position;

            // Smooth interpolation
            champion.position = {
                x: currentPosition.x + (targetPosition.x - currentPosition.x) * compensationFactor,
                y: currentPosition.y + (targetPosition.y - currentPosition.y) * compensationFactor
            };
        } else {
            // Direct update
            champion.position = playerState.position;
        }

        // Update other properties
        champion.rotation = playerState.rotation;
        champion.health = playerState.health;
        champion.effects = playerState.effects;
    }

    // Process player action
    processPlayerAction(action, age) {
        switch (action.type) {
            case 'shoot':
                this.processShootAction(action, age);
                break;
            case 'ability':
                this.processAbilityAction(action, age);
                break;
            case 'damage':
                this.processDamageAction(action, age);
                break;
        }
    }

    // Process shoot action
    processShootAction(action, age) {
        const champion = gameEngine.champions.get(action.playerId);
        if (!champion || action.playerId === firebaseManager.currentUser.uid) return;

        // Create projectiles with lag compensation
        const projectiles = champion.shoot(action.targetX, action.targetY);
        if (projectiles) {
            // Compensate for lag by moving projectiles forward
            const compensationDistance = (CONFIG.PROJECTILE_SPEED * age) / 1000;
            projectiles.forEach(projectile => {
                const angle = Math.atan2(projectile.vy, projectile.vx);
                projectile.x += Math.cos(angle) * compensationDistance;
                projectile.y += Math.sin(angle) * compensationDistance;
            });
            
            gameEngine.projectiles.push(...projectiles);
        }
    }

    // Process ability action
    processAbilityAction(action, age) {
        const champion = gameEngine.champions.get(action.playerId);
        if (!champion || action.playerId === firebaseManager.currentUser.uid) return;

        // Execute ability
        const result = champion.useAbilityQ(action.targetX, action.targetY);
        if (result) {
            // Handle ability result with lag compensation
            this.handleAbilityResult(result, age);
        }
    }

    // Process damage action
    processDamageAction(action, age) {
        const champion = gameEngine.champions.get(action.targetId);
        if (!champion) return;

        // Apply damage
        const actualDamage = champion.takeDamage(action.damage);
        
        // Create damage effect
        gameEngine.addEffect('damage', champion.position, null, actualDamage);
        
        // Play sound
        if (audioManager) {
            audioManager.playDamageSound();
        }
    }

    // Handle ability result with lag compensation
    handleAbilityResult(result, age) {
        // Similar to gameEngine.handleAbilityResult but with lag compensation
        switch (result.type) {
            case 'teleport':
                // Teleport is instantaneous, no compensation needed
                break;
            case 'charge':
                // Charge has duration, compensate for time passed
                const chargeDuration = 300; // ms
                const compensationFactor = Math.min(age / chargeDuration, 1);
                // Adjust charge position based on time passed
                break;
            // Add other ability types as needed
        }
    }

    // Update projectiles with lag compensation
    updateProjectiles(serverProjectiles, age) {
        // Replace local projectiles with server projectiles
        // Apply lag compensation by moving projectiles forward
        gameEngine.projectiles = serverProjectiles.map(projectile => {
            const compensationDistance = (CONFIG.PROJECTILE_SPEED * age) / 1000;
            const angle = Math.atan2(projectile.vy, projectile.vx);
            
            return {
                ...projectile,
                x: projectile.x + Math.cos(angle) * compensationDistance,
                y: projectile.y + Math.sin(angle) * compensationDistance
            };
        });
    }

    // Update arena state
    updateArena(serverArena, age) {
        if (gameEngine.arena) {
            gameEngine.arena.updateState(serverArena);
        }
    }

    // Replay inputs from a specific sequence
    replayInputs(fromSequence) {
        const inputsToReplay = this.predictedInputs.filter(input => input.sequence >= fromSequence);
        
        inputsToReplay.forEach(input => {
            // Replay the input
            this.applyPlayerInput(input.playerState);
        });
    }

    // Apply player input
    applyPlayerInput(playerState) {
        if (!gameEngine.localPlayer) return;

        // Apply movement
        gameEngine.localPlayer.position = { ...playerState.position };
        gameEngine.localPlayer.rotation = playerState.rotation;
    }

    // Get next sequence number
    getNextSequence() {
        if (!this.currentSequence) {
            this.currentSequence = 1;
        }
        return this.currentSequence++;
    }

    // Handle ping event
    handlePingEvent(pingData) {
        this.networkStats.ping = pingData.ping;
        this.updateNetworkDisplay();
    }

    // Handle packet loss event
    handlePacketLossEvent(lossData) {
        this.networkStats.packetLoss = lossData.loss;
        this.updateNetworkDisplay();
    }

    // Handle bandwidth event
    handleBandwidthEvent(bandwidthData) {
        this.networkStats.bandwidth = bandwidthData.bandwidth;
        this.updateNetworkDisplay();
    }

    // Update network display
    updateNetworkDisplay() {
        // Update debug display if enabled
        if (gameEngine.gameState && gameEngine.gameState.debug) {
            console.log('Network Stats:', this.networkStats);
        }
    }

    // Send player input to server
    async sendPlayerInput(input) {
        if (!firebaseManager.gameRoom) return;

        const packet = {
            type: 'playerInput',
            playerId: firebaseManager.currentUser.uid,
            input: input,
            timestamp: Date.now(),
            sequence: this.getNextSequence()
        };

        await this.sendPacket(packet);
    }

    // Send ability use to server
    async sendAbilityUse(ability, targetX, targetY) {
        if (!firebaseManager.gameRoom) return;

        const packet = {
            type: 'abilityUse',
            playerId: firebaseManager.currentUser.uid,
            ability: ability,
            targetX: targetX,
            targetY: targetY,
            timestamp: Date.now(),
            sequence: this.getNextSequence()
        };

        await this.sendPacket(packet);
    }

    // Send shoot action to server
    async sendShootAction(targetX, targetY) {
        if (!firebaseManager.gameRoom) return;

        const packet = {
            type: 'shoot',
            playerId: firebaseManager.currentUser.uid,
            targetX: targetX,
            targetY: targetY,
            timestamp: Date.now(),
            sequence: this.getNextSequence()
        };

        await this.sendPacket(packet);
    }

    // Clean up predicted inputs
    cleanupPredictedInputs() {
        const now = Date.now();
        const maxAge = this.lagCompensation * 10; // Keep inputs for 10x lag compensation time
        
        this.predictedInputs = this.predictedInputs.filter(input => {
            return (now - input.timestamp) <= maxAge;
        });
    }

    // Get network quality
    getNetworkQuality() {
        const ping = this.networkStats.ping;
        const packetLoss = this.networkStats.packetLoss;
        
        if (ping < 50 && packetLoss < 0.01) {
            return 'excellent';
        } else if (ping < 100 && packetLoss < 0.05) {
            return 'good';
        } else if (ping < 200 && packetLoss < 0.10) {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    // Adjust settings based on network quality
    adjustNetworkSettings() {
        const quality = this.getNetworkQuality();
        
        switch (quality) {
            case 'excellent':
                this.lagCompensation = 50;
                this.serverReconciliation = true;
                this.clientPrediction = true;
                this.interpolation = true;
                break;
            case 'good':
                this.lagCompensation = 100;
                this.serverReconciliation = true;
                this.clientPrediction = true;
                this.interpolation = true;
                break;
            case 'fair':
                this.lagCompensation = 200;
                this.serverReconciliation = true;
                this.clientPrediction = false;
                this.interpolation = false;
                break;
            case 'poor':
                this.lagCompensation = 300;
                this.serverReconciliation = false;
                this.clientPrediction = false;
                this.interpolation = false;
                break;
        }
    }

    // Update network settings
    updateNetworkSettings(settings) {
        this.lagCompensation = settings.lagCompensation || this.lagCompensation;
        this.serverReconciliation = settings.serverReconciliation !== undefined ? settings.serverReconciliation : this.serverReconciliation;
        this.clientPrediction = settings.clientPrediction !== undefined ? settings.clientPrediction : this.clientPrediction;
        this.interpolation = settings.interpolation !== undefined ? settings.interpolation : this.interpolation;
    }

    // Cleanup
    cleanup() {
        this.stopSyncLoop();
        this.networkBuffer = [];
        this.predictedInputs = [];
        this.networkStats = {
            ping: 0,
            packetLoss: 0,
            bandwidth: 0
        };
    }
}

// Create global multiplayer manager instance
const multiplayerManager = new MultiplayerManager(); 