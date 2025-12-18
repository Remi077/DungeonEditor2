import { ECT } from '../Entity.js';

// holds all stuff related to player inventory

export default class InventoryComponent {
    constructor() {
        this.type = ECT.INVENTORY;

        //inventory object
        this.inventory = {};

        //UI related
        this.hotbar = [null, null, null, null, null, null, null];
        this.inventorySlots = Array(4*8).fill(null);
        this.needsUpdate = false;
    }
}
