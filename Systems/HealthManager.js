import * as THREE from 'three';

export default class HealthManager {
    constructor(game) {
        this.game = game;

    }

    update(dt, world) {
        for (const e of world.query(GAMEPLAY)) {

            const gp = e.gameplay;
            const isPlayer = e.gameCtrl;

            //is player alive?
            const gp = e.gameplay;
            if (gp.health <= 0) {
                if (isPlayer) this.game.stateManager.setState(GAMESTATES.GAMEOVER);
            } else if (gp.isHurt) {
                gp.invincibility = true;
            }

            // update invincibility status
            gp.timeSinceLastHit += dt;
            if (gp.timeSinceLastHit > 1) gp.invincibility = false;

            //update repulsion forces from hit
            const repulsionDuration = 0.2;//1s //TODO: move to constants
            if (gp.timeSinceLastHit > repulsionDuration){
                gp.hitRepulsionForce.set(0,0,0);
            }

        }
    }

    hurt(target, source) {

        //update health
        const gp = target.gameplay;
        if (gp.invincibility || gp.health <= 0) return;
        gp.health -= 10;
        
        //cancel attack
        const wpn = target?.weapon;
        if (wpn) wpn.isAttacking = false; //cancel the attack on hurt
        
        //repulsion force
        const vs = target.visual;
        const vssource = source.visual;
        const maxHitRepulsionForce = 5;//1s //TODO: move in movementManager
        const hitRepulsionForce = vs.root.position.clone().sub(vssource.root.position);
        hitRepulsionForce.y = 0;
        hitRepulsionForce.normalize().multiplyScalar(maxHitRepulsionForce);
        gp.hitRepulsionForce.copy(hitRepulsionForce);

        //update hurt state
        gp.isHurt = true;
        gp.timeSinceLastHit = 0;

    }


}
