import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

// all weapon related stuff

export default class WeaponComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.WEAPON;

        //mesh
        this.weapon = null;

        //collision
        this.body = null;
        this.collider = null;
        this.colliderDesc = null;

        //offset mesh <-> body
        this.offsetRootToBody = null;

        //attack properties
        this.isAttacking = false;
        this.timeSinceStartAttack = null;
        this.attackDamageStart = 0;
        this.attackDamageEnd = null;

    }
}

