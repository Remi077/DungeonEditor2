import * as THREE from 'three';
import { ECT } from '../Entities/Entity.js';
import AnimatorComponent from '../Entities/Components/AnimatorComponent.js';
import * as Constants from '../Constants.js';

export default class AnimatorManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        // this.entities = new Set();  // or let ECS register automatically
        this.targetPos = new THREE.Vector3();
        this.targetQuat = new THREE.Quaternion();
        this.forward = new THREE.Vector3(0, 0, 1);
    }

    //animator component factory
    createAnimatorComponent(skeleton, mixer, clips) {
        const anim = new AnimatorComponent(skeleton,mixer);
        clips.forEach((clip, name) => {
            anim.animationClips.set(name, clip);
            const action = mixer.clipAction(clip);
            anim.animationActions.set(name, 
                {
                    action: action,
                    isFadingOut: false,
                }
            );
        });
        if (skeleton)
            anim.headBone = skeleton.getBoneByName(Constants.HEAD_BONE_NAME); //TODO: put in constant
        return anim;
    }

    update(dt) {
        for (const e of this.world.query(ECT.ANIMATOR)) {
            const anim = e.animator;
            anim.mixer.update(dt);

            //update animation
            const desiredAnimations = e.animator?.desiredAnimation;
            if (desiredAnimations) desiredAnimations.forEach((options, clipName) => this.play(e, clipName, options));
            
            desiredAnimations.clear();

            //update head rotation
            if (anim.headTarget)
                this.updateHeadTarget(e)
        }
    }


    //options available
    //play
    //stop
    //fadeIn
    //fadeOut
    //callback
    //reverse
    //loop
    //clampWhenFinished

    play(e, clipName, options) {

        const play = options?.play;
        const stop = options?.stop;
        
        //nor play nor stop nothing to do
        if (!play && !stop) 
            console.warn("play and stop are both unset for entity", e.name, " and clipName", clipName);

        const anim = e.animator;
        if (!clipName) clipName = anim.animationActions.keys().next().value; //defaults to first action

        const actionOb = anim.animationActions.get(clipName);
        if (!actionOb) console.warn("Animation not found:", clipName);
        if (!actionOb) return;

        const action = actionOb.action;
        const isFadingOut = actionOb.isFadingOut;

        if (
            (play  && action.isRunning() ) || //already running (force replay if reset)
            (stop  && (!action.isRunning() || isFadingOut))    //already stopped or fading out
        ) return;

        if (play) {

            const clampWhenFinished = options?.clampWhenFinished; //keep last frame at the end of animation
            const reverse = options?.reverse; //play the animation backwards
            const loop = options?.loop; //if true the same animation can be repeated several times in a row, if false only one time
            const callback = options?.callback; //called at end of action

            if (reverse) {
                const clip = action.getClip();
                action.time = clip.duration;
                action.paused = false;
                action.timeScale = -1;
            } else {
                // action.paused = true;
                action.timeScale = 1;
            }

            action.clampWhenFinished = clampWhenFinished ?? false;
            if (loop) {
                action.setLoop(THREE.LoopRepeat);
                action.clampWhenFinished = false; //force-disable clamping if we loop
            } else {
                action.setLoop(THREE.LoopOnce);
            }

            if (!reverse) action.reset();//reset action only if play forward

            const fadeIn = options?.fadeIn;
            if (fadeIn)
                action.play().fadeIn(fadeIn);//fadeIn is a duration
            else
                action.play(); //play action
            actionOb.isFadingOut = false;

            const mixer = action.getMixer()
            const onFinished = (e) => {
                if (e.action !== action) return;
                mixer.removeEventListener("finished", onFinished);
                callback?.();
            };
            mixer.addEventListener("finished", onFinished);

        } else if (stop) {
            const fadeOut = options?.fadeOut;

            if (fadeOut) {
                action.fadeOut(fadeOut);
                actionOb.isFadingOut = true;

                setTimeout(() => {
                action.stop();
                // action.enabled = false;
                // action.setEffectiveWeight(0);
                }, fadeOut * 1000);
            } else {
                action.stop();
            }
        }

    }

    updateHeadTarget(e) {
        const anim = e.animator;
        const headTarget = anim.headTarget;
        this.makeRigLookAt(e, headTarget);
    }

    makeRigLookAt(e, target) {
        const ac = e.animator;
        const headBone = ac?.headBone;
        if (!headBone || !target) return;

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
        this.targetQuat.setFromUnitVectors(this.forward, dir);

        // Smooth head motion
        headBone.quaternion.slerp(this.targetQuat, 0.7);
        // headBone.quaternion.slerp(this.targetQuat, 0.1);

        // If you don’t want Exorcist-like twists:
        let c = 0.7;
        headBone.rotation.x = THREE.MathUtils.clamp(headBone.rotation.x, -c, c);
        headBone.rotation.z = THREE.MathUtils.clamp(headBone.rotation.z, -c, c);

    }

}
