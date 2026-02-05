import { ECT } from '../Entities/Entity.js';

export default class UVAnimManager {

    constructor(game) {
        this.game = game;
        this.world = game.world;
    }

    update(dt) {
        for (const e of this.world.query(ECT.UVANIM, ECT.VISUAL)) {
            const uv = e.get(ECT.UVANIM);
            const mesh = e.get(ECT.VISUAL).mesh;

            uv.offset.addScaledVector(uv.speed, dt);

            if (uv.loop) {
                uv.offset.x = uv.offset.x % 1;
                uv.offset.y = uv.offset.y % 1;
            }

            mesh.material.map.offset.copy(uv.offset);
        }
    }
    
}