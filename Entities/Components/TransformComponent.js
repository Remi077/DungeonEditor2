import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';
import * as Constants from '../../Constants.js';

export default class TransformComponent {
    static DEFAULT_MOVE_SPEED = 5;
    static DEFAULT_MAX_JUMP_HEIGHT = 1;
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.TRANSFORM;
        this.moveVector = new THREE.Vector3();
        this.moveSpeed = this.constructor.DEFAULT_MOVE_SPEED;  // from characterState
        this.newPosition = new THREE.Vector3();
        this.newRotation = new THREE.Quaternion();
        this.verticalSpeed = 0;
        this.tweakPos = null;
        this.tweakRot = null;
        this.cameraHeight = 0;
        /*-----------------------------*/
        // jump variables
        //
        // max height
        // kinetic e = potential e
        // (1/2)mv^2=mgh
        // v=sqrt(2gh)
        /*-----------------------------*/
        this.maxJumpHeight = this.constructor.DEFAULT_MAX_JUMP_HEIGHT;
        this.jumpSpeed = Math.sqrt(2 * Constants.GRAVITY * this.maxJumpHeight);
    }
}
