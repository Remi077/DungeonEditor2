import * as THREE from 'three';
import { ENEMY_STATES } from '../../Systems/AIManager.js';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';
import * as Debug from '../../Debug.js';


export default class AIComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.AI;
        this.pathBuffer = null;
        this.lastKnownPlayerPosition = null;
        this.lastSeenPlayerPosition = null;
        this.timeSinceLastSightCheck = 0;
        this.playerSeen = false;
        this.timeSinceLastSeen = 0;
        this.enemyState = ENEMY_STATES.IDLE;
        this.timeSinceChangedState = 0;
        this.animationFinished = false;
        this.patrolPath = [];
        this.debugSpheres = [];
        this.debugLine = new THREE.Line(Debug.debugLineGeometry, Debug.debugLineMaterial);

    }
}
