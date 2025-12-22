
import { ECT } from '../Entity.js';

// holds entity collision related properties  

export default class CapsuleColliderComponent {
    constructor(body = null, collider = null, bodyDesc = null, colliderDesc = null) {
        this.type = ECT.CAPSULECOLLIDER;

        //constants 

        //body/collider/kcc
        this.body = body;
        this.collider = collider;
        this.bodyDesc = bodyDesc;
        this.colliderDesc = colliderDesc;
        this.kcc = null;

        //offset root to Body
        this.offsetRootToBody = null;

        //collider info
        this.capsuleRadius = null;
        this.capsuleTotalHeight = null;
        this.capsuleCylinderHalfHeight = null;
        this.collisionGroup = null;

        //variables

        //contact variables updated by collisionManager
        this.isTouchingGround = false;
        this.isTouchingCeiling = false;
        this.isInWater = false;
        this.isAtSurface = false;

        //when set the body/collider will be removed
        this.toRemove = false; 
    }

}
