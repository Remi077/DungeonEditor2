import * as THREE from 'three';
import { ECT } from '../Entity.js';

//Holds UV animation data - supports both continuous scrolling and frame-by-frame atlas animation

export default class UVAnimComponent {
    constructor(texture) {
        this.type = ECT.UVANIM;

        // --- Continuous scrolling mode ---
        this.speedUV = new THREE.Vector2(1,0);
        this.offsetUV = new THREE.Vector2(0,0);
        this.loop = true;

        // --- Frame-by-frame atlas animation mode ---
        this.isFrameAnimation = false;  // If true, use frame animation instead of scrolling
        this.atlasSize = new THREE.Vector2(1, 1);  // Grid size (e.g., 4x4 = 16 frames)
        this.frameCount = 1;            // Total number of frames
        this.frameRate = 10;            // Frames per second
        this.currentFrame = 0;          // Current frame index (0 to frameCount-1)
        this.frameTime = 0;             // Accumulated time for frame switching
        this.frameLoop = true;          // Whether to loop the animation

        this.texture = texture; // material.map
    }
}
