import { ECT } from '../Entities/Entity.js';

export default class MovementManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.config = game.config;
    }

   update(dt) {
       // Get physics config
       const physicsConfig = this.config.getPhysics();
       const gravity = physicsConfig.gravity || 9.81;
       const maxFallSpeed = physicsConfig.maxFallSpeed || 50;
       const groundedDownwardForce = physicsConfig.groundedDownwardForce || -0.1;

       for (const e of this.world.query(ECT.MOVEMENT, ECT.CAPSULECOLLIDER)) {
            const mv = e.movement;
            const col = e.capsuleCol;
            const isPlayer = e.playerCtrl

            // horizontal movement
            mv.moveVector.multiplyScalar(mv.moveSpeed);

            //update vertical speed
            if (
                (!col.isInWater && col.isTouchingGround)
                || (col.isAtSurface)
            ) {
                if (isPlayer && mv?.jump) {
                    mv.verticalSpeed = mv.jumpSpeed;
                    mv.jump = false;
                } else if (!col.isInWater) {
                    mv.verticalSpeed = groundedDownwardForce; //small downward force to keep grounded
                }
            } else if (col.isInWater) { //in water downward speed attenuates quickly to 0
                const waterAttenuation = this.config.get('player.movement.waterSpeedAttenuation', 0.93);
                mv.verticalSpeed = (Math.abs(mv.verticalSpeed) < 0.00001) ? 0 : (mv.verticalSpeed * waterAttenuation)
            } else {
                mv.verticalSpeed = Math.max(-maxFallSpeed, mv.verticalSpeed - (gravity * dt));
            }
            mv.moveVector.y += mv.verticalSpeed;

            mv.moveVector.add(mv.hitRepulsionForce);

            //decorrelate from framerate
            mv.moveVector.multiplyScalar(dt);

        }
    }

}
