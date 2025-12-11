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
        const player = this.game.playerEntity;
        if (!aiComponent || !transformComponent || !player) return;

        const moveVector = transformComponent.moveVector;
        const pf = this.pathFindingManager;

        const playerMesh = player.get(ENTITY_COMPONENT_TAGS.VISUAL).root;
        let targetPos = null;
        let inReach = false;

        //check if enemy sees player (dont do this every frame)
        // if (aiComponent.timeSinceLastSightCheck > 0.3) {
        //     aiComponent.timeSinceLastSightCheck = 0;
        //     aiComponent.playerSeen = canEnemySeeTarget(aiComponent, playerMesh)
        //     if (aiComponent.playerSeen) {
        //         aiComponent.lastSeenPlayerPosition = playerMesh.position.clone();
        //         console.log("PLAYER DETECTED at", aiComponent.lastSeenPlayerPosition);
        //         aiComponent.timeSinceLastSeen = 0;
        //     }
        // } else {
        //     aiComponent.timeSinceLastSightCheck += dt;
        // }


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
                //do nothing anymore (despawn?)
                break;
        }
        aiComponent.timeSinceChangedState += dt;

    }

    //rotate array
    rotateLeft(arr) {
        arr.push(arr.shift());
    }

    
    canEnemySeeTarget(ec, target, sightDistance = 10, fovDegrees = 90) {
        const targetPos = target.position.clone();
        targetPos.y += Shared.playerHeight / 2;//TOIMPROVE
        const enemyEyes = ec.root.position.clone();
        enemyEyes.y += (ec.capsuleTotalHeight * 0.9);
    
    
        // 1️⃣ Early exit: too far
        const dist = targetPos.distanceTo(enemyEyes);
        if (dist > sightDistance) return false;
    
        // 2️⃣ Check FOV
        const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(ec.root.quaternion);
        const toTarget = targetPos.clone().sub(enemyEyes).normalize();
        const angle = enemyForward.angleTo(toTarget); // radians
        if (
            (ec.enemyState === Shared.ENEMY_STATES.IDLE) ||
            (ec.enemyState === Shared.ENEMY_STATES.PATROL)
        ) //when in chase/search mode enemy can see from all angles (otherwise too easy to run in the back of enemies)
        {
            if (angle > THREE.MathUtils.degToRad(fovDegrees / 2)) return false; // outside FOV
    
        }
        // 3️⃣ Collect raycastable objects
        const raycastTargets = [];
        Shared.actionnablesGroup.traverse(child => { if (child.isMesh) raycastTargets.push(child); });
        Shared.staticGroup.traverse(child => { if (child.isMesh) raycastTargets.push(child); });
        //TODO: can an enemy hides an other?
        // Shared.enemyGroup.traverse(child => { if (child.isMesh && !ec.root.contains(child)) raycastTargets.push(child); });
        Shared.rigGroup.traverse(child => { if (child.isMesh || child.isSkinnedMesh) raycastTargets.push(child); });
        const visibleTargets = raycastTargets.filter(obj => obj.visible);
    
        // 4️⃣ Raycast from enemy to target
        // Setup ray from enemy to target
        const origin = enemyEyes;
        const direction = targetPos.clone().sub(origin).normalize();
    
        raycaster.set(origin, direction);
    
        const intersects = raycaster.intersectObjects(visibleTargets, true); // recursive
    
        if (intersects.length === 0) return false;
    
        // 5️⃣ Check if first hit is the target or its descendant    
        // Check if the first hit is target or a descendant of target
        let hitObj = intersects[0].object;
        console.log("ENEMY" + ec.name + "sees " + hitObj.name);
        while (hitObj) {
            if (hitObj === target) {
    
                // Ray start & end
                const start = origin.clone();
                const end = origin.clone().add(direction.clone().multiplyScalar(100)); // Extend ray visually
    
                // Update line geometry
                Shared.debugLine.geometry.setFromPoints([start, end]);
    
                // Toggle visibility
                Shared.debugLine.visible = true;
    
                return true;
            }
            // Stop if we've reached a Group or the Scene
            if (hitObj.type === 'Group' || hitObj.type === 'Scene') break;
            hitObj = hitObj.parent;
        }
    
        return false;
    }
    


}