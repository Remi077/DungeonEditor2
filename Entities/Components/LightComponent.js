import { ECT } from '../Entity.js';

export default class LightComponent {
    constructor(light, {
        frequency = 1.0,   // oscillations per second
        jitter = 0.0,      // random noise amplitude
        phase = 0.0,       // phase offset in radians
        intensityAmp = 0.2 // how much intensity varies (0–1)
    } = {}) {
        this.type = ECT.LIGHT;

        // Three.js light reference
        this.light = light;

        // Initial (baseline) values
        this.baseIntensity = light.intensity;
        this.baseColor = light.color.clone();

        // Animation parameters
        this.frequency = frequency;
        this.jitter = jitter;
        this.phase = phase;
        this.intensityAmp = intensityAmp;

        // Internal time accumulator
        this.time = 0;
    }
}
