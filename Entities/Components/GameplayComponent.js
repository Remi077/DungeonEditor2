import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class GameplayComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.GAMEPLAY;
        this.health = 100;
        this.maxHealth = 100;
        this.invincibility = false;
        this.timeSinceLastHit = 0;
        this.hitRepulsionForce = new THREE.Vector3(0,0,0);
        this.healthBar = null;
        this.timeSinceHealthBarShowedUp = 0;
    }
}
