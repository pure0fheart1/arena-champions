// Champion System - Handles champion abilities and behaviors
class Champion {
    constructor(type, playerId, position) {
        this.type = type;
        this.playerId = playerId;
        this.config = CHAMPIONS[type];
        this.position = position;
        this.health = this.config.stats.health;
        this.maxHealth = this.config.stats.health;
        this.speed = this.config.stats.speed;
        this.lastShot = 0;
        this.abilities = {
            q: { cooldown: 0, lastUsed: 0 },
            e: { cooldown: 0, lastUsed: 0 }
        };
        this.effects = {
            shield: { active: false, value: 0, lastDamage: 0 },
            speedBoost: { active: false, multiplier: 1, endTime: 0 },
            slow: { active: false, multiplier: 1, endTime: 0 },
            root: { active: false, endTime: 0 }
        };
        this.passiveState = {
            attackCount: 0,
            lastPassiveProc: 0
        };
        this.rotation = 0;
        this.alive = true;
    }

    // Update champion state
    update(deltaTime) {
        const now = Date.now();
        
        // Update ability cooldowns
        this.abilities.q.cooldown = Math.max(0, this.config.abilities.q.cooldown - (now - this.abilities.q.lastUsed));
        this.abilities.e.cooldown = Math.max(0, this.config.abilities.e.cooldown - (now - this.abilities.e.lastUsed));
        
        // Update effects
        this.updateEffects(now);
        
        // Update passive abilities
        this.updatePassive(now);
    }

    // Update status effects
    updateEffects(now) {
        // Shield effect (Vanguard passive)
        if (this.type === 'VANGUARD' && !this.effects.shield.active) {
            if (now - this.effects.shield.lastDamage >= this.config.passive.cooldown) {
                this.effects.shield.active = true;
                this.effects.shield.value = this.config.passive.value;
            }
        }

        // Speed boost effect (Ranger passive)
        if (this.effects.speedBoost.active && now >= this.effects.speedBoost.endTime) {
            this.effects.speedBoost.active = false;
            this.effects.speedBoost.multiplier = 1;
        }

        // Slow effect
        if (this.effects.slow.active && now >= this.effects.slow.endTime) {
            this.effects.slow.active = false;
            this.effects.slow.multiplier = 1;
        }

        // Root effect
        if (this.effects.root.active && now >= this.effects.root.endTime) {
            this.effects.root.active = false;
        }
    }

    // Update passive abilities
    updatePassive(now) {
        // Mage passive - reset attack count after delay
        if (this.type === 'MAGE' && this.passiveState.attackCount > 0) {
            if (now - this.passiveState.lastPassiveProc >= 5000) {
                this.passiveState.attackCount = 0;
            }
        }
    }

    // Check if can shoot
    canShoot() {
        return Date.now() - this.lastShot >= this.config.weapon.fireRate;
    }

    // Fire primary weapon
    shoot(targetX, targetY) {
        if (!this.canShoot()) return null;
        
        const now = Date.now();
        this.lastShot = now;
        
        const projectiles = [];
        const angle = Math.atan2(targetY - this.position.y, targetX - this.position.x);
        
        // Handle different weapon types
        switch (this.config.weapon.type) {
            case 'shotgun':
                projectiles.push(...this.createShotgunProjectiles(angle));
                break;
            case 'rifle':
                projectiles.push(...this.createRifleProjectiles(angle));
                break;
            case 'energy_bolt':
                projectiles.push(...this.createEnergyBoltProjectiles(angle));
                break;
        }

        // Handle Mage passive (4th attack AOE)
        if (this.type === 'MAGE') {
            this.passiveState.attackCount++;
            if (this.passiveState.attackCount === 4) {
                this.passiveState.attackCount = 0;
                this.passiveState.lastPassiveProc = now;
                // Add AOE effect to the projectile
                projectiles.forEach(proj => {
                    proj.aoe = {
                        radius: this.config.passive.radius,
                        damage: this.config.passive.damage
                    };
                });
            }
        }

        return projectiles;
    }

    // Create shotgun projectiles
    createShotgunProjectiles(baseAngle) {
        const projectiles = [];
        const spreadRad = (this.config.weapon.spread * Math.PI) / 180;
        
        for (let i = 0; i < this.config.weapon.pellets; i++) {
            const spread = (i - (this.config.weapon.pellets - 1) / 2) * (spreadRad / this.config.weapon.pellets);
            const angle = baseAngle + spread;
            
            projectiles.push({
                id: `${this.playerId}_${Date.now()}_${i}`,
                x: this.position.x,
                y: this.position.y,
                startX: this.position.x,
                startY: this.position.y,
                vx: Math.cos(angle) * CONFIG.PROJECTILE_SPEED,
                vy: Math.sin(angle) * CONFIG.PROJECTILE_SPEED,
                damage: this.config.weapon.damage,
                range: this.config.weapon.range,
                owner: this.playerId,
                type: 'shotgun_pellet',
                piercing: false,
                createdAt: Date.now()
            });
        }
        
        return projectiles;
    }

