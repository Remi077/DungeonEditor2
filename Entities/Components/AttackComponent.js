import { ECT } from '../Entity.js';

// Attack component related stuff

export default class AttackComponent {
    constructor() {
        this.type = ECT.ATTACK;

        //attack properties
        this.isAttacking = false;
        this.timeSinceStartAttack = null;
        this.attackDamageStart = 0;
        this.attackDamageEnd = null;

    }
}

