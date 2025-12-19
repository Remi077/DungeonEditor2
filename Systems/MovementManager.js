import { ECT } from '../Entities/Entity.js';
import * as Constants from '../Constants.js';

export default class MovementManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
    }

   update(dt) {
       for (const e of this.world.query(ECT.MOVEMENT, ECT.COLLISION)) {
            const mv = e.movement;
            const col = e.collision;
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
                    mv.verticalSpeed = - 0.1; //small downward force to keep grounded
                }
            } else if (col.isInWater) { //in water downward speed attenuates quickly to 0
                mv.verticalSpeed = (Math.abs(mv.verticalSpeed) < 0.00001) ? 0 : (mv.verticalSpeed * 0.93)
            } else {
                mv.verticalSpeed = Math.max(-Constants.MAXFALLSPEED, mv.verticalSpeed - (Constants.GRAVITY * dt));
            }
            mv.moveVector.y += mv.verticalSpeed;

            mv.moveVector.add(mv.hitRepulsionForce);

            //decorrelate from framerate
            mv.moveVector.multiplyScalar(dt);

        }
    }

}
