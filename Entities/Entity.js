export const ECT = {
    AI: 'AI',
    ANIMATOR: 'Animator',
    ANIMCOLLIDER: 'AnimCollider',
    ATTACK: 'Attack',
    CAPSULECOLLIDER: 'CapsuleCollider',
    DIALOG: 'Dialog',
    GAMEPLAY: 'Gameplay',
    INTERACTABLE: 'Interactable',
    PATHFINDING: 'PathFinding',
    PLAYERCONTROL: 'PlayerControl',
    TRANSFORM: 'Transform',
    VISUAL: 'Visual',
    INVENTORY: 'Inventory',
    MOVEMENT: 'Movement',
    UVANIM: 'UVAnim',
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
    get animCol() { return this.get(ECT.ANIMCOLLIDER); }
    get attack() { return this.get(ECT.ATTACK); }
    get dialog() { return this.get(ECT.DIALOG); }
    get gameplay() { return this.get(ECT.GAMEPLAY); }
    get interactable() { return this.get(ECT.INTERACTABLE); }
    get pathfinding() { return this.get(ECT.PATHFINDING); }
    get capsuleCol() { return this.get(ECT.CAPSULECOLLIDER); }
    get playerCtrl() { return this.get(ECT.PLAYERCONTROL); }
    get transform() { return this.get(ECT.TRANSFORM); }
    get movement() { return this.get(ECT.MOVEMENT); }
    get visual() { return this.get(ECT.VISUAL); }
    get inventory() { return this.get(ECT.INVENTORY); }
}
