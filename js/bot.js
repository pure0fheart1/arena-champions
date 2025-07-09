// Bot AI System - Controls AI opponent behavior
class BotAI {
    constructor(champion, gameEngine) {
        this.champion = champion;
        this.gameEngine = gameEngine;
        this.playerId = 'bot_player';
        this.state = 'idle'; // idle, moving, attacking, retreating, using_ability
        this.target = null;
        this.lastAction = 0;
        this.actionDelay = 150; // Minimum delay between actions (ms)
        this.reactionTime = 300; // Reaction time to player actions (ms)
        this.aggressionLevel = 0.7; // How aggressive the bot is (0-1)
        this.lastPlayerPosition = null;
        this.predictedPlayerPosition = null;
        this.lastDecisionTime = 0;
        this.decisionDelay = 200; // How often bot makes decisions (ms)
        this.lastAbilityUse = 0;
        this.abilityUseCooldown = 2000; // Minimum time between ability uses
        this.difficulty = 'medium'; // easy, medium, hard
        this.behaviorPattern = this.getBehaviorPattern();
        this.lastDamageTime = 0;
        this.retreatThreshold = 30; // Health percentage to start retreating
        this.coverTargets = []; // List of cover positions
        this.currentCover = null;
        this.lastCoverCheck = 0;
        this.strafeDirection = 1; // 1 for right, -1 for left
        this.strafeChangeTime = 0;
        this.avoidanceVector = { x: 0, y: 0 };
    }

    // Get behavior pattern based on champion type
    getBehaviorPattern() {
        switch (this.champion.type) {
            case 'VANGUARD':
                return {
                    preferredRange: 120, // Close range
                    retreatRange: 300,
                    aggressionBonus: 0.3,
                    abilityUsage: 0.8,
                    movementSpeed: 0.8,
                    strafeFrequency: 0.3
                };
            case 'RANGER':
                return {
                    preferredRange: 250, // Medium range
                    retreatRange: 150,
                    aggressionBonus: 0.1,
                    abilityUsage: 0.6,
                    movementSpeed: 1.0,
                    strafeFrequency: 0.7
                };
            case 'MAGE':
                return {
                    preferredRange: 300, // Long range
                    retreatRange: 200,
                    aggressionBonus: 0.0,
                    abilityUsage: 0.9,
                    movementSpeed: 0.9,
                    strafeFrequency: 0.5
                };
            default:
                return {
                    preferredRange: 200,
                    retreatRange: 150,
                    aggressionBonus: 0.2,
                    abilityUsage: 0.7,
                    movementSpeed: 0.9,
                    strafeFrequency: 0.5
                };
        }
    }

    // Update bot AI logic
    update(deltaTime, playerPosition, gameState) {
        const now = Date.now();
        
        // Don't act too frequently
        if (now - this.lastAction < this.actionDelay) {
            return;
        }

        // Update player tracking
        this.updatePlayerTracking(playerPosition);

        // Make decisions at regular intervals
        if (now - this.lastDecisionTime > this.decisionDelay) {
            this.makeDecision(gameState);
            this.lastDecisionTime = now;
        }

        // Execute current state
        this.executeState(deltaTime, gameState);
        this.lastAction = now;
    }

    // Update player position tracking and prediction
    updatePlayerTracking(playerPosition) {
        if (this.lastPlayerPosition) {
            // Calculate player velocity
            const dx = playerPosition.x - this.lastPlayerPosition.x;
            const dy = playerPosition.y - this.lastPlayerPosition.y;
            
            // Predict where player will be
            this.predictedPlayerPosition = {
                x: playerPosition.x + dx * 3,
                y: playerPosition.y + dy * 3
            };
        }
        
        this.lastPlayerPosition = { ...playerPosition };
    }

