// @ts-nocheck
import * as THREE from 'three';


export default class MaterialManager {
    constructor(game) {
        this.game = game;
    }

    update(dt, world){
       for (const e of world.query(VISUAL, GAMEPLAY)) {
            const gp = e.gameplay;
            const vs = e.visual;
            if (gp.invincibility)
                vs.skinnedMesh.material = vs.hurtMaterial;
            else
                vs.skinnedMesh.material = vs.normalMaterial;
       }
    }


}