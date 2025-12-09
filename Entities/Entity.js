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
}
