import * as THREE from 'three';

export default class GameplayComponent {
    constructor() {
        this.type = 'Gameplay';
        this.health = 100;
        this.maxHealth = 100;
        this.invincibility = false;
        this.timeSinceLastHit = 0;
        this.hitRepulsionForce = new THREE.Vector3();
        this.healthBar = null;
        this.timeSinceHealthBarShowedUp = 0;
        this.inventory = {};
        this.hotbar = [null, null, null, null, null, null, null];
        this.inventorySlots = Array(4*8).fill(null);
    }
}
