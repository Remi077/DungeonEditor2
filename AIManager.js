// @ts-nocheck
import * as THREE from 'three';
import * as Shared from '../Shared.js';
import { ENTITY_COMPONENT_TAGS } from './Entities/Entity.js';

export const ENEMY_STATES = {
    IDLE: 1,
    PATROL: 2,
    CHASE: 3,
    ATTACK: 4,
    HURT: 5,
    SEARCH: 6,
    DEATH: 7
};

export default class AIManager {
    constructor(game) {
        this.game = game;
        this.pathFindingManager = this.game.systems.pathFindingManager;
    }

    calculateDesiredMovement(dt, entity) {

        const aiComponent = entity.get(ENTITY_COMPONENT_TAGS.AI);
        const gpComponent = entity.get(ENTITY_COMPONENT_TAGS.GAMEPLAY);
        const transformComponent = entity.get(ENTITY_COMPONENT_TAGS.TRANSFORM);
        const player = this.game.playerEntity;
        if (!aiComponent || !gpComponent || !transformComponent || !player) return;

        const moveVector = transformComponent.moveVector;
        const pf = this.pathFindingManager;

        let targetPos = null;
        let inReach = false;

        //check if enemy sees player (dont do this every frame)
        if (aiComponent.timeSinceLastSightCheck > 0.3) {
            aiComponent.timeSinceLastSightCheck = 0;
            const {playerSeen, lastSeenPlayerPosition} = this.canEnemySeeTarget(entity, player);
            aiComponent.playerSeen = playerSeen;
            if (aiComponent.playerSeen) {
                aiComponent.lastSeenPlayerPosition = lastSeenPlayerPosition;
                // console.log("PLAYER DETECTED at", aiComponent.lastSeenPlayerPosition);
                aiComponent.timeSinceLastSeen = 0;
            }
        } else {
            aiComponent.timeSinceLastSightCheck += dt;
        }


        // enemy state machine

        const enemyAttackDistance = 1.2; //TODO: move in constants or in prefab
        const invincibleDuration = 1;//TODO: same
        switch (aiComponent.enemyState) {
            case ENEMY_STATES.IDLE:
                //stay still
                moveVector.set(0, 0, 0);
                // playClip(ec, "Idle", true);
                //if detects player go to chase
                if (aiComponent.playerSeen) {
                    // aiComponent.enemyState = ENEMY_STATES.CHASE;
                }
                //else after a certain time, patrol
                else if (aiComponent.timeSinceChangedState > 5) {
                    aiComponent.timeSinceChangedState = 0;
                    if (aiComponent.patrolPath.length > 0)
                        ;
                        // aiComponent.enemyState = ENEMY_STATES.PATROL;
                }
                break;
            case ENEMY_STATES.PATROL:
                //go along patrol path
                // playClip(ec, "Walk", true);
                targetPos = aiComponent.patrolPath[0].clone();
                inReach = pf.moveEntityToWithin(entity, targetPos, 1, dt);
                if (inReach)
                    this.rotateLeft(aiComponent.patrolPath)
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
                inReach = pf.moveEntityToWithin(entity, targetPos, enemyAttackDistance, dt);
                if (inReach && !gpComponent.invincibility) //enemy cannot attack if it just got hurt (invincible)
                    aiComponent.enemyState = ENEMY_STATES.ATTACK;
                //if line of sight breaks for a certain time, search
                if (!aiComponent.playerSeen) {
                    console.log("timeSinceLastSeen", aiComponent.timeSinceLastSeen)
                    aiComponent.timeSinceLastSeen += dt;
                    if (aiComponent.timeSinceLastSeen > 1) {
                        console.log("SEARCH");
                        aiComponent.enemyState = ENEMY_STATES.SEARCH;
                        if (1) Shared.drawDebugSpheres(
                            [aiComponent.lastSeenPlayerPosition],
                            aiComponent.debugSpheres,
                            this.game.scene,
                            Shared.debugSphereMaterialBlue
                        );
                    }
                }
                break;
            case ENEMY_STATES.ATTACK:
                //moveVector.set(0,0,0);
                targetPos = this.game.yawObject.position.clone();
                inReach = pf.moveEntityToWithin(entity, targetPos, enemyAttackDistance, dt);
                if (!inReach)
                    aiComponent.enemyState = ENEMY_STATES.CHASE;
                break;
            case ENEMY_STATES.HURT:
                moveVector.set(0,0,0);
                gpComponent.invincibility = true;
                // if (aiComponent.timeSinceChangedState > invincibleDuration) {
                if (aiComponent.animationFinished) {
                    aiComponent.animationFinished = false;
                    aiComponent.timeSinceChangedState = 0;
                    aiComponent.enemyState = ENEMY_STATES.CHASE;
                    gpComponent.invincibility = false;
                }
                break;
            case ENEMY_STATES.SEARCH:
                //go to last place where player was seen
                // playClip(ec, "Walk", true);
                //TODO: project lastSeenPlayerPosition on navmesh to be sure enemy cannot get stuck
                targetPos = aiComponent.lastSeenPlayerPosition.clone();
                inReach = pf.moveEntityToWithin(entity, targetPos, 1, dt);
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
                gpComponent.invincibility = true;
                moveVector.set(0,0,0);
                // if (aiComponent.animationFinished){
                //     aiComponent.animationFinished = false;
                // }
                //do nothing anymore (despawn?)
                break;
        }
        aiComponent.timeSinceChangedState += dt;

    }

