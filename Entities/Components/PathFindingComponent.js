import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class PathFindingComponent {
    static DEFAULT_RECALC_PERIOD = 1.5; //frequency at which pathfinding is reevaluated for an entity

    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.PATHFINDING;
        this.recalcPeriod = PathFindingComponent.DEFAULT_RECALC_PERIOD;
        this.timeSinceLastCalculatedPath = Math.random() * PathFindingComponent.DEFAULT_RECALC_PERIOD;
        this.pathbuffer = [];
        this.lastKnownPlayerPosition = new THREE.Vector3();
        this.debugSpheres = [];
    }
}
