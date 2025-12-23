import { ECT } from '../Entities/Entity.js';

export default class LightManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
    }

    update(dt) {
        for (const e of this.world.query(ECT.LIGHT)) {
            const lc = e.get(ECT.LIGHT);
            const light = lc.light;

            lc.time += dt;

            // Base sinusoidal variation
            const wave =
                Math.sin(
                    lc.time * Math.PI * 2 * lc.frequency + lc.phase
                );

            // Optional jitter (noise)
            const noise = lc.jitter > 0
                ? (Math.random() * 2 - 1) * lc.jitter
                : 0;

            // Final intensity multiplier
            const intensityFactor =
                1 +
                wave * lc.intensityAmp +
                noise;

            light.intensity =
                lc.baseIntensity * Math.max(0, intensityFactor);

            // Optional: subtle color flicker (very common for fire)
            if (lc.jitter > 0) {
                const colorShift = noise * 0.05;
                light.color
                    .copy(lc.baseColor)
                    .offsetHSL(0, 0, colorShift);
            } else {
                light.color.copy(lc.baseColor);
            }
        }
    }
}