    // Create rifle projectiles
    createRifleProjectiles(angle) {
        return [{
            id: `${this.playerId}_${Date.now()}`,
            x: this.position.x,
            y: this.position.y,
            startX: this.position.x,
            startY: this.position.y,
            vx: Math.cos(angle) * CONFIG.PROJECTILE_SPEED,
            vy: Math.sin(angle) * CONFIG.PROJECTILE_SPEED,
            damage: this.config.weapon.damage,
            range: this.config.weapon.range,
            owner: this.playerId,
            type: 'rifle_bullet',
            piercing: false,
            createdAt: Date.now()
        }];
    }

    // Create energy bolt projectiles
    createEnergyBoltProjectiles(angle) {
        return [{
            id: `${this.playerId}_${Date.now()}`,
            x: this.position.x,
            y: this.position.y,
            startX: this.position.x,
            startY: this.position.y,
            vx: Math.cos(angle) * CONFIG.PROJECTILE_SPEED,
            vy: Math.sin(angle) * CONFIG.PROJECTILE_SPEED,
            damage: this.config.weapon.damage,
            range: this.config.weapon.range,
            owner: this.playerId,
            type: 'energy_bolt',
            piercing: false,
            createdAt: Date.now()
        }];
    }

    // Use Q ability
    useAbilityQ(targetX, targetY) {
        const now = Date.now();
        if (this.abilities.q.cooldown > 0) return null;
        
        this.abilities.q.lastUsed = now;
        this.abilities.q.cooldown = this.config.abilities.q.cooldown;
        
        switch (this.type) {
            case 'VANGUARD':
                return this.vanguardCharge(targetX, targetY);
            case 'RANGER':
                return this.rangerPiercingShot(targetX, targetY);
            case 'MAGE':
                return this.mageFireball(targetX, targetY);
        }
        
        return null;
    }

    // Use E ability
    useAbilityE(targetX, targetY) {
        const now = Date.now();
        if (this.abilities.e.cooldown > 0) return null;
        
        this.abilities.e.lastUsed = now;
        this.abilities.e.cooldown = this.config.abilities.e.cooldown;
        
        switch (this.type) {
            case 'VANGUARD':
                return this.vanguardGroundSlam();
            case 'RANGER':
                return this.rangerScoutTrap(targetX, targetY);
            case 'MAGE':
                return this.mageTeleport(targetX, targetY);
        }
        
        return null;
    }

    // Vanguard Charge ability
    vanguardCharge(targetX, targetY) {
        const angle = Math.atan2(targetY - this.position.y, targetX - this.position.x);
        const distance = Math.min(this.config.abilities.q.range, 
            Math.sqrt(Math.pow(targetX - this.position.x, 2) + Math.pow(targetY - this.position.y, 2)));
        
        const newX = this.position.x + Math.cos(angle) * distance;
        const newY = this.position.y + Math.sin(angle) * distance;
        
        return {
            type: 'charge',
            startPos: { x: this.position.x, y: this.position.y },
            endPos: { x: newX, y: newY },
            damage: this.config.abilities.q.damage,
            knockback: this.config.abilities.q.knockback,
            playerId: this.playerId
        };
    }

    // Vanguard Ground Slam ability
    vanguardGroundSlam() {
        return {
            type: 'ground_slam',
            position: { x: this.position.x, y: this.position.y },
            radius: this.config.abilities.e.radius,
            damage: this.config.abilities.e.damage,
            slowDuration: this.config.abilities.e.slowDuration,
            playerId: this.playerId
        };
    }

    // Ranger Piercing Shot ability
    rangerPiercingShot(targetX, targetY) {
        const angle = Math.atan2(targetY - this.position.y, targetX - this.position.x);
        
        return {
            type: 'piercing_shot',
            projectile: {
                id: `${this.playerId}_pierce_${Date.now()}`,
                x: this.position.x,
                y: this.position.y,
                startX: this.position.x,
                startY: this.position.y,
                vx: Math.cos(angle) * CONFIG.PROJECTILE_SPEED * 1.5,
                vy: Math.sin(angle) * CONFIG.PROJECTILE_SPEED * 1.5,
                damage: this.config.abilities.q.damage,
                range: this.config.abilities.q.range,
                owner: this.playerId,
                type: 'piercing_shot',
                piercing: true,
                createdAt: Date.now()
            }
        };
    }

    // Ranger Scout Trap ability
    rangerScoutTrap(targetX, targetY) {
        return {
            type: 'scout_trap',
            position: { x: targetX, y: targetY },
            radius: this.config.abilities.e.radius,
            rootDuration: this.config.abilities.e.rootDuration,
            revealDuration: this.config.abilities.e.revealDuration,
            playerId: this.playerId,
            id: `trap_${this.playerId}_${Date.now()}`
        };
    }

