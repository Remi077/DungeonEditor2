import * as THREE from 'three';
import { ENEMY_STATES } from '../../AIManager.js';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';
import * as Shared from '../../Shared.js';
export const calculatePathPeriod = 1.5;


export default class AIComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.AI;
        this.timeSinceLastCalculatedPath = Math.random() * calculatePathPeriod;
        this.pathBuffer = null;
        this.lastKnownPlayerPosition = null;
        this.lastSeenPlayerPosition = null;
        this.timeSinceLastSightCheck = 0;
        this.playerSeen = false;
        this.timeSinceLastSeen = 0;
        this.enemyState = ENEMY_STATES.IDLE;
        this.timeSinceChangedState = 0;
        this.patrolPath = [];
        this.debugSpheres = [];
        this.debugLine = new THREE.Line(Shared.debugLineGeometry, Shared.debugLineMaterial);
    }
}
