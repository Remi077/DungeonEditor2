// @ts-nocheck
import * as THREE from 'three';
import * as Shared from '../Shared.js';
import { ENTITY_COMPONENT_TAGS } from './Entities/Entity.js';

export const ENEMY_STATES = {
    IDLE: 1,
    PATROL: 2,
    CHASE: 3,
    SEARCH: 4,
    DEATH: 5
};

export default class AIManager {
    constructor(game) {
        this.game = game;
        this.pathFindingManager = this.game.systems.pathFindingManager;
    }

    calculateDesiredMovement(dt, entity) {

        const aiComponent = entity.get(ENTITY_COMPONENT_TAGS.AI);
        const transformComponent = entity.get(ENTITY_COMPONENT_TAGS.TRANSFORM);
        if (!aiComponent || !transformComponent) return;

        const moveVector = transformComponent.moveVector;
        const moveTo = this.pathFindingManager.moveEntityToWithin;

        // enemy state machine

        switch (aiComponent.enemyState) {
            case ENEMY_STATES.IDLE:
                //stay still
                moveVector.set(0, 0, 0);
                // playClip(ec, "Idle", true);
                //if detects player go to chase
                if (aiComponent.playerSeen) {
                    aiComponent.enemyState = ENEMY_STATES.CHASE;
                }
                //else after a certain time, patrol
                else if (aiComponent.timeSinceChangedState > 5) {
                    aiComponent.timeSinceChangedState = 0;
                    if (aiComponent.patrolPath.length > 0)
                        aiComponent.enemyState = ENEMY_STATES.PATROL;
                }
                break;
            case ENEMY_STATES.PATROL:
                //go along patrol path
                // playClip(ec, "Walk", true);
                targetPos = aiComponent.patrolPath[0].clone();
                inReach = moveTo(entity, targetPos, 1, dt);
                if (inReach)
                    rotateLeft(aiComponent.patrolPath)
                //if detects player go to chase
                if (aiComponent.playerSeen) {
                    aiComponent.enemyState = ENEMY_STATES.CHASE;
                }
                //else after a certain time, idle
                else if (aiComponent.timeSinceChangedState > 10) {//TODO: we could store in ec a random walk time (same for idle)
                    aiComponent.timeSinceChangedState = 0;
                    aiComponent.enemyState = ENEMY_STATES.IDLE;
                }
                break;
            case ENEMY_STATES.CHASE:
                //chase player and attack if within reach
                // playClip(ec, "Walk", true);
                targetPos = this.game.yawObject.position.clone();
                inReach = moveTo(entity, targetPos, enemyAttackDistance, dt);
                // if (inReach && !ec.invincibility) //enemy cannot attack if it just got hurt (invincible)
                //     attack(ec);
                //if line of sight breaks for a certain time, search
                if (!aiComponent.playerSeen) {
                    console.log("timeSinceLastSeen", aiComponent.timeSinceLastSeen)
                    aiComponent.timeSinceLastSeen += dt;
                    if (aiComponent.timeSinceLastSeen > 1) {
                        console.log("SEARCH");
                        aiComponent.enemyState = ENEMY_STATES.SEARCH;
                        if (0) drawDebugSphere(aiComponent.lastSeenPlayerPosition, Shared.scene);
                    }
                }
                break;
            case ENEMY_STATES.SEARCH:
                //go to last place where player was seen
                // playClip(ec, "Walk", true);
                //TODO: project lastSeenPlayerPosition on navmesh to be sure enemy cannot get stuck
                targetPos = aiComponent.lastSeenPlayerPosition.clone();
                inReach = moveTo(entity, targetPos, 1, dt);
                //if detects player go to chase
                if (aiComponent.playerSeen) {
                    aiComponent.enemyState = ENEMY_STATES.CHASE;
                }
                //else go to idle 
                else if (inReach) {
                    aiComponent.enemyState = ENEMY_STATES.IDLE;
                    aiComponent.timeSinceChangedState = 0;
                }
                break;
            case ENEMY_STATES.DEATH:
                //do nothing anymore (despawn?)
                break;
        }
        aiComponent.timeSinceChangedState += dt;

    }


}