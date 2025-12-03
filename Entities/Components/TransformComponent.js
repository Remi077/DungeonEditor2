import * as THREE from 'three';

export const moveSpeed = 5;

export default class TransformComponent {
    constructor(position = new THREE.Vector3(), rotation = new THREE.Quaternion()) {
        this.position = position;
        this.rotation = rotation;
        this.newPosition = position.clone();
        this.moveVector = new THREE.Vector3();
        this.moveSpeed = moveSpeed;  // from characterState
        this.tweakPos = null;
        this.tweakRot = null;
    }
}
