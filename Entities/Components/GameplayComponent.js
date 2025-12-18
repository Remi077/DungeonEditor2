import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

// holds all entity gameplay related properties

export default class GameplayComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.GAMEPLAY;

        //health
        this.health = 100;
        this.maxHealth = 100;

        //hurt related
        this.invincibility = false;
        this.isHurt = false;
        this.timeSinceLastHit = 0;
        this.hitRepulsionForce = new THREE.Vector3(0,0,0);

        //UI related
        this.healthBar = null;
        this.timeSinceHealthBarShowedUp = 0;
    }
}
