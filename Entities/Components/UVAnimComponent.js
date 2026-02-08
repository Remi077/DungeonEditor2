import * as THREE from 'three';
import { ECT } from '../Entity.js';

//Holds entity position (center and bottom) and rotation

export default class UVAnimComponent {
    constructor(texture) {
        this.type = ECT.UVANIM;
        this.speedUV = new THREE.Vector2(1,0);
        this.offsetUV = new THREE.Vector2(0,0);
        this.loop   = true;

        this.texture = texture; // material.map
    }
}
