import { ECT } from '../Entity.js';

// Animation driven collider

export default class AnimColliderComponent {
    constructor() {
        this.type = ECT.ANIMCOLLIDER;

        //animated mesh target
        this.mesh = null;

        //collision
        this.body = null;
        this.collider = null; //useless here, kinematic rigidbody is sufficient, remove?
        this.colliderDesc = null; //useless here, kinematic rigidbody is sufficient, remove?

        //offset mesh <-> body
        this.offsetRootToBody = null;

        //when set the body/collider will be removed
        this.toremove = false;         
    }
}

