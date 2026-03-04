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
        if (!e.capsuleCol.isInWater)
            this.game.yawObject.getWorldQuaternion(this.worldQuat);
        else
            this.game.pitchObject.getWorldQuaternion(this.worldQuat); //move in all directions in water
        moveVector.applyQuaternion(this.worldQuat);

        //calculate desired rotation from camera orientation
        e.transform.rotation.copy(yawObject.quaternion);

        //register jump
        if (actions.jump && 
            (
                e.capsuleCol.isTouchingGround ||
                e.capsuleCol.isAtSurface
            )
        ) 
            e.movement.jump = true;

        //update desired animation
        this.updateDesiredAnimation(e, actions);

        //other actions
        if (actions.interact) this.interact(e);
        if (actions.attack) this.attack(e);

        if (actions.useItem) this.useItem(e);

        //inventory selection
        const iv = e.inventory;
        if (iv){
            if (actions.Item1) iv.selectSlot(0);
            if (actions.Item2) iv.selectSlot(1);
            if (actions.Item3) iv.selectSlot(2);
            if (actions.Item4) iv.selectSlot(3);
            if (actions.Item5) iv.selectSlot(4);
            if (actions.Item6) iv.selectSlot(5);
            if (actions.Item7) iv.selectSlot(6);
        }


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
            anim.desiredAnimation.set(Constants.ANIM.WALK_L,{stop: true});
        }

        if (actions.attack && !e.attack.isAttacking) {
            anim.desiredAnimation.set(Constants.ANIM.ATTACK,{
                play: true,
                replay: true, //force reset since the animation is clamped
                clampWhenFinished: true,
                callback: (() => {
                    // console.log("END PLAYER ATTACK");
                    e.attack.isAttacking = false;
                }),
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

            if (selectEntity?.interactable) {
                // console.log("hit actionnable");
                const interactableComponent = selectEntity.interactable;
                interactableComponent?.interact(e);
            }

        }

    }

    attack(e) {
        const wpn = e.attack;
        if (wpn.isAttacking) return;
        wpn.isAttacking = true;
        wpn.timeSinceStartAttack = 0;
    }


    useItem(e){
        const item = e.inventory.selectedItem;
        console.log("useitem",item.itemId, item.count);
    }


}
