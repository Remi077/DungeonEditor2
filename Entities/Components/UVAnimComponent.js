import * as THREE from 'three';
import { ECT } from '../Entity.js';

//Holds entity position (center and bottom) and rotation

export default class UVAnimComponent {
    constructor() {
        this.type = ECT.UVANIM;
        this.speedUV = new THREE.Vector2(1,1);
        this.offsetUV = new THREE.Vector2(0,0);
        this.loop   = true;
    }
}
