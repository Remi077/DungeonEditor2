// @ts-nocheck
import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entities/Entity.js';

export default class AnimatorManager {
    constructor() {
        // this.entities = new Set();  // or let ECS register automatically
        this.targetPos = new THREE.Vector3();
        this.targetQuat = new THREE.Quaternion()        
    }

    update(dt, entity) {
            const anim = entity.animator;
            if (!anim || !anim.mixer) return;
            
            anim.mixer.update(dt);
    }

    play(
        entity, 
        clipName = null, 
        overlapSingle = false, //stop previous action before starting new single animation
        stopSingle = false, //if true dont keep last frame of single animation at the end
        backward = false,
        callback = null,
        repeatSingle = true
    ) {
        const anim = entity.animator;
        if (!anim) return;

        const action = clipName ? anim.animationActions.get(clipName) : 
            anim.animationActions.values().next().value; // return first value
        if (!action) {
            console.warn("Animation not found:", clipName);
            return;
        }

        if (backward) {
            const clip = action.getClip();
            action.time = clip.duration;
            action.paused = false;
            action.timeScale = -1;
        } else {
            // action.paused = true;
            action.timeScale = 1;
        }

        // SPECIAL CASE: Attack or any non-looping animation
        if (action.loop === THREE.LoopOnce) {
            
            //no new single action? abort
            if (anim.singlecurrentAction === action) return;
            anim.singlecurrentAction = action; //set single action
            // Stop previous non-single action and clear it
            if (anim.currentAction && !overlapSingle) {
                anim.currentAction.fadeOut(0.15);
                // anim.currentAction.stop();
                anim.currentAction = null;
            }
            if (!backward) action.reset();//reset action only if play forward
            action.play(); //play action

            // Optional: event when finished
            action.getMixer().addEventListener("finished", (e) => { 
                if (e.action === action) {
                    if (stopSingle) action.stop(); //stop single action
                    if (repeatSingle) anim.singlecurrentAction = null; //clear single action
                    // optionally return to idle etc.
                    callback?.();
                }
            });

            // return;
        } else {

            // Otherwise: normal looping action
            if (anim.currentAction === action) return;
            // Stop previous action
            if (anim.currentAction) {
                anim.currentAction.fadeOut(0.15);
            }
            if (!backward)
                action.reset();
            action.fadeIn(0.15).play();
            anim.currentAction = action;

        }


    }


    stop(entity, clipName) {
        const anim = entity.animator;
        const action = anim.animationActions.get(clipName);
        if (!anim) return;
        if (!action) {
            console.warn("Animation not found:", clipName);
            return;
        }
        action.stop();
        if (anim.currentAction === action) {
            anim.currentAction = null;
        }
    }


    makeRigLookAt(entity, target) {
        const ac = entity.animator;
        const headBone = ac?.headBone;
        if (headBone) {

            // Get player position in bone parent space
            if (target.type === "Object3D")
                target.getWorldPosition(this.targetPos);
            else
                this.targetPos.copy(target);

            const parent = headBone.parent;
            const targetLocal = this.targetPos.clone();
            parent.worldToLocal(targetLocal);

            // Direction the head should look
            const dir = targetLocal.sub(headBone.position).normalize();

            // Create quaternion that turns +Z to face direction
            this.targetQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

            // Smooth head motion
            headBone.quaternion.slerp(this.targetQuat, 0.8);
            // headBone.quaternion.slerp(this.targetQuat, 0.3);
            // headBone.quaternion.copy(targetQuat);

            // If you don’t want Exorcist-like twists:
            let c = 0.7;
            headBone.rotation.x = THREE.MathUtils.clamp(headBone.rotation.x, -c, c);
            headBone.rotation.z = THREE.MathUtils.clamp(headBone.rotation.z, -c, c);

        }

    }



}
