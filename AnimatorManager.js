// @ts-nocheck
import * as THREE from 'three';
import * as Shared from '../Shared.js';

export default class AnimatorManager {
    constructor() {
        // this.entities = new Set();  // or let ECS register automatically
    }

    // registerEntity(entity) {
    //     if (entity.get('Animator'))
    //         this.entities.add(entity);
    // }

    // unregisterEntity(entity) {
    //     this.entities.delete(entity);
    // }

    update(dt, entity) {
        // for (const entity of entities) {
            const anim = entity.components['Animator'];
            if (!anim || !anim.mixer) return;
            
            // console.log("Before update:", anim.mixer.time);
            anim.mixer.update(dt);
            // console.log("After update:", anim.mixer.time);
        // }
    }

    play(entity, clipName) {
        const anim = entity.get('Animator');
        if (!anim) return;

        const action = anim.animationActions.get(clipName);
        if (!action) {
            console.warn("Animation not found:", clipName);
            return;
        }

        // SPECIAL CASE: Attack or any non-looping animation
        if (action.loop === THREE.LoopOnce) {
            
            if (anim.singlecurrentAction === action) return;
            action.reset();
            action.play();
            anim.singlecurrentAction = action;

            // Optional: event when finished
            action.getMixer().addEventListener("finished", (e) => { 
                if (e.action === action) {
                    anim.singlecurrentAction = null;
                    // optionally return to idle etc.
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
            action.reset().fadeIn(0.15).play();
            console.log("Playing animation:", clipName);
            // action.reset().play();
            // action.play();
            anim.currentAction = action;

        }


    }


    stop(entity, clipName) {
        const anim = entity.get('Animator');
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
}
