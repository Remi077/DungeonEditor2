// @ts-nocheck
import * as THREE from 'three';

export default class MovementManager {
    constructor(game) {
        this.game = game;
    }

    update(dt, world) {
       for (const e of world.query(TRANSFORM, COLLISION)) {
            const tr = e.transform;
            const col = e.collision;
            const ctrl = e.playerController || e.ai;
            const gp = e.gameplay;

            // horizontal movement
            if (ctrl)
                tr.moveVector.multiplyScalar(tr.moveSpeed);

            //update vertical speed
            if (
                (!col.isInWater && col.isTouchingGround)
                || (col.isAtSurface)
            ) {
                if (isPlayer && tr?.jump) {
                    tr.verticalSpeed = tr.jumpSpeed;
                    tr.jump = false;
                } else if (!col.isInWater) {
                    tr.verticalSpeed = - 0.1; //small downward force to keep grounded
                }
            } else if (col.isInWater) { //in water downward speed attenuates quickly to 0
                tr.verticalSpeed = (Math.abs(tr.verticalSpeed) < 0.00001) ? 0 : (tr.verticalSpeed * 0.93)
            } else {
                tr.verticalSpeed = Math.max(-Constants.MAXFALLSPEED, tr.verticalSpeed - (Constants.GRAVITY * dt));
            }
            moveVector.y += tr.verticalSpeed;


            moveVector.add(gp.hitRepulsionForce);

            //decorrelate from framerate
            moveVector.multiplyScalar(dt);


        }
    }

}
