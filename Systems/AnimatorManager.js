// @ts-nocheck
import * as THREE from 'three';

export default class AnimatorManager {
    constructor() {
        // this.entities = new Set();  // or let ECS register automatically
        this.targetPos = new THREE.Vector3();
        this.targetQuat = new THREE.Quaternion();
    }

    update(dt, world) {
       for (const e of world.query(ANIMATOR)) {
            const anim = e.animator;
            anim.mixer.update(dt);

            //update animation
            const desiredAnimations = e.animator?.desiredAnimation;
            if (desiredAnimations) desiredAnimations.foreach((clipname,options)=>this.play(e,clipname,options));

            //update head rotation
            if (!anim.headTarget)
                updateHeadTarget(e)
       }
    }

    play(e,clipName,options) {

        const anim = e.animator;

        if (!clipName) clipName =  anim.animationActions.keys().next().value; //defaults to first action
        const play = options?.play;

        const action = anim.animationActions.get(clipName);
        if (!action) console.warn("Animation not found:", clipName);
        if (!action) return;
        if (play && action.isRunning()) return; //already running
        if (!play && !action.isRunning()) return; //already stopped

        if (play){

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

            action.play(); //play action

            const mixer = action.getMixer()
            const onFinished = (e) => {
                if (e.action !== action) return;
                mixer.removeEventListener("finished", onFinished);
                callback?.();
            };
            mixer.addEventListener("finished", onFinished);
            
        } else {
            action.stop();
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

    updateHeadTarget(e){
        const anim = e.animator;
        const headTarget = anim.headTarget;
        this.makeRigLookAt(e, headTarget);
    }

}
