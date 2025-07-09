// Game Configuration
const CONFIG = {
    // Game Settings
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 600,
    
    // Player Settings
    PLAYER_SPEED: 200,
    PLAYER_SIZE: 20,
    PLAYER_HEALTH: 100,
    
    // Weapon Settings
    PROJECTILE_SPEED: 400,
    PROJECTILE_SIZE: 4,
    
    // Champion Settings
    CHAMPION_SELECT_TIME: 30000, // 30 seconds
    ABILITY_COOLDOWNS: {
        // Vanguard
        VANGUARD_CHARGE: 8000,
        VANGUARD_SLAM: 12000,
        
        // Ranger
        RANGER_PIERCE: 6000,
        RANGER_TRAP: 10000,
        
        // Mage
        MAGE_FIREBALL: 4000,
        MAGE_TELEPORT: 8000
    },
    
    // Arena Settings
    ARENA_WIDTH: 1000,
    ARENA_HEIGHT: 600,
    WALL_THICKNESS: 20,
    COVER_HEALTH: 50,
    
    // Game Rules
    ROUNDS_TO_WIN: 2,
    ROUND_START_DELAY: 3000,
    
    // Network Settings
    SYNC_INTERVAL: 50, // 20 FPS sync rate
    LAG_COMPENSATION: 100, // ms
    
    // Audio Settings
    AUDIO_ENABLED: true,
    MASTER_VOLUME: 0.5,
    
    // Visual Settings
    PARTICLE_COUNT: 20,
    ANIMATION_SPEED: 0.1,
    
    // Demo Mode Settings
    DEMO_MODE: false, // Set to false when Firebase is configured
    
    // Firebase Configuration - REPLACE WITH YOUR ACTUAL CONFIG
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyBmVPhafeiAEd-q6OfEntNjSvBGXT5VkNs",
        authDomain: "arena-champions.firebaseapp.com",
        projectId: "arena-champions",
        storageBucket: "arena-champions.firebasestorage.app",
        messagingSenderId: "549508130471",
        appId: "1:549508130471:web:35e85e0564806e9dc3dd82"
    }
};

// Champion Definitions
const CHAMPIONS = {
    VANGUARD: {
        name: "Vanguard",
        type: "Tank",
        icon: "🛡️",
        color: "#4CAF50",
        stats: {
            health: 120,
            speed: 180,
            damage: 25
        },
        weapon: {
            type: "shotgun",
            damage: 25,
            range: 150,
            fireRate: 800, // ms between shots
            spread: 30, // degrees
            pellets: 3
        },
        passive: {
            type: "shield",
            cooldown: 5000,
            value: 30
        },
        abilities: {
            q: {
                name: "Charge",
                cooldown: 8000,
                range: 200,
                damage: 40,
                knockback: 150
            },
            e: {
                name: "Ground Slam",
                cooldown: 12000,
                radius: 120,
                damage: 30,
                slowDuration: 3000
            }
        }
    },
    
    RANGER: {
        name: "Ranger",
        type: "Marksman",
        icon: "🏹",
        color: "#FF9800",
        stats: {
            health: 80,
            speed: 220,
            damage: 35
        },
        weapon: {
            type: "rifle",
            damage: 35,
            range: 400,
            fireRate: 1200,
            spread: 0,
            pellets: 1
        },
        passive: {
            type: "speed_boost",
            duration: 2000,
            value: 1.5
        },
        abilities: {
            q: {
                name: "Piercing Shot",
                cooldown: 6000,
                damage: 60,
                range: 500,
                piercing: true
            },
            e: {
                name: "Scout Trap",
                cooldown: 10000,
                radius: 40,
                rootDuration: 2000,
                revealDuration: 5000
            }
        }
    },
    
    MAGE: {
        name: "Mage",
        type: "Burst Caster",
        icon: "🔮",
        color: "#9C27B0",
        stats: {
            health: 90,
            speed: 200,
            damage: 30
        },
        weapon: {
            type: "energy_bolt",
            damage: 30,
            range: 300,
            fireRate: 600,
            spread: 0,
            pellets: 1
        },
        passive: {
            type: "aoe_fourth",
            damage: 20,
            radius: 80
        },
        abilities: {
            q: {
                name: "Fireball",
                cooldown: 4000,
                damage: 50,
                radius: 100,
                range: 350
            },
            e: {
                name: "Teleport",
                cooldown: 8000,
                range: 250
            }
        }
    }
};

// Game States
const GAME_STATES = {
    LOADING: 'loading',
    LOBBY: 'lobby',
    CHAMPION_SELECT: 'champion_select',
    GAME: 'game',
    VICTORY: 'victory'
};

// Input Keys
const KEYS = {
    W: 87,
    A: 65,
    S: 83,
    D: 68,
    Q: 81,
    E: 69,
    TAB: 9,
    SPACE: 32,
    ESC: 27
};

// Network Events
const NETWORK_EVENTS = {
    PLAYER_JOIN: 'player_join',
    PLAYER_LEAVE: 'player_leave',
    GAME_STATE_UPDATE: 'game_state_update',
    CHAMPION_SELECT: 'champion_select',
    PLAYER_MOVE: 'player_move',
    PLAYER_SHOOT: 'player_shoot',
    ABILITY_USE: 'ability_use',
    DAMAGE_DEALT: 'damage_dealt',
    ROUND_END: 'round_end',
    MATCH_END: 'match_end'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, CHAMPIONS, GAME_STATES, KEYS, NETWORK_EVENTS };
} 