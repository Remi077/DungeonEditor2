import * as THREE from 'three';
import * as Debug from '../Debug.js';

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

    update(dt, world) {

       for (const e of world.query(AI)) {

        //components
        const ai = e.ai;
        const gp = e.gameplay;
        const mv = e.movement;

        //references
        const player = this.world.player;
        const moveVector = mv.moveVector;
        const pf = this.pathFindingManager;

        //variables
        let targetPos = null;
        let inReach = false;

        //check if enemy sees player (dont do this every frame)
        if (ai.timeSinceLastSightCheck > 0.3) {
            ai.timeSinceLastSightCheck = 0;
            const {playerSeen, lastSeenPlayerPosition} = this.canEnemySeeTarget(entity, player);
            ai.playerSeen = playerSeen;
            if (ai.playerSeen) {
                ai.lastSeenPlayerPosition = lastSeenPlayerPosition;
                // console.log("PLAYER DETECTED at", ai.lastSeenPlayerPosition);
                ai.timeSinceLastSeen = 0;
            }
        } else {
            ai.timeSinceLastSightCheck += dt;
        }

        //is enemy alive
        if (gp.health <= 0) ai.enemyState = ENEMY_STATES.DIE;
        else if (gp.isHurt) ai.enemyState = ENEMY_STATES.HURT;
        if (gp.isHurt) ai.timeSinceChangedState = 0;
        gp.isHurt = false;

        // enemy state machine

        switch (ai.enemyState) {

            case ENEMY_STATES.IDLE:
                //stay still
                moveVector.set(0, 0, 0);
                //if detects player go to chase
                if (ai.playerSeen) {
                    ai.enemyState = ENEMY_STATES.CHASE;
                }
                //else after a certain time, patrol
                else if (ai.timeSinceChangedState > 5) {
                    ai.timeSinceChangedState = 0;
                    if (ai.patrolPath.length > 0)
                        ai.enemyState = ENEMY_STATES.PATROL;
                        // ;
                }
                break;

            case ENEMY_STATES.PATROL:
                //go along patrol path
                targetPos = ai.patrolPath[0].clone();
                inReach = pf.moveEntityToWithin(entity, targetPos, 1, dt);
                if (inReach)
                    this.rotateLeft(ai.patrolPath)
                //if detects player go to chase
                if (ai.playerSeen) {
                    ai.enemyState = ENEMY_STATES.CHASE;
                }
                //else after a certain time, idle
                else if (ai.timeSinceChangedState > 10) {//TODO: we could store in ec a random walk time (same for idle)
                    ai.timeSinceChangedState = 0;
                    ai.enemyState = ENEMY_STATES.IDLE;
                }
                break;

            case ENEMY_STATES.CHASE:
                //chase player and attack if within reach
                targetPos = this.game.yawObject.position.clone();
                inReach = pf.moveEntityToWithin(entity, targetPos, ai.enemyAttackDistance, dt);
                if (inReach && !gp.invincibility) //enemy cannot attack if it just got hurt (invincible)
                    ai.enemyState = ENEMY_STATES.ATTACK;
                //if line of sight breaks for a certain time, search
                if (!ai.playerSeen) {
                    console.log("timeSinceLastSeen", ai.timeSinceLastSeen)
                    ai.timeSinceLastSeen += dt;
                    if (ai.timeSinceLastSeen > 1) {
                        console.log("SEARCH");
                        ai.enemyState = ENEMY_STATES.SEARCH;
                        if (1) Debug.drawDebugSpheres(
                            [ai.lastSeenPlayerPosition],
                            ai.debugSpheres,
                            this.game.scene,
                            Debug.debugSphereMaterialBlue
                        );
                    }
                }
                break;

            case ENEMY_STATES.ATTACK:
                //moveVector.set(0,0,0);
                targetPos = this.game.yawObject.position.clone();
                inReach = pf.moveEntityToWithin(entity, targetPos, ai.enemyAttackDistance, dt);
                const wpn = entity.weapon;
                if (!wpn.isAttacking || ai.animationFinished) {
                    console.log("ATTACK")
                    wpn.isAttacking = true;
                    wpn.timeSinceStartAttack = 0;
                    ai.animationFinished = false;
                }
                if (!inReach){
                    console.log("OUTOFREACH")
                    wpn.isAttacking = false;
                    ai.animationFinished = false;
                    ai.enemyState = ENEMY_STATES.CHASE;
                }
                break;

            case ENEMY_STATES.HURT:
                moveVector.set(0,0,0);
                if (gp.timeSinceLastHit > 1) {
                    ai.timeSinceChangedState = 0;
                    ai.enemyState = ENEMY_STATES.CHASE;
                }
                break;

            case ENEMY_STATES.SEARCH:
                //go to last place where player was seen
                //TODO: project lastSeenPlayerPosition on navmesh to be sure enemy cannot get stuck
                targetPos = ai.lastSeenPlayerPosition.clone();
                inReach = pf.moveEntityToWithin(entity, targetPos, 1, dt);
                //if detects player go to chase
                if (ai.playerSeen) {
                    ai.enemyState = ENEMY_STATES.CHASE;
                }
                //else go to idle 
                else if (inReach) {
                    ai.enemyState = ENEMY_STATES.IDLE;
                    ai.timeSinceChangedState = 0;
                }
                break;

            case ENEMY_STATES.DEATH:
                gp.invincibility = true;
                moveVector.set(0,0,0);
                //do nothing anymore (despawn?)
                break;
        }

        ai.timeSinceChangedState += dt;

        this.updateDesiredAnimation(e, world);
        this.updateHeadTarget(e);
    
       }
    }

    //rotate array
    rotateLeft(arr) {
        arr.push(arr.shift());
    }

    canEnemySeeTarget(entity, targetEntity, sightDistance = 10, fovDegrees = 90) {

        //get target middle body and entity eye positions
        const targetPos = targetEntity.transform.position;
        const tr = entity.transform;
        const col = entity.collision;

        //eyes
        const eyes = tr.position;
        eyes.y += ((col.capsuleTotalHeight/2) * 0.9);
    
    
        // 1️⃣ Early exit: too far
        const dist = targetPos.distanceTo(enemyEyes);
        if (dist > sightDistance) return false;
    
        // 2️⃣ Check FOV
        const enemyRotation = tr.rotation;
        const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemyRotation);
        const toTarget = targetPos.clone().sub(enemyEyes).normalize();
        const angle = enemyForward.angleTo(toTarget); // radians
        const ai = entity.ai;
        if (
            (ai.enemyState === ENEMY_STATES.IDLE) ||
            (ai.enemyState === ENEMY_STATES.PATROL)
        ) //when in chase/search mode enemy can see from all angles (otherwise too easy to run in the back of enemies)
        {
            if (angle > THREE.MathUtils.degToRad(fovDegrees / 2)) return false; // outside FOV
        }
        
        // 3️⃣ Collect raycastable objects
        const visibleTargets = this.game.systems.levelFactory.getRaycastTargets(true, true, true);//static, actionnables and characters
        const targetMesh = targetEntity.visual.root;
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

    updateDesiredAnimation(e, world){
        const an = e.animator;
        if (!an) return;
        const ai = e.ai;

        switch (ai.enemyState) {

            case ENEMY_STATES.IDLE:    
                an.desiredAnimation.set(Constants.ANIM.IDLE,{play:true});
            break;

            case ENEMY_STATES.PATROL :
            case ENEMY_STATES.CHASE : 
            case ENEMY_STATES.SEARCH:
                an.desiredAnimation.set(Constants.ANIM.WALK,{play:true});
                break;

            case ENEMY_STATES.ATTACK:  
                an.desiredAnimation.set(Constants.ANIM.ATTACK,{play:true,
                    callback: (() => {
                        ai.animationFinished = true;
                    }),
                });
                break;

            case ENEMY_STATES.HURT:    
                an.desiredAnimation.set(Constants.ANIM.HURT,{play:true,
                    repeat: true,
                    callback: (() => {
                        ai.animationFinished = true;
                    }),
                });
                break;

            case ENEMY_STATES.DEATH:
                // an.stop(e, Constants.ANIM.ATTACK);
                an.desiredAnimation.set(Constants.ANIM.DIE,{play:true,
                    callback: (() => {
                        this.disableEntity(e, world); //TOFIX
                    }),
                });                
                break;
        }
    }

    updateHeadTarget(e){
        const an = e.animator;
        if (!an) return;
        const ai = e.ai;
        switch (ai.enemyState) {
            case ENEMY_STATES.PATROL:
                an.headTarget = ai.patrolPath[0];
                break;
            case ENEMY_STATES.CHASE:
                an.headTarget = this.game.yawObject;
                break;
            case ENEMY_STATES.SEARCH:
                an.headTarget = ai.lastSeenPlayerPosition;
                break;
        }
    }


    disableEntity(e, world) {
        const col = e.collision;
        if (col) col.toremove = true; //schedule body/collider to be removed
        world.setActive(e, false); //remove entity from world queries
    }


}