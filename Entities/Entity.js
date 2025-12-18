// @ts-nocheck


export const ENTITY_COMPONENT_TAGS = {
    AI: 'AI',
    ANIMATOR: 'Animator',
    GAMEPLAY: 'Gameplay',
    INTERACTABLE: 'Interactable',
    PATHFINDING: 'PathFinding',
    COLLISION: 'Collision',
    PLAYERCONTROL: 'PlayerControl',
    TRANSFORM: 'Transform',
    VISUAL: 'Visual',
    WEAPON: 'Weapon',
    INVENTORY: 'Inventory',
}

export default class Entity {
    constructor(name) {
        this.name = name;
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
    get collision() { return this.get(ENTITY_COMPONENT_TAGS.COLLISION); }
    get playerCtrl() { return this.get(ENTITY_COMPONENT_TAGS.PLAYERCONTROL); }
    get transform() { return this.get(ENTITY_COMPONENT_TAGS.TRANSFORM); }
    get visual() { return this.get(ENTITY_COMPONENT_TAGS.VISUAL); }
    get weapon() { return this.get(ENTITY_COMPONENT_TAGS.WEAPON); }
    get inventory() { return this.get(ENTITY_COMPONENT_TAGS.INVENTORY); }
}