    // Make high-level decisions
    makeDecision(gameState) {
        const playerPosition = this.lastPlayerPosition;
        if (!playerPosition) return;

        const distance = this.getDistance(this.champion.position, playerPosition);
        const healthPercentage = (this.champion.health / this.champion.maxHealth) * 100;
        
        // Check if we should retreat
        if (healthPercentage < this.retreatThreshold || 
            (this.lastDamageTime && Date.now() - this.lastDamageTime < 1000)) {
            this.state = 'retreating';
            this.findCover(gameState);
            return;
        }

        // Check if we should use abilities
        if (this.shouldUseAbility(distance, healthPercentage)) {
            this.state = 'using_ability';
            return;
        }

        // Decide between attacking and positioning
        if (distance < this.behaviorPattern.preferredRange * 1.5) {
            if (this.hasLineOfSight(playerPosition, gameState)) {
                this.state = 'attacking';
            } else {
                this.state = 'moving';
                this.findBetterPosition(playerPosition, gameState);
            }
        } else {
            this.state = 'moving';
            this.findBetterPosition(playerPosition, gameState);
        }
    }

    // Execute current state behavior
    executeState(deltaTime, gameState) {
        switch (this.state) {
            case 'moving':
                this.executeMovement(deltaTime, gameState);
                break;
            case 'attacking':
                this.executeAttack(gameState);
                break;
            case 'retreating':
                this.executeRetreat(deltaTime, gameState);
                break;
            case 'using_ability':
                this.executeAbility(gameState);
                break;
        }
    }

    // Execute movement behavior
    executeMovement(deltaTime, gameState) {
        if (!this.target) return;

        const direction = this.getDirection(this.champion.position, this.target);
        const speed = this.champion.speed * this.behaviorPattern.movementSpeed;
        
        // Add strafing movement
        const strafeVector = this.getStrafingVector();
        
        // Add avoidance for projectiles and obstacles
        const avoidanceVector = this.getAvoidanceVector(gameState);
        
        // Combine all movement vectors
        const finalDirection = {
            x: direction.x * 0.6 + strafeVector.x * 0.3 + avoidanceVector.x * 0.1,
            y: direction.y * 0.6 + strafeVector.y * 0.3 + avoidanceVector.y * 0.1
        };

        // Normalize and apply movement
        const magnitude = Math.sqrt(finalDirection.x * finalDirection.x + finalDirection.y * finalDirection.y);
        if (magnitude > 0) {
            const moveX = (finalDirection.x / magnitude) * speed * deltaTime;
            const moveY = (finalDirection.y / magnitude) * speed * deltaTime;
            
            this.gameEngine.updatePlayerPosition(this.playerId, {
                x: this.champion.position.x + moveX,
                y: this.champion.position.y + moveY
            });
        }
    }

    // Execute attack behavior
    executeAttack(gameState) {
        if (!this.lastPlayerPosition) return;

        const targetPosition = this.predictedPlayerPosition || this.lastPlayerPosition;
        
        // Calculate aim direction with some inaccuracy
        const aimDirection = this.getDirection(this.champion.position, targetPosition);
        const inaccuracy = (1 - this.aggressionLevel) * 0.2; // More inaccuracy for lower aggression
        
        // Add some randomness to aim
        aimDirection.x += (Math.random() - 0.5) * inaccuracy;
        aimDirection.y += (Math.random() - 0.5) * inaccuracy;
        
        // Normalize direction
        const magnitude = Math.sqrt(aimDirection.x * aimDirection.x + aimDirection.y * aimDirection.y);
        if (magnitude > 0) {
            aimDirection.x /= magnitude;
            aimDirection.y /= magnitude;
        }

        // Simulate mouse position for weapon firing
        const mouseX = this.champion.position.x + aimDirection.x * 100;
        const mouseY = this.champion.position.y + aimDirection.y * 100;
        
        // Fire weapon
        this.gameEngine.handleBotWeaponFire(this.playerId, mouseX, mouseY);
    }

