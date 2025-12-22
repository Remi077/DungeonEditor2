import { ECT } from '../Entities/Entity.js';
import GameStateManager, { GAMESTATES } from '../Infra/GameStateManager.js';

export default class HealthManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
    }

   update(dt) {
        for (const e of this.world.query(ECT.GAMEPLAY)) {

            const gp = e.gameplay;
            const isPlayer = e.playerCtrl;
            const mv = e.movement;

            // console.log(e.name, gp.isHurt, gp.invincibility)
            //is player alive?
            if (gp.health <= 0) {
                if (isPlayer) this.game.stateManager.setState(GAMESTATES.GAMEOVER);
            } else if (gp.isHit) {
                this.hurt(e, gp.perpetrator)
                //we've processed the hit 
                //now reset hit state
                gp.isHit = false;
                gp.perpetrator = null;
            }

            // update invincibility status
            gp.timeSinceLastHit += dt;
            if (gp.timeSinceLastHit > 1) gp.invincibility = false;

            if (mv){
                //update repulsion forces from hit
                if (gp.timeSinceLastHit > mv.repulsionDuration){
                    mv.hitRepulsionForce.set(0,0,0);
                }
            }

        }
    }

    hurt(target, source) {

        //update health
        const gp = target.gameplay;
        if (gp.invincibility || gp.health <= 0) return;
        gp.invincibility = true;
        // gp.health -= 50;
        gp.health -= 10;
        gp.isHurt = true;
        console.log("OUCH")
        console.log(target.name, "was hurt by", source.name)

        //cancel attack
        const att = target?.attack;
        if (att) att.isAttacking = false; //cancel the attack on hurt
        
        //repulsion force
        const mv = target.movement
        if (mv){
            const vs = target.visual;
            const vssource = source.visual;
            const hitRepulsionForce = vs.root.position.clone().sub(vssource.root.position);
            hitRepulsionForce.y = 0;
            hitRepulsionForce.normalize().multiplyScalar(mv.maxHitRepulsionForce);
            mv.hitRepulsionForce.copy(hitRepulsionForce);
        }
        gp.timeSinceLastHit = 0;

    }


}
