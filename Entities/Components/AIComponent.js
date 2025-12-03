export const calculatePathPeriod = 1.5;

export const ENEMY_STATES = {
    IDLE: 1,
    PATROL: 2,
    CHASE: 3,
    SEARCH: 4,
    DEATH: 5
};

export default class AIComponent {
    constructor() {
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
    }
}
