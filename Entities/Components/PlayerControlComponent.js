import { ECT } from '../Entity.js';

// component hold by the player entity
// contains player only properties

export default class PlayerControlComponent {
    constructor(input = null) {
        this.type = ECT.PLAYERCONTROL;

        //relative positioning of the camera vs the player
        this.offsetRootToCamera = null;
    }
}