    // Execute retreat behavior
    executeRetreat(deltaTime, gameState) {
        let retreatTarget = this.currentCover;
        
        // If no cover, retreat away from player
        if (!retreatTarget && this.lastPlayerPosition) {
            const direction = this.getDirection(this.lastPlayerPosition, this.champion.position);
            retreatTarget = {
                x: this.champion.position.x + direction.x * 200,
                y: this.champion.position.y + direction.y * 200
            };
            
            // Keep within arena bounds
            retreatTarget.x = Math.max(50, Math.min(CONFIG.ARENA_WIDTH - 50, retreatTarget.x));
            retreatTarget.y = Math.max(50, Math.min(CONFIG.ARENA_HEIGHT - 50, retreatTarget.y));
        }
        
        this.target = retreatTarget;
        this.executeMovement(deltaTime, gameState);
    }

    // Execute ability usage
    executeAbility(gameState) {
        const now = Date.now();
        if (now - this.lastAbilityUse < this.abilityUseCooldown) {
            this.state = 'attacking';
            return;
        }

        const distance = this.getDistance(this.champion.position, this.lastPlayerPosition);
        
        // Choose ability based on situation and champion type
        let abilityToUse = null;
        
        if (this.champion.type === 'VANGUARD') {
            if (distance > 150 && distance < 300) {
                abilityToUse = 'Q'; // Charge
            } else if (distance < 120) {
                abilityToUse = 'E'; // Ground Slam
            }
        } else if (this.champion.type === 'RANGER') {
            if (distance > 200 && this.hasLineOfSight(this.lastPlayerPosition, gameState)) {
                abilityToUse = 'Q'; // Piercing Shot
            } else if (distance < 150) {
                abilityToUse = 'E'; // Scout Trap
            }
        } else if (this.champion.type === 'MAGE') {
            if (distance > 250 && this.hasLineOfSight(this.lastPlayerPosition, gameState)) {
                abilityToUse = 'Q'; // Fireball
            } else if (this.champion.health < this.champion.maxHealth * 0.5) {
                abilityToUse = 'E'; // Teleport
            }
        }

        if (abilityToUse) {
            this.gameEngine.handleBotAbility(this.playerId, abilityToUse, this.lastPlayerPosition);
            this.lastAbilityUse = now;
        }
        
        this.state = 'attacking';
    }

    // Check if bot should use ability
    shouldUseAbility(distance, healthPercentage) {
        const now = Date.now();
        if (now - this.lastAbilityUse < this.abilityUseCooldown) {
            return false;
        }

        const useChance = this.behaviorPattern.abilityUsage * this.aggressionLevel;
        return Math.random() < useChance;
    }

    // Find better position for combat
    findBetterPosition(playerPosition, gameState) {
        const preferredDistance = this.behaviorPattern.preferredRange;
        const currentDistance = this.getDistance(this.champion.position, playerPosition);
        
        let targetPosition;
        
        if (currentDistance < preferredDistance) {
            // Move away from player
            const direction = this.getDirection(playerPosition, this.champion.position);
            targetPosition = {
                x: this.champion.position.x + direction.x * 100,
                y: this.champion.position.y + direction.y * 100
            };
        } else {
            // Move closer to player
            const direction = this.getDirection(this.champion.position, playerPosition);
            targetPosition = {
                x: this.champion.position.x + direction.x * 100,
                y: this.champion.position.y + direction.y * 100
            };
        }
        
        // Keep within arena bounds
        targetPosition.x = Math.max(50, Math.min(CONFIG.ARENA_WIDTH - 50, targetPosition.x));
        targetPosition.y = Math.max(50, Math.min(CONFIG.ARENA_HEIGHT - 50, targetPosition.y));
        
        this.target = targetPosition;
    }

    // Find cover position
    findCover(gameState) {
        // Simple cover finding - move to corners or behind destructible cover
        const corners = [
            { x: 100, y: 100 },
            { x: CONFIG.ARENA_WIDTH - 100, y: 100 },
            { x: 100, y: CONFIG.ARENA_HEIGHT - 100 },
            { x: CONFIG.ARENA_WIDTH - 100, y: CONFIG.ARENA_HEIGHT - 100 }
        ];
        
        // Find nearest corner
        let nearestCorner = corners[0];
        let nearestDistance = this.getDistance(this.champion.position, nearestCorner);
        
        for (const corner of corners) {
            const distance = this.getDistance(this.champion.position, corner);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestCorner = corner;
            }
        }
        
