import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';
import * as Constants from '../../Constants.js';

//Holds everything related to entity motion

export default class MovementComponent {
    static DEFAULT_MOVE_SPEED = 5;
    static DEFAULT_MAX_JUMP_HEIGHT = 1;
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.MOVEMENT;

        //movement constants (not supposed to change during gameplay)
        this.maxJumpHeight = this.constructor.DEFAULT_MAX_JUMP_HEIGHT;
        this.jumpSpeed = Math.sqrt(2 * Constants.GRAVITY * this.maxJumpHeight); // max height: (1/2)mv^2=mgh => v=sqrt(2gh)
        this.moveSpeed = this.constructor.DEFAULT_MOVE_SPEED;  // from characterState
        this.repulsionDuration = 0.2;//seconds
        this.maxHitRepulsionForce = 5;
        
        //loop variables
        this.moveVector = new THREE.Vector3();
        this.verticalSpeed = 0;
        this.jump = false;
        this.hitRepulsionForce = new THREE.Vector3(0,0,0);
    }
}
