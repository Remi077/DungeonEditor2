import * as THREE from 'three';
import { ECT } from '../Entity.js';
import { configManager } from '../../Infra/ConfigManager.js';

// holds all entity gameplay related properties

export default class GameplayComponent {
    constructor(characterType = 'player') {
        this.type = ECT.GAMEPLAY;

        // Get config for this character type
        const config = configManager.getCharacter(characterType);

        //health
        this.health = config.health?.startingHealth || 100;
        this.maxHealth = config.health?.maxHealth || 100;

        //oxygen (for drowning)
        this.oxygen = config.oxygen?.maxOxygen || 100;
        this.maxOxygen = config.oxygen?.maxOxygen || 100;
        this.timeSinceOxygenAt100 = 0; // Track time oxygen has been at 100%

        //hurt related
        this.invincibility = false;
        this.isHit = false;
        this.isHurt = false;
        this.perpetrator = false;
        this.timeSinceLastHit = 0;

        //UI related
        this.healthBar = null;
        this.oxygenBar = null;
        this.timeSinceHealthBarShowedUp = 0;
    }
}