        this.currentCover = nearestCorner;
        this.target = nearestCorner;
    }

    // Get strafing movement vector
    getStrafingVector() {
        const now = Date.now();
        
        // Change strafe direction periodically
        if (now - this.strafeChangeTime > 1000 + Math.random() * 2000) {
            this.strafeDirection *= -1;
            this.strafeChangeTime = now;
        }
        
        // Calculate perpendicular strafe vector
        if (this.lastPlayerPosition) {
            const toPlayer = this.getDirection(this.champion.position, this.lastPlayerPosition);
            return {
                x: -toPlayer.y * this.strafeDirection * this.behaviorPattern.strafeFrequency,
                y: toPlayer.x * this.strafeDirection * this.behaviorPattern.strafeFrequency
            };
        }
        
        return { x: 0, y: 0 };
    }

    // Get avoidance vector for projectiles and obstacles
    getAvoidanceVector(gameState) {
        let avoidanceX = 0;
        let avoidanceY = 0;
        
        // Avoid projectiles
        if (gameState.projectiles) {
            for (const projectile of gameState.projectiles) {
                if (projectile.ownerId === this.playerId) continue;
                
                const distance = this.getDistance(this.champion.position, projectile.position);
                if (distance < 80) {
                    const direction = this.getDirection(projectile.position, this.champion.position);
                    const influence = Math.max(0, 1 - distance / 80);
                    avoidanceX += direction.x * influence;
                    avoidanceY += direction.y * influence;
                }
            }
        }
        
        return { x: avoidanceX, y: avoidanceY };
    }

    // Check if bot has line of sight to target
    hasLineOfSight(targetPosition, gameState) {
        // Simple line of sight check - check if any walls are in the way
        // This is a simplified version - you could implement ray casting for more accuracy
        return true; // For now, assume always has line of sight
    }

    // Get direction vector from point A to point B
    getDirection(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        if (magnitude === 0) return { x: 0, y: 0 };
        
        return {
            x: dx / magnitude,
            y: dy / magnitude
        };
    }

    // Get distance between two points
    getDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // React to taking damage
    onDamage(damage, source) {
        this.lastDamageTime = Date.now();
        
        // Increase aggression slightly when taking damage
        this.aggressionLevel = Math.min(1.0, this.aggressionLevel + 0.1);
        
        // Consider retreating if health is low
        const healthPercentage = (this.champion.health / this.champion.maxHealth) * 100;
        if (healthPercentage < this.retreatThreshold) {
            this.state = 'retreating';
        }
    }

    // React to enemy actions
    onEnemyAction(action, position) {
        // Implement reaction to enemy abilities, movement, etc.
        this.reactionTime = Math.max(100, this.reactionTime - 10); // Get better over time
    }

    // Set difficulty level
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        
        switch (difficulty) {
            case 'easy':
                this.aggressionLevel = 0.5;
                this.actionDelay = 250;
                this.reactionTime = 500;
                this.abilityUseCooldown = 3000;
                break;
            case 'medium':
                this.aggressionLevel = 0.7;
                this.actionDelay = 150;
                this.reactionTime = 300;
                this.abilityUseCooldown = 2000;
                break;
            case 'hard':
                this.aggressionLevel = 0.9;
                this.actionDelay = 100;
                this.reactionTime = 150;
                this.abilityUseCooldown = 1500;
                break;
        }
    }

    // Reset bot state for new round
    reset() {
        this.state = 'idle';
        this.target = null;
        this.lastAction = 0;
        this.lastPlayerPosition = null;
        this.predictedPlayerPosition = null;
        this.lastDecisionTime = 0;
        this.lastAbilityUse = 0;
        console.log('Bot AI reset for new round');
    }
}

// Export for global use
window.BotAI = BotAI; 