// @ts-nocheck

export const ENTITY_TYPES = {
    PLAYER : 'Player',
    CHARACTER : 'Character',
    ACTIONNABLE : 'Actionnable',
}

export const ENTITY_COMPONENT_TAGS = {
    AI: 'AI',
    ANIMATOR: 'Animator',
    GAMEPLAY: 'Gameplay',
    INTERACTABLE: 'Interactable',
    PATHFINDING: 'PathFinding',
    PHYSICS: 'Physics',
    PLAYERCONTROLLER: 'PlayerController',
    TRANSFORM: 'Transform',
    VISUAL: 'Visual',
    WEAPON: 'Weapon',
}

export default class Entity {
    constructor(name, type) {
        this.name = name;
        this.type = type;
        this.components = {};
    }
    addComponent(component) {
        this.components[component.type] = component;
        component.entity = this;
    }
    get(type) { return this.components[type]; }

    //helper functions
    get ai() { return this.get(ENTITY_COMPONENT_TAGS.AI); }
    get animator() { return this.get(ENTITY_COMPONENT_TAGS.ANIMATOR); }
    get gameplay() { return this.get(ENTITY_COMPONENT_TAGS.GAMEPLAY); }
    get interactable() { return this.get(ENTITY_COMPONENT_TAGS.INTERACTABLE); }
    get pathfinding() { return this.get(ENTITY_COMPONENT_TAGS.PATHFINDING); }
    get physics() { return this.get(ENTITY_COMPONENT_TAGS.PHYSICS); }
    get playerController() { return this.get(ENTITY_COMPONENT_TAGS.PLAYERCONTROLLER); }
    get transform() { return this.get(ENTITY_COMPONENT_TAGS.TRANSFORM); }
    get visual() { return this.get(ENTITY_COMPONENT_TAGS.VISUAL); }
    get weapon() { return this.get(ENTITY_COMPONENT_TAGS.WEAPON); }
}
