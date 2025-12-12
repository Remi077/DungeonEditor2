import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class WeaponComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.WEAPON;
        this.weapon = null;
        this.weaponBody = null;
        // this.weaponBodyDesc = null;
        this.weaponCollider = null;
        // this.weaponColliderDesc = null;
        this.weaponOffsetRootToBody = null;
        this.attackLoopId = null;
        this.isAttacking = false;
        this.timeSinceStartAttack = null;
        this.attackDamageStart = 0;
        this.attackDamageEnd = null;
    }
}

