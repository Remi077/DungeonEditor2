
import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class CollisionsBodyComponent {
    constructor(body = null, collider = null, bodyDesc = null, colliderDesc = null) {
        this.type = ENTITY_COMPONENT_TAGS.COLLISION;
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

    //helper function to return body translation in vector3 format
    getBodyTranslation(vec = new THREE.Vector3(0,0,0)) {
        const t = this.body.translation();
        vec.set(t.x, t.y, t.z);
        return vec;
    }

    getBodyQuaternion(quat = new THREE.Quaternion()) {
        const q = this.body.rotation();
        quat.set(q.x, q.y, q.z, q.w);
        return quat;
    }

}
