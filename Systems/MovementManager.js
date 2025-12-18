export default class MovementManager {
    constructor(game) {
        this.game = game;
    }

    update(dt, world) {
       for (const e of world.query(MOVEMENT, COLLISION)) {
            const mv = e.movement;
            const col = e.collision;

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
            moveVector.y += mv.verticalSpeed;

            moveVector.add(mv.hitRepulsionForce);

            //decorrelate from framerate
            moveVector.multiplyScalar(dt);

        }
    }

}
