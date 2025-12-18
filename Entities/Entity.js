export const ECT = {
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
    MOVEMENT: 'Movement',
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
    get ai() { return this.get(ECT.AI); }
    get animator() { return this.get(ECT.ANIMATOR); }
    get gameplay() { return this.get(ECT.GAMEPLAY); }
    get interactable() { return this.get(ECT.INTERACTABLE); }
    get pathfinding() { return this.get(ECT.PATHFINDING); }
    get collision() { return this.get(ECT.COLLISION); }
    get playerCtrl() { return this.get(ECT.PLAYERCONTROL); }
    get transform() { return this.get(ECT.TRANSFORM); }
    get movement() { return this.get(ECT.MOVEMENT); }
    get visual() { return this.get(ECT.VISUAL); }
    get weapon() { return this.get(ECT.WEAPON); }
    get inventory() { return this.get(ECT.INVENTORY); }
}
