// @ts-nocheck
import * as THREE from 'three';

export default class CameraManager {
    constructor(camera, camYawObj, camPitchObj) {
        this.camera = camera;
        this.camYawObj = camYawObj;
        this.camPitchObj = camPitchObj;
        this.sensitivity = 0.002;
        this.maxPitch = Math.PI / 2;
    }

    update(dt, world) {
        // keep camera holder at same position as body
        const player = world.player;
        const root = player.visual.root;
        camera.position.copy(root.position);
        camera.position.y += player.transform.cameraHeight; //keep same height for now
        //maybe add some tweaks?
    }

    mousemove(x,y) {
        this.camYawObj.rotation.y -= x * sensitivity; // Y-axis (left/right)
        this.camPitchObj.rotation.x -= y * sensitivity; // X-axis (up/down)

        // Clamp pitch to prevent flipping
        this.camPitchObj.rotation.x = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.camPitchObj.rotation.x));
    }

}