    //rotate array
    rotateLeft(arr) {
        arr.push(arr.shift());
    }

    
    canEnemySeeTarget(entity, targetEntity, sightDistance = 10, fovDegrees = 90) {

        //get target middle body and entity eye positions
        const targetpc = targetEntity.get(ENTITY_COMPONENT_TAGS.PHYSICS);
        const targetPos = targetpc.getBodyTranslation();
        const pc = entity.get(ENTITY_COMPONENT_TAGS.PHYSICS);
        const enemyEyes = pc.getBodyTranslation();
        enemyEyes.y += ((pc.capsuleTotalHeight/2) * 0.9);
    
    
        // 1️⃣ Early exit: too far
        const dist = targetPos.distanceTo(enemyEyes);
        if (dist > sightDistance) return false;
    
        // 2️⃣ Check FOV
        const enemyRotation = pc.getBodyQuaternion();
        const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemyRotation);
        const toTarget = targetPos.clone().sub(enemyEyes).normalize();
        const angle = enemyForward.angleTo(toTarget); // radians
        const ai = entity.get(ENTITY_COMPONENT_TAGS.AI);
        if (
            (ai.enemyState === ENEMY_STATES.IDLE) ||
            (ai.enemyState === ENEMY_STATES.PATROL)
        ) //when in chase/search mode enemy can see from all angles (otherwise too easy to run in the back of enemies)
        {
            if (angle > THREE.MathUtils.degToRad(fovDegrees / 2)) return false; // outside FOV
        }
        
        // 3️⃣ Collect raycastable objects
        const visibleTargets = this.game.systems.levelManager.getRaycastTargets(true, true, true);//static, actionnables and characters
        const targetMesh = targetEntity.get(ENTITY_COMPONENT_TAGS.VISUAL).root;
        visibleTargets.push(targetMesh); //add player

        // 4️⃣ Raycast from enemy to target
        // Setup ray from enemy to target
        const origin = enemyEyes;
        const direction = targetPos.clone().sub(origin).normalize();
    
        this.game.raycaster.set(origin, direction);
    
        const intersects = this.game.raycaster.intersectObjects(visibleTargets, true); // recursive
    
        if (intersects.length === 0) return false;

        // const start = origin.clone();
        // const end = origin.clone().add(direction.clone().multiplyScalar(100)); // Extend ray visually
        // ai.debugLine.geometry.setFromPoints([start, end]);
        // this.game.scene.add(ai.debugLine);


        // 5️⃣ Check if first hit is the target or its descendant    
        // Check if the first hit is target or a descendant of target
        let hitObj = intersects[0].object;
        // console.log("!!!ENEMY" + entity.name + "sees " + hitObj.name);
        while (hitObj) {
            if (hitObj === targetMesh) {
    
                // Ray start & end
                const start = origin.clone();
                const end = origin.clone().add(direction.clone().multiplyScalar(100)); // Extend ray visually
    
                // Update line geometry
                ai.debugLine.geometry.setFromPoints([start, end]);
    
                // Toggle visibility
                this.game.scene.add(ai.debugLine);//TEMP, TOIMPROVE
                // ai.debugLine.visible = true;
    
                return {
                    playerSeen : true,
                    lastSeenPlayerPosition : targetPos,
                }
            }
            // Stop if we've reached a Group or the Scene
            if (hitObj.type === 'Group' || hitObj.type === 'Scene') break;
            hitObj = hitObj.parent;
        }
    
        return {
            playerSeen : false,
            lastSeenPlayerPosition : null,
        }
    }

    hurt(entity) {
        const ai = entity.get(ENTITY_COMPONENT_TAGS.AI);
        ai.enemyState = ENEMY_STATES.HURT;
        ai.timeSinceChangedState = 0;
    }

    die(entity) {
        const ai = entity.get(ENTITY_COMPONENT_TAGS.AI);
        ai.enemyState = ENEMY_STATES.DEATH;
        ai.timeSinceChangedState = 0;
    }

}