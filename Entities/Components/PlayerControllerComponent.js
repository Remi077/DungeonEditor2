export default class PlayerControllerComponent {
    constructor(input = null) {
        this.type = 'PlayerController';
        this.input = input; // reference to InputManager
        this.isPlayer = true;
    }
}
