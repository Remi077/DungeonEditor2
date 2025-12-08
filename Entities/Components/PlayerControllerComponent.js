import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class PlayerControllerComponent {
    constructor(input = null) {
        this.type = ENTITY_COMPONENT_TAGS.PLAYERCONTROLLER;
        this.input = input; // reference to InputManager
        this.isPlayer = true;
    }
}
