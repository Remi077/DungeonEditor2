import * as THREE from 'three';
import { ECT } from '../Entity.js';

// holds all entity gameplay related properties

export default class GameplayComponent {
    constructor() {
        this.type = ECT.GAMEPLAY;

        //health
        this.health = 100;
        this.maxHealth = 100;

        //hurt related
        this.invincibility = false;
        this.isHurt = false;
        this.perpetrator = false;
        this.timeSinceLastHit = 0;

        //UI related
        this.healthBar = null;
        this.timeSinceHealthBarShowedUp = 0;
    }
}
