
export default class PhysicsBodyComponent {
    constructor(body = null, collider = null, bodyDesc = null, colliderDesc = null) {
        this.type = 'Physics';
        this.body = body;
        this.collider = collider;
        this.bodyDesc = bodyDesc;
        this.colliderDesc = colliderDesc;
        this.kcc = null;
        this.offsetRootToBody = null;
        this.jumpPressed = false;
        this.isTouchingGround = false;
        this.isTouchingCeiling = false;
        this.isInWater = false;
        this.isAtSurface = false;
        this.capsuleRadius = null;
        this.capsuleTotalHeight = null;
        this.capsuleCylinderHalfHeight = null;
        this.collisionGroup = null;
    }
}
