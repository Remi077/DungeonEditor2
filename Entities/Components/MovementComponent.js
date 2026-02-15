import * as THREE from 'three';
import { ECT } from '../Entity.js';
import { configManager } from '../../Infra/ConfigManager.js';

//Holds everything related to entity motion

export default class MovementComponent {
    static DEFAULT_MOVE_SPEED = 5;
    static DEFAULT_MAX_JUMP_HEIGHT = 1;
    constructor(characterType = 'player') {
        this.type = ECT.MOVEMENT;

        // Get config for this character type
        const config = configManager.getCharacter(characterType);
        const physicsConfig = configManager.getPhysics();

        //movement constants (not supposed to change during gameplay)
        this.maxJumpHeight = config.movement?.maxJumpHeight || this.constructor.DEFAULT_MAX_JUMP_HEIGHT;
        this.jumpSpeed = Math.sqrt(2 * physicsConfig.gravity * this.maxJumpHeight); // max height: (1/2)mv^2=mgh => v=sqrt(2gh)
        this.moveSpeed = config.movement?.moveSpeed || this.constructor.DEFAULT_MOVE_SPEED;
        this.repulsionDuration = config.combat?.repulsionDuration || 0.2;
        this.maxHitRepulsionForce = config.combat?.maxHitRepulsionForce || 5;

        //loop variables
        this.moveVector = new THREE.Vector3();
        this.verticalSpeed = 0;
        this.jump = false;
        this.hitRepulsionForce = new THREE.Vector3(0,0,0);
    }
}
