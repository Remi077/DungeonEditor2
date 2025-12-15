import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class InventoryComponent {
    constructor() {
        this.type = ENTITY_COMPONENT_TAGS.INVENTORY;
        this.inventory = {};
        this.hotbar = [null, null, null, null, null, null, null];
        this.inventorySlots = Array(4*8).fill(null);
        this.needsUpdate = false;
    }
}
