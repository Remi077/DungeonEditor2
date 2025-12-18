
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

// holds entity collision related properties  

export default class CollisionsBodyComponent {
    constructor(body = null, collider = null, bodyDesc = null, colliderDesc = null) {
        this.type = ENTITY_COMPONENT_TAGS.COLLISION;

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
        this.toremove = false; 
    }

}
