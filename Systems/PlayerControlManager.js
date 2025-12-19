import * as THREE from 'three';
import * as Constants from '../Constants.js';

export default class PlayerControlManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        //used in update(dt)
        this.worldQuat = new THREE.Quaternion();
    }        
    
    update(dt, actions, enableMovement) {

        const e = this.world.player;
        if (!e || !enableMovement) return;

        const moveVector = e.movement?.moveVector;
        const yawObject = this.game.yawObject;

        //calculate moveVector from inputs + camera orientation + vertical speed 
        moveVector.set(0, 0, 0);
        if (actions.moveCamLeft) moveVector.x = -1;
        if (actions.moveCamRight) moveVector.x = 1;
        if (actions.moveCamFront) moveVector.z = -1;
        if (actions.moveCamBack) moveVector.z = 1;
        moveVector.normalize();
        if (!e.collision.isInWater)
            this.game.yawObject.getWorldQuaternion(this.worldQuat);
        else
            this.game.pitchObject.getWorldQuaternion(this.worldQuat); //move in all directions in water
        moveVector.applyQuaternion(this.worldQuat);

        //calculate desired rotation from camera orientation
        e.transform.rotation.copy(yawObject.quaternion);

        //register jump
        if (actions.jump) e.movement.jump = true;

        //update desired animation
        this.updateDesiredAnimation(e, actions);

        //other actions
        if (actions.interact) this.interact(e);
        if (actions.attack) this.attack(e);

    }

    updateDesiredAnimation(e, actions){
        const anim = e.animator;
        if (!anim) return;

        if (
            actions.moveCamLeft ||
            actions.moveCamRight ||
            actions.moveCamFront ||
            actions.moveCamBack
        ) {
            anim.desiredAnimation.set(Constants.ANIM.WALK_L,{
                play: true,
                loop: true,
            })
        } else {
            anim.desiredAnimation.set(Constants.ANIM.WALK_L,{play: false});
        }

        if (actions.attack && !e.weapon.isAttacking) {
            console.log("ATTACK1")
            anim.desiredAnimation.set(Constants.ANIM.ATTACK,{
                play: true,
                replay: true, //force reset since the animation is clamped
                clampWhenFinished: true,
                callback: (() => {
                    // console.log("END PLAYER ATTACK");
                    e.weapon.isAttacking = false;
                }),
            })
        } else if (!e.weapon.isAttacking) {
            console.log("ATTACK2")
            anim.desiredAnimation.set(Constants.ANIM.ATTACK,{
                play: true,
                clampWhenFinished: true,
            })
        }

    }
    
    interact(e){
        // console.log("interact");
        //perform raycast from camera center
        //if object hit is interactable, call its interact function component
        //raycast
        this.raycastActionnables(e); //raycast against actionnable objects
    }


    raycastActionnables(e) {
        const raycaster = this.game.raycaster;
        const screenCenter = this.game.screenCenter;
        const camera = this.game.camera;
        const levelFactory = this.game.systems.levelFactory;

        //TODO: optimize with octree or BVH tree
        const visibleTargets = levelFactory.getRaycastTargets(true, true); //static and actionnables
        raycaster.setFromCamera(screenCenter, camera);
        let doesIntersect = false;
        const hits = raycaster.intersectObjects(visibleTargets, true);//true means recursive raycast, it parses children too

        let closestHit = null;

        for (const hit of hits) {
            if (!closestHit || hit.distance < closestHit.distance) {
                closestHit = hit;
            }
        }

        if (closestHit && closestHit.distance < 3) {
            doesIntersect = true;
        }

        if (doesIntersect) {

            // console.log("HIT", closestHit.object.name);
            const selectEntity = closestHit.object?.userData?.[Constants.USER_DATA_FIELDS.INTERACT_ENTITY];

            if (selectEntity.interactable) {
                // console.log("hit actionnable");
                const interactableComponent = selectEntity.interactable;
                interactableComponent?.interact(e);
            }

        }

    }

    attack(e) {
        const wpn = e.weapon;
        if (wpn.isAttacking) return;
        wpn.isAttacking = true;
        wpn.timeSinceStartAttack = 0;
    }


}
