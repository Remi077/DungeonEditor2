import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

// holds all stuff related to player inventory

export default class InventoryComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.INVENTORY;

        //inventory object
        this.inventory = {};

        //UI related
        this.hotbar = [null, null, null, null, null, null, null];
        this.inventorySlots = Array(4*8).fill(null);
        this.needsUpdate = false;
    }
}
