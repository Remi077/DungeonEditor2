import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export const moveSpeed = 5;

export default class TransformComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.TRANSFORM;
        this.moveVector = new THREE.Vector3();
        this.moveSpeed = moveSpeed;  // from characterState
        this.newPosition = new THREE.Vector3();
        this.newRotation = new THREE.Quaternion();
        this.verticalSpeed = 0;
        this.tweakPos = null;
        this.tweakRot = null;
    }
}
