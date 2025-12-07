import * as THREE from 'three';


export default class InteractableComponent {
    constructor(interact) {
        this.type = 'Interactable';
        this.interact = interact; // function to call when interacted with
        this.open = false;
    }
}
