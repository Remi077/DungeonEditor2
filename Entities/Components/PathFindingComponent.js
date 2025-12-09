import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';
import * as Shared from '../../Shared.js';

export default class PathFindingComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.PATHFINDING;
        this.timeSinceLastCalculatedPath = Math.random() * Shared.calculatePathPeriod;
        this.pathbuffer = [];
        this.lastKnownPlayerPosition = new THREE.Vector3();
        this.debugSpheres = [];
    }
}
