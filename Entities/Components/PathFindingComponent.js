import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

// holds all stuff related to pathfinding for enemies

export default class PathFindingComponent {
    static DEFAULT_RECALC_PERIOD = 1.5; //frequency at which pathfinding is reevaluated for an entity

    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.PATHFINDING;

        //constants
        this.recalcPeriod = PathFindingComponent.DEFAULT_RECALC_PERIOD;

        //loop variables
        this.timeSinceLastCalculatedPath = Math.random() * PathFindingComponent.DEFAULT_RECALC_PERIOD;
        this.lastKnownPlayerPosition = new THREE.Vector3();
        this.pathbuffer = [];
        this.debugSpheres = [];
    }
}
