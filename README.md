# Arena Champions

A dynamic 1v1 top-down shooter featuring unique champions with tactical abilities, real-time multiplayer, and competitive gameplay.

## 🎮 Game Features

### Core Gameplay
- **1v1 Arena Combat**: Fast-paced tactical battles in dynamic arenas
- **Champion System**: Choose from 3 unique champions with distinct abilities
- **Best-of-Three Matches**: Competitive match structure with round-based gameplay
- **Real-time Multiplayer**: Smooth online gameplay with lag compensation

### Champions

#### 🛡️ Vanguard (Tank)
- **Weapon**: Shotgun with spread damage
- **Passive**: Gains shield after avoiding damage for 5 seconds
- **Q - Charge**: Dashes forward, knocking back enemies
- **E - Ground Slam**: Creates shockwave that slows nearby enemies

#### 🏹 Ranger (Marksman)
- **Weapon**: Long-range precision rifle
- **Passive**: Gains movement speed boost after hitting with abilities
- **Q - Piercing Shot**: High-velocity shot that pierces through obstacles
- **E - Scout Trap**: Places invisible trap that roots and reveals enemies

#### 🔮 Mage (Burst Caster)
- **Weapon**: Energy bolts with moderate fire rate
- **Passive**: Every 4th attack deals AOE damage
- **Q - Fireball**: Explosive projectile with area damage
- **E - Teleport**: Instant short-distance teleportation

### Game Features
- **Dynamic Arenas**: Destructible cover and strategic positioning
- **Public Lobby System**: Join games easily without manual codes
- **Champion Select**: 30-second selection phase with visual preview
- **Audio System**: Immersive sound effects using Web Audio API
- **Scoreboard**: Track kills, deaths, and damage dealt
- **Client-side Prediction**: Smooth gameplay with lag compensation
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (for development server)
- Firebase account (for multiplayer backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd arena-champions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Anonymous providers)
   - Create a Firestore database
   - Copy your Firebase configuration to `js/config.js`

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open the game**
   - Navigate to `http://localhost:3000`
   - The game will automatically initialize

## ⚙️ Configuration

### Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add project" and follow the setup

2. **Enable Authentication**
   - In Firebase Console, go to Authentication > Sign-in method
   - Enable "Anonymous" sign-in provider

3. **Create Firestore Database**
   - Go to Firestore Database > Create database
   - Choose "Start in test mode" (configure security rules later)

4. **Get Configuration**
   - Go to Project Settings > General > Your apps
   - Click "Add app" and choose Web
   - Copy the Firebase configuration object

5. **Update Config File**
   ```javascript
   // In js/config.js, update the FIREBASE_CONFIG object:
   FIREBASE_CONFIG: {
       apiKey: "your-api-key",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "123456789",
       appId: "your-app-id"
   }
   ```

### Game Configuration

Customize game settings in `js/config.js`:

```javascript
// Game balance settings
PLAYER_SPEED: 200,          // Base movement speed
PLAYER_HEALTH: 100,         // Starting health
CHAMPION_SELECT_TIME: 30000, // Selection time in ms
ROUNDS_TO_WIN: 2,           // Rounds needed to win match

// Network settings
SYNC_INTERVAL: 50,          // Network sync rate (ms)
LAG_COMPENSATION: 100,      // Lag compensation (ms)

// Audio settings
AUDIO_ENABLED: true,        // Enable/disable audio
MASTER_VOLUME: 0.5,         // Master volume (0-1)
```

## 🎯 How to Play

### Controls
- **WASD**: Move your champion
- **Mouse**: Aim and look direction
- **Left Click**: Fire primary weapon
- **Q**: Use first ability
- **E**: Use second ability
- **Tab**: Hold to show scoreboard
- **Esc**: Return to lobby

### Game Flow
1. **Join/Host Game**: Use the lobby to find or create games
2. **Champion Select**: Choose your champion within 30 seconds
3. **Battle**: Fight in best-of-three rounds
4. **Victory**: First to win 2 rounds wins the match