    // Mage Fireball ability
    mageFireball(targetX, targetY) {
        const angle = Math.atan2(targetY - this.position.y, targetX - this.position.x);
        
        return {
            type: 'fireball',
            projectile: {
                id: `${this.playerId}_fireball_${Date.now()}`,
                x: this.position.x,
                y: this.position.y,
                startX: this.position.x,
                startY: this.position.y,
                vx: Math.cos(angle) * CONFIG.PROJECTILE_SPEED * 0.8,
                vy: Math.sin(angle) * CONFIG.PROJECTILE_SPEED * 0.8,
                damage: this.config.abilities.q.damage,
                range: this.config.abilities.q.range,
                owner: this.playerId,
                type: 'fireball',
                piercing: false,
                aoe: {
                    radius: this.config.abilities.q.radius,
                    damage: this.config.abilities.q.damage
                },
                createdAt: Date.now()
            }
        };
    }

    // Mage Teleport ability
    mageTeleport(targetX, targetY) {
        const angle = Math.atan2(targetY - this.position.y, targetX - this.position.x);
        const distance = Math.min(this.config.abilities.e.range,
            Math.sqrt(Math.pow(targetX - this.position.x, 2) + Math.pow(targetY - this.position.y, 2)));
        
        const newX = this.position.x + Math.cos(angle) * distance;
        const newY = this.position.y + Math.sin(angle) * distance;
        
        return {
            type: 'teleport',
            startPos: { x: this.position.x, y: this.position.y },
            endPos: { x: newX, y: newY },
            playerId: this.playerId
        };
    }

    // Take damage
    takeDamage(damage) {
        // Apply shield if active (Vanguard)
        if (this.effects.shield.active) {
            const shieldAbsorb = Math.min(damage, this.effects.shield.value);
            damage -= shieldAbsorb;
            this.effects.shield.value -= shieldAbsorb;
            
            if (this.effects.shield.value <= 0) {
                this.effects.shield.active = false;
                this.effects.shield.value = 0;
            }
        }
        
        // Apply damage
        this.health -= damage;
        this.effects.shield.lastDamage = Date.now();
        
        // Check if dead
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
        
        return damage;
    }

    // Heal
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    // Apply speed boost (Ranger passive)
    applySpeedBoost() {
        if (this.type === 'RANGER' && this.config.passive.type === 'speed_boost') {
            this.effects.speedBoost.active = true;
            this.effects.speedBoost.multiplier = this.config.passive.value;
            this.effects.speedBoost.endTime = Date.now() + this.config.passive.duration;
        }
    }

    // Apply slow effect
    applySlow(duration, multiplier = 0.5) {
        this.effects.slow.active = true;
        this.effects.slow.multiplier = multiplier;
        this.effects.slow.endTime = Date.now() + duration;
    }

    // Apply root effect
    applyRoot(duration) {
        this.effects.root.active = true;
        this.effects.root.endTime = Date.now() + duration;
    }

    // Get current movement speed
    getCurrentSpeed() {
        let speed = this.speed;
        
        if (this.effects.speedBoost.active) {
            speed *= this.effects.speedBoost.multiplier;
        }
        
        if (this.effects.slow.active) {
            speed *= this.effects.slow.multiplier;
        }
        
        if (this.effects.root.active) {
            speed = 0;
        }
        
        return speed;
    }

    // Get ability cooldown info
    getAbilityCooldowns() {
        const now = Date.now();
        return {
            q: {
                ready: this.abilities.q.cooldown <= 0,
                cooldown: Math.max(0, this.config.abilities.q.cooldown - (now - this.abilities.q.lastUsed))
            },
            e: {
                ready: this.abilities.e.cooldown <= 0,
                cooldown: Math.max(0, this.config.abilities.e.cooldown - (now - this.abilities.e.lastUsed))
            }
        };
    }

    // Reset for new round
    reset() {
        this.health = this.maxHealth;
        this.alive = true;
        this.abilities.q.cooldown = 0;
        this.abilities.e.cooldown = 0;
        this.effects = {
            shield: { active: false, value: 0, lastDamage: 0 },
            speedBoost: { active: false, multiplier: 1, endTime: 0 },
            slow: { active: false, multiplier: 1, endTime: 0 },
            root: { active: false, endTime: 0 }
        };
        this.passiveState = {
            attackCount: 0,
            lastPassiveProc: 0
        };
    }

    // Get visual representation data
    getVisualData() {
        return {
            position: this.position,
            rotation: this.rotation,
            health: this.health,
            maxHealth: this.maxHealth,
            champion: this.type,
            effects: this.effects,
            alive: this.alive,
            abilities: this.getAbilityCooldowns()
        };
    }
}

// Champion Factory
class ChampionFactory {
    static createChampion(type, playerId, position) {
        if (!CHAMPIONS[type]) {
            throw new Error(`Unknown champion type: ${type}`);
        }
        
        return new Champion(type, playerId, position);
    }
    
    static getChampionInfo(type) {
        return CHAMPIONS[type] || null;
    }
    
    static getAllChampions() {
        return Object.keys(CHAMPIONS);
    }
} 