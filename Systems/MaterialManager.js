import { ECT } from '../Entities/Entity.js';

export default class MaterialManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
    }

    update(dt){
       for (const e of this.world.query(ECT.VISUAL, ECT.GAMEPLAY)) {
            const gp = e.gameplay;
            const vs = e.visual;
            if (gp.invincibility)
                vs.skinnedMesh.material = vs.hurtMaterial;
            else
                vs.skinnedMesh.material = vs.normalMaterial;
       }
    }


}