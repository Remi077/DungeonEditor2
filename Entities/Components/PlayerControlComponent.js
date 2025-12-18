import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class PlayerControlComponent {
    constructor(input = null) {
        this.type = ENTITY_COMPONENT_TAGS.PLAYERCONTROL;
        this.input = input; // reference to InputManager
        this.isPlayer = true;
    }
}
