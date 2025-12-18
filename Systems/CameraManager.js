export default class CameraManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.camYawObj = game.yawObject;
        this.camPitchObj = game.pitchObject;
        this.sensitivity = 0.002;
        this.maxPitch = Math.PI / 2;
    }

   update(dt) {
        // keep camera holder at same position as body
        const player = this.world.player;
        const position = player.tranform.positionRoot;
        this.camYawObj.position.copy(position).add(player.playerCtrl.offsetRootToCamera);
    }

    mousemove(x,y) {
        this.camYawObj.rotation.y -= x * sensitivity; // Y-axis (left/right)
        this.camPitchObj.rotation.x -= y * sensitivity; // X-axis (up/down)

        // Clamp pitch to prevent flipping
        this.camPitchObj.rotation.x = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.camPitchObj.rotation.x));
    }

}
