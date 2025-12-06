import * as THREE from 'three';

export const moveSpeed = 5;

export default class TransformComponent {
    constructor() {
        this.type = 'Transform';
        this.moveVector = new THREE.Vector3();
        this.moveSpeed = moveSpeed;  // from characterState
        this.newPosition = new THREE.Vector3();
        this.newRotation = new THREE.Quaternion();
        this.verticalSpeed = 0;
        this.tweakPos = null;
        this.tweakRot = null;
        this.verticalSpeed = 0;
    }
}
