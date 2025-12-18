import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

// holds all entity interactable related properties

export default class InteractableComponent {
    constructor(interact, open = false, dependentEntities = []) {
        this.type = ENTITY_COMPONENT_TAGS.INTERACTABLE;
        this.interact = interact; // function to call when interacted with
        this.open = open;
        this.dependentEntities = dependentEntities; // entities that depend on this interactable (e.g., doors linked to a switch)
    }
}
