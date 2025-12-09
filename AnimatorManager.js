// @ts-nocheck
import * as THREE from 'three';
import * as Shared from '../Shared.js';
import { ENTITY_COMPONENT_TAGS } from './Entities/Entity.js';

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
            const anim = entity.get(ENTITY_COMPONENT_TAGS.ANIMATOR);
            if (!anim || !anim.mixer) return;
            
            // console.log("Before update:", anim.mixer.time);
            anim.mixer.update(dt);
            // console.log("After update:", anim.mixer.time);
        // }
    }

    play(entity, clipName = null, backward = false, callback = null) {
        const anim = entity.get(ENTITY_COMPONENT_TAGS.ANIMATOR);
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
            
            if (anim.singlecurrentAction === action) return;
            if (!backward)
                action.reset();
            action.play();
            anim.singlecurrentAction = action;

            // Optional: event when finished
            action.getMixer().addEventListener("finished", (e) => { 
                if (e.action === action) {
                    anim.singlecurrentAction = null;
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
            console.log("Playing animation:", clipName);
            // action.reset().play();
            // action.play();
            anim.currentAction = action;

        }


    }


    stop(entity, clipName) {
        const anim = entity.get(ENTITY_COMPONENT_TAGS.ANIMATOR);
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
