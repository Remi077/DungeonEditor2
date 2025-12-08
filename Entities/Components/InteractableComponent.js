import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class InteractableComponent {
    constructor(interact) {
        this.type = ENTITY_COMPONENT_TAGS.INTERACTABLE;
        this.interact = interact; // function to call when interacted with
        this.open = false;
    }
}
