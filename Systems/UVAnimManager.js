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

            if (uv.isFrameAnimation) {
                // --- Frame-by-frame atlas animation mode ---
                uv.frameTime += dt;
                const frameDuration = 1 / uv.frameRate;

                // Advance to next frame when enough time has passed
                if (uv.frameTime >= frameDuration) {
                    uv.frameTime -= frameDuration;
                    uv.currentFrame++;

                    // Handle looping
                    if (uv.currentFrame >= uv.frameCount) {
                        if (uv.frameLoop) {
                            uv.currentFrame = 0;
                        } else {
                            uv.currentFrame = uv.frameCount - 1;
                        }
                    }
                }

                // Calculate UV offset for current frame (left-to-right, top-to-bottom)
                const col = uv.currentFrame % uv.atlasSize.x;
                const row = Math.floor(uv.currentFrame / uv.atlasSize.x);
                const tileWidth = 1 / uv.atlasSize.x;
                const tileHeight = 1 / uv.atlasSize.y;

                // Set texture repeat to show only one tile
                tex.repeat.set(tileWidth, tileHeight);

                // Set offset to select the current frame
                tex.offset.set(col * tileWidth, row * tileHeight);

            } else {
                // --- Continuous scrolling mode ---
                uv.offsetUV.addScaledVector(uv.speedUV, dt);

                if (uv.loop) {
                    uv.offsetUV.x %= 1;
                    uv.offsetUV.y %= 1;
                }

                tex.offset.copy(uv.offsetUV);
            }
        }
    }

}