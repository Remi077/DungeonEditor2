import { ENEMY_STATES } from '../../Systems/AIManager.js';
import { ECT } from '../Entity.js';
import * as Debug from '../../Debug.js';

// holds enemy AI related properties

export default class AIComponent {
    constructor() {
        this.type = ECT.AI;
        
        //main fsm state
        this.enemyState = ENEMY_STATES.IDLE;
        
        //sight properties
        this.playerSeen = false; //this AI has seen the player 
        this.timeSinceLastSeen = 0; //last time AI saw the player
        this.timeSinceLastSightCheck = 0; //last time AI did the raycast check
        this.lastSeenPlayerPosition = null; //last place where player was seen
        
        //fsm control
        this.timeSinceChangedState = 0;
        this.animationFinished = new Map();

        //constant
        this.enemyAttackDistance = 1.1; //default (should be set by prefab)
        this.patrolPath = []; //set by prefab

        //Debug
        this.debugSpheres = [];
        this.debugLine = Debug.getNewDebugLine();
    }
}
