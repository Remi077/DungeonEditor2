# Game Config Usage Examples

## Overview

The game now uses a JSON-based configuration system for gameplay values. This makes balancing easier and allows changes without code modification.

## Files

- **Config File**: `assets/metadata/game_config.json`
- **Config Manager**: `Infra/ConfigManager.js`
- **Constants (still used)**: `Constants.js` - For enums, prefixes, technical constants

## Accessing Config Values

### Method 1: Via game.config (Recommended)

```javascript
// In any system or factory that has access to `this.game`
const moveSpeed = this.game.config.get('player.movement.moveSpeed', 5);
const gravity = this.game.config.get('physics.gravity', 9.81);
```

### Method 2: Direct import (for standalone modules)

```javascript
import { configManager } from './Infra/ConfigManager.js';

const playerConfig = configManager.getPlayer();
const moveSpeed = playerConfig.movement.moveSpeed;
```

### Method 3: Using helper methods

```javascript
const playerConfig = this.game.config.getPlayer();
const zombieConfig = this.game.config.getZombie();
const physicsConfig = this.game.config.getPhysics();
```

## Example Conversions

### Before (Hardcoded):

```javascript
// MovementComponent.js
export default class MovementComponent {
    constructor() {
        this.moveSpeed = 5; // Hardcoded!
        this.maxJumpHeight = 1; // Hardcoded!
    }
}
```

### After (Config-based):

```javascript
// MovementComponent.js
import { configManager } from '../Infra/ConfigManager.js';

export default class MovementComponent {
    constructor(characterType = 'player') {
        const config = configManager.getCharacter(characterType);
        this.moveSpeed = config.movement?.moveSpeed || 5;
        this.maxJumpHeight = config.movement?.maxJumpHeight || 1;
    }
}
```

### Or in CharacterFactory:

```javascript
// CharacterFactory.js
const mv = new MovementComponent();
const characterConfig = this.game.config.getCharacter(characterType);
mv.moveSpeed = characterConfig.movement.moveSpeed;

if (characterType === 'zombie') {
    mv.moveSpeed *= characterConfig.movement.moveSpeedMultiplier;
}
```

## Config Structure

```json
{
  "physics": {
    "gravity": 9.81,
    "maxFallSpeed": 50
  },
  "player": {
    "movement": { "moveSpeed": 5, "maxJumpHeight": 1 },
    "combat": { "attackDamageStart": 0.2, "damage": 10 },
    "health": { "startingHealth": 100, "maxHealth": 100 }
  },
  "zombie": {
    "movement": { "moveSpeed": 5, "moveSpeedMultiplier": 0.15 },
    "combat": { "attackDamageStart": 0.5, "attackDamageEnd": 0.8 },
    "ai": { "attackDistance": 1.1 }
  }
}
```

## What to Keep in Constants.js

✅ **Keep in Constants.js:**
- Enums (GAMESTATES, ECT, CHARACTER_TYPES)
- String prefixes (GLB_PREFIX)
- Collision masks (COL_MASKS, COL_LAYERS)
- Technical constants that never change

❌ **Move to game_config.json:**
- Gameplay values (speed, damage, health)
- Balance parameters (attack timing, distances)
- Physics tuning (gravity, forces)
- UI dimensions (health bar size)

## Benefits

✅ Easy to tweak without recompiling
✅ Better for game balancing
✅ Can be hot-reloaded in the future
✅ Version control friendly
✅ Designers can modify without touching code

## Files Converted to Use Config System

The following files have been updated to use the config system:

### **Components:**
- ✅ `MovementComponent.js` - Uses config for moveSpeed, maxJumpHeight, repulsionDuration, maxHitRepulsionForce
- ✅ `GameplayComponent.js` - Uses config for startingHealth, maxHealth
- ✅ `AIComponent.js` - Uses config for attackDistance

### **Systems:**
- ✅ `HealthManager.js` - Uses config for damage values and invincibilityDuration
- ✅ `MovementManager.js` - Uses config for gravity, maxFallSpeed, groundedDownwardForce, waterSpeedAttenuation

### **Factories:**
- ✅ `CharacterFactory.js` - Uses config for:
  - Attack timing (attackDamageStart, attackDamageEnd)
  - Health bar dimensions (width, height, yOffset)
  - Zombie speed multiplier

All hardcoded gameplay values have been moved to `assets/metadata/game_config.json`!

