import { ECT } from '../Entities/Entity.js';

export default class UVAnimManager {

    constructor(game) {
        this.game = game;
        this.world = game.world;
    }

    update(dt) {
        for (const e of this.world.query(ECT.UVANIM)) {
            const uv = e.get(ECT.UVANIM);
            const tex = uv.texture;

            if (!tex) continue;

            uv.offsetUV.addScaledVector(uv.speedUV, dt);

            if (uv.loop) {
                uv.offsetUV.x %= 1;
                uv.offsetUV.y %= 1;
            }

            tex.offset.copy(uv.offsetUV);
        }
    }
    
}