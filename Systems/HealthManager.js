import { ECT } from '../Entities/Entity.js';
import GameStateManager, { GAMESTATES } from '../Infra/GameStateManager.js';

export default class HealthManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.config = game.config;
    }

   update(dt) {
        for (const e of this.world.query(ECT.GAMEPLAY)) {

            const gp = e.gameplay;
            const isPlayer = e.playerCtrl;
            const mv = e.movement;

            // Handle oxygen depletion/recovery for player
            if (isPlayer && e.capsuleCol) {
                const col = e.capsuleCol;
                const oxygenConfig = this.config.get('player.oxygen');

                // Fully submerged - deplete oxygen
                if (col.isInWater && !col.isAtSurface) {
                    gp.oxygen = Math.max(0, gp.oxygen - oxygenConfig.depletionRate * dt);
                    gp.timeSinceOxygenAt100 = 0;
                }
                // At surface - recover oxygen
                else if (col.isAtSurface) {
                    gp.oxygen = Math.min(gp.maxOxygen, gp.oxygen + oxygenConfig.recoveryRate * dt);
                }
                // Not in water - oxygen stays at max
                else if (!col.isInWater) {
                    gp.oxygen = gp.maxOxygen;
                }

                // Track time at 100%
                if (gp.oxygen >= gp.maxOxygen) {
                    gp.timeSinceOxygenAt100 += dt;
                } else {
                    gp.timeSinceOxygenAt100 = 0;
                }

                // Drowning damage when oxygen depleted
                if (gp.oxygen <= 0) {
                    gp.health = Math.max(0, gp.health - oxygenConfig.drowningDamageRate * dt);
                }
            }

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
            const invincibilityDuration = isPlayer
                ? this.config.get('player.combat.invincibilityDuration', 1.0)
                : this.config.get('zombie.combat.invincibilityDuration', 1.0);
            if (gp.timeSinceLastHit > invincibilityDuration) gp.invincibility = false;

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

        // Get damage from config based on source type
        const isSourcePlayer = source.playerCtrl;
        const damage = isSourcePlayer
            ? this.config.get('player.combat.damage', 10)
            : this.config.get('zombie.combat.damage', 10);

        gp.health -= damage;
        gp.isHurt = true; //set here, reset in AI for enemies (not used by playercontroller)
        // console.log(target.name, "was hurt by", source.name)

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
