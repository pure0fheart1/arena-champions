// Audio System - Handles game audio and sound effects
class AudioManager {
    constructor() {
        this.enabled = CONFIG.AUDIO_ENABLED;
        this.masterVolume = CONFIG.MASTER_VOLUME;
        this.audioContext = null;
        this.sounds = new Map();
        this.soundQueues = new Map();
        this.initializeAudioContext();
        this.createSounds();
    }

    // Initialize Web Audio API context
    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }

    // Create sound effects using Web Audio API
    createSounds() {
        if (!this.enabled || !this.audioContext) return;

        // Create different types of sounds
        this.createWeaponSounds();
        this.createAbilitySounds();
        this.createGameEventSounds();
        this.createUIEventSounds();
    }

    // Create weapon sounds
    createWeaponSounds() {
        // Vanguard Shotgun
        this.sounds.set('weapon_vanguard', this.createShotgunSound());
        
        // Ranger Rifle
        this.sounds.set('weapon_ranger', this.createRifleSound());
        
        // Mage Energy Bolt
        this.sounds.set('weapon_mage', this.createEnergyBoltSound());
    }

    // Create ability sounds
    createAbilitySounds() {
        // Vanguard abilities
        this.sounds.set('ability_vanguard_q', this.createChargeSound());
        this.sounds.set('ability_vanguard_e', this.createGroundSlamSound());
        
        // Ranger abilities
        this.sounds.set('ability_ranger_q', this.createPiercingShotSound());
        this.sounds.set('ability_ranger_e', this.createTrapSound());
        
        // Mage abilities
        this.sounds.set('ability_mage_q', this.createFireballSound());
        this.sounds.set('ability_mage_e', this.createTeleportSound());
    }

    // Create game event sounds
    createGameEventSounds() {
        this.sounds.set('damage_taken', this.createDamageSound());
        this.sounds.set('death', this.createDeathSound());
        this.sounds.set('round_start', this.createRoundStartSound());
        this.sounds.set('round_end', this.createRoundEndSound());
        this.sounds.set('victory', this.createVictorySound());
        this.sounds.set('explosion', this.createExplosionSound());
        this.sounds.set('trap_activation', this.createTrapActivationSound());
    }

    // Create UI event sounds
    createUIEventSounds() {
        this.sounds.set('ui_click', this.createClickSound());
        this.sounds.set('ui_hover', this.createHoverSound());
        this.sounds.set('champion_select', this.createChampionSelectSound());
    }

    // Create shotgun sound (low frequency, spread pattern)
    createShotgunSound() {
        return (volume = 0.3) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.1);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }

    // Create rifle sound (sharp, precise)
    createRifleSound() {
        return (volume = 0.4) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.05);
            
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    // Create energy bolt sound (electronic, pulsing)
    createEnergyBoltSound() {
        return (volume = 0.35) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.03);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.06);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
            filter.Q.setValueAtTime(5, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }

    // Create charge sound (whoosh effect)
    createChargeSound() {
        return (volume = 0.5) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.3);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(volume * this.masterVolume, this.audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }

    // Create ground slam sound (impact)
    createGroundSlamSound() {
        return (volume = 0.6) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.4);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.4);
        };
    }

    // Create piercing shot sound (high-pitched whine)
    createPiercingShotSound() {
        return (volume = 0.4) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 0.2);
            
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(500, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }

    // Create trap sound (mechanical click)
    createTrapSound() {
        return (volume = 0.3) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.02);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    // Create fireball sound (magical swoosh)
    createFireballSound() {
        return (volume = 0.45) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.Q.setValueAtTime(3, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }

    // Create teleport sound (digital distortion)
    createTeleportSound() {
        return (volume = 0.4) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(1600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.2);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.Q.setValueAtTime(8, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }

    // Create damage sound
    createDamageSound() {
        return (volume = 0.3) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    // Create death sound
    createDeathSound() {
        return (volume = 0.5) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    }

    // Create round start sound
    createRoundStartSound() {
        return (volume = 0.4) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.4);
        };
    }

    // Create round end sound
    createRoundEndSound() {
        return (volume = 0.4) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.4);
        };
    }

    // Create victory sound
    createVictorySound() {
        return (volume = 0.5) => {
            if (!this.audioContext) return;
            
            const frequencies = [440, 554, 659, 880];
            
            frequencies.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.1);
                
                gainNode.gain.setValueAtTime(volume * this.masterVolume * 0.7, this.audioContext.currentTime + index * 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + index * 0.1 + 0.3);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start(this.audioContext.currentTime + index * 0.1);
                oscillator.stop(this.audioContext.currentTime + index * 0.1 + 0.3);
            });
        };
    }

    // Create explosion sound
    createExplosionSound() {
        return (volume = 0.5) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }

    // Create trap activation sound
    createTrapActivationSound() {
        return (volume = 0.4) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }

    // Create click sound
    createClickSound() {
        return (volume = 0.2) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.05);
        };
    }

    // Create hover sound
    createHoverSound() {
        return (volume = 0.1) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    // Create champion select sound
    createChampionSelectSound() {
        return (volume = 0.3) => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }

    // Play weapon sound
    playWeaponSound(championType) {
        if (!this.enabled) return;
        
        const soundKey = `weapon_${championType.toLowerCase()}`;
        const sound = this.sounds.get(soundKey);
        if (sound) {
            sound();
        }
    }

    // Play ability sound
    playAbilitySound(championType, ability) {
        if (!this.enabled) return;
        
        const soundKey = `ability_${championType.toLowerCase()}_${ability}`;
        const sound = this.sounds.get(soundKey);
        if (sound) {
            sound();
        }
    }

    // Play damage sound
    playDamageSound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('damage_taken');
        if (sound) {
            sound();
        }
    }

    // Play death sound
    playDeathSound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('death');
        if (sound) {
            sound();
        }
    }

    // Play trap sound
    playTrapSound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('trap_activation');
        if (sound) {
            sound();
        }
    }

    // Play round start sound
    playRoundStartSound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('round_start');
        if (sound) {
            sound();
        }
    }

    // Play round end sound
    playRoundEndSound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('round_end');
        if (sound) {
            sound();
        }
    }

    // Play victory sound
    playVictorySound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('victory');
        if (sound) {
            sound();
        }
    }

    // Play explosion sound
    playExplosionSound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('explosion');
        if (sound) {
            sound();
        }
    }

    // Play UI sound
    playUISound(type) {
        if (!this.enabled) return;
        
        const sound = this.sounds.get(`ui_${type}`);
        if (sound) {
            sound();
        }
    }

    // Play champion select sound
    playChampionSelectSound() {
        if (!this.enabled) return;
        
        const sound = this.sounds.get('champion_select');
        if (sound) {
            sound();
        }
    }

    // Set master volume
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    // Enable/disable audio
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Cleanup
    cleanup() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.sounds.clear();
    }
} 