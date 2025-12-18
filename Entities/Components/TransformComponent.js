import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

//Holds entity position (center and bottom) and rotation

export default class TransformComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.TRANSFORM;
        this.positionCenter = new THREE.Vector3(); //typically position of the capsule center
        this.positionRoot   = new THREE.Vector3(); //typically position of the capsule bottom (mesh feet)
        this.rotation = new THREE.Quaternion();
    }
}