### Strategy Tips
- Use destructible cover for protection and tactical advantage
- Learn each champion's abilities and cooldowns
- Positioning is crucial - control the arena
- Use abilities to control space and movement
- Predict enemy movements and pre-aim shots

## 🛠️ Development

### Project Structure
```
arena-champions/
├── index.html              # Main HTML file
├── style.css              # Game styling
├── package.json           # Dependencies
├── js/
│   ├── config.js          # Game configuration
│   ├── firebase.js        # Firebase integration
│   ├── champions.js       # Champion system
│   ├── arena.js           # Arena and collision
│   ├── game.js            # Core game engine
│   ├── audio.js           # Audio system
│   ├── lobby.js           # Lobby management
│   ├── multiplayer.js     # Network synchronization
│   └── main.js            # Main orchestrator
```

### Key Systems

#### Game Engine (`js/game.js`)
- Core game loop and rendering
- Input handling and client-side prediction
- Physics and collision detection
- Entity management

#### Champions System (`js/champions.js`)
- Champion abilities and behaviors
- Weapon systems and projectiles
- Status effects and cooldowns
- Passive abilities

#### Multiplayer (`js/multiplayer.js`)
- Real-time synchronization
- Lag compensation
- Client-side prediction
- Network optimization

#### Audio System (`js/audio.js`)
- Web Audio API integration
- Dynamic sound generation
- Spatial audio effects
- Volume controls

### Adding New Champions

1. **Define Champion Data** in `js/config.js`:
   ```javascript
   NEW_CHAMPION: {
       name: "Champion Name",
       type: "Role",
       icon: "🎯",
       color: "#FF5733",
       stats: { health: 100, speed: 200, damage: 30 },
       weapon: { /* weapon config */ },
       passive: { /* passive ability */ },
       abilities: { /* Q and E abilities */ }
   }
   ```

2. **Implement Champion Logic** in `js/champions.js`:
   - Add ability methods
   - Handle passive effects
   - Create projectile types

3. **Add UI Elements**:
   - Champion card in HTML
   - Ability icons and descriptions
   - Audio effects

### Performance Optimization

- **Network**: Adjust sync rates based on connection quality
- **Rendering**: Use object pooling for projectiles and effects
- **Audio**: Limit concurrent sounds to prevent audio lag
- **Memory**: Clean up unused objects and event listeners

## 🔧 Troubleshooting

### Common Issues

**Game won't start**
- Check browser console for errors
- Verify Firebase configuration
- Ensure all JavaScript files are loaded

**Connection issues**
- Check internet connection
- Verify Firebase project is active
- Check Firestore security rules

**Audio not working**
- Check browser audio permissions
- Verify Web Audio API support
- Try different browser

**Performance issues**
- Reduce visual effects in config
- Lower network sync rate
- Close other browser tabs

### Debug Mode

Enable debug mode in `js/config.js`:
```javascript
DEBUG_MODE: true
```

This shows:
- FPS counter
- Network statistics
- Client prediction info
- Error logs

## 🚀 Deployment

### Production Deployment

1. **Build for Production**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting**
   ```bash
   firebase init hosting
   firebase deploy
   ```

3. **Configure Security Rules**
   Update Firestore security rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /games/{gameId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### Environment Variables

Set production environment variables:
- `FIREBASE_CONFIG`: Production Firebase config
- `ANALYTICS_ID`: Google Analytics ID
- `ERROR_REPORTING`: Error reporting service

## 📊 Analytics and Monitoring

### Built-in Analytics
- Player connection statistics
- Match duration and outcomes
- Champion selection rates
- Performance metrics

### Error Reporting
- Automatic error logging
- Performance monitoring
- Network quality tracking
- User experience metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Use ES6+ features
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and small

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Web Audio API for dynamic sound generation
- Firebase for real-time multiplayer backend
- HTML5 Canvas for 2D rendering
- Modern web standards for cross-platform compatibility

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review browser console errors
- Check Firebase configuration
- Verify network connectivity

---

**Have fun playing Arena Champions!** 🎮⚔️ 