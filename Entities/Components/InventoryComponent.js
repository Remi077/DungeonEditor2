import { ECT } from '../Entity.js';

export class InventoryItem {
    constructor(itemId, count = 1) {
        this.itemId = itemId;
        this.count = count;
    }
}

//TODO: create an inventorymanager so this component only holds data and not logic?

export default class InventoryComponent {
    constructor() {
        this.type = ECT.INVENTORY;

        // Fixed slot layout
        this.hotbarSize = 7;
        this.inventorySize = 32;

        this.hotbar = Array(this.hotbarSize).fill(null);
        this.inventory = Array(this.inventorySize).fill(null);

        this.selectedSlot = 0;
        this.needsUpdate = true;
    }

    addItem(itemId, count = 1) {
        // 1 Try stacking (hotbar first, then inventory)
        for (const slot of this.hotbar) {
            if (slot?.itemId === itemId) {
                slot.count += count;
                this.needsUpdate = true;
                return true;
            }
        }

        for (const slot of this.inventory) {
            if (slot?.itemId === itemId) {
                slot.count += count;
                this.needsUpdate = true;
                return true;
            }
        }

        // 2 Try empty hotbar slot
        const emptyHotbarSlot = this.hotbar.findIndex(s => s === null);
        if (emptyHotbarSlot !== -1) {
            this.hotbar[emptyHotbarSlot] =
                new InventoryItem(itemId, count);
            this.needsUpdate = true;
            return true;
        }

        // 3 Spill into inventory
        const emptyInventorySlot = this.inventory.findIndex(s => s === null);
        if (emptyInventorySlot !== -1) {
            this.inventory[emptyInventorySlot] =
                new InventoryItem(itemId, count);
            this.needsUpdate = true;
            return true;
        }

        // 4 Inventory full
        return false;
    }

    selectSlot(index) {
        this.selectedSlot = index;
        this.needsUpdate = true;
    }

    get selectedItem() {
        return this.hotbar[this.selectedSlot];
    }
}
