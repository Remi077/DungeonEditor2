// @ts-nocheck
import * as THREE from 'three';

export default class UIManager {
    constructor(game) {
        this.game = game;
        this.itemAtlas = null;
    }

    async loadItems() {
        try {
            this.itemAtlas = await (await fetch('./assets/textures/items.json')).json();
        } catch (err) {
            console.error("Failed to load items:", err);
        }
    }

    updateHP(entity) {
        const isPlayer = entity.playerCtrl;
        const gp = entity.gameplay;
        if (!gp) return;
        const healthBar = gp?.healthBar ;
        if (gp.invincibility){
            const hpPercent = (gp.health / gp.maxHealth) ;
            if (isPlayer) {
                gp.healthBar.style.width = (hpPercent * 100)+ "%";
            } else {
                if (gp.health <= 0){
                    gp.healthBar.visible = false;
                } else {
                    gp.healthBar.visible = true;
                    const fg = gp.healthBar.healthForeground
                    fg.scale.x = hpPercent;
                    fg.position.x = -(gp.healthBar.fullWidth * (1 - hpPercent)) / 2; 
                }               
            }
        }
        if (!isPlayer) {
            if (gp.timeSinceLastHit > 3)
                gp.healthBar.visible = false; //hide enemy health bar after 3s
        }
    }

    update(dt, world, actions, uiState) {
        for (const e of world.query(GAMEPLAY)) {
            this.updateHP(e);
        }
        for (const e of world.query(INVENTORY)) {
            this.updateInventory(e);
        }

        if (!action) return;
        if (actions.toggleInventory) this.toggleInventory(uiState);
        if (actions.Item1) this.highlightSelectedSlot(1);
        if (actions.Item2) this.highlightSelectedSlot(2);
        if (actions.Item3) this.highlightSelectedSlot(3);
        if (actions.Item4) this.highlightSelectedSlot(4);
        if (actions.Item5) this.highlightSelectedSlot(5);
        if (actions.Item6) this.highlightSelectedSlot(6);
        if (actions.Item7) this.highlightSelectedSlot(7);

    }

    toggleInventory(uiState){
        uiState.isInventoryOpen = !uiState.isInventoryOpen;

        const inventoryContainer = document.getElementById("inventory-grid-container");
        inventoryContainer.style.display = uiState.isInventoryOpen ? "block" : "none";
        
        if (uiState.isInventoryOpen) {
            document.exitPointerLock?.();
        } else {
            this.game.canvas.requestPointerLock?.(); // request lock on canvas
        }
    }

    updateInventory(entity) {
        const inventory = entity.inventory;
        if (!inventory) return;
        const inventoryObj = inventory?.inventory
        if (!inventory?.needsUpdate) return;
        inventory.needsUpdate = false;

        // Convert object to array of [itemId, data] pairs
        const inventoryEntries = Object.entries(inventoryObj);

        // Take first 7 items for hotbar
        const hotbarItems = inventoryEntries.slice(0, 7);

        this.updateHotbarUI(entity, hotbarItems);
    }

    updateHotbarUI(entity, hotbarItems) {
        const hotbar = document.getElementById("hotbar");

        for (let i = 0; i < 7; i++) {
            const uiSlot = hotbar.children[i];
            const entry = hotbarItems[i];

            if (!entry) {
                // Empty slot
                uiSlot.style.backgroundImage = "none";
                uiSlot.innerHTML = "";
                continue;
            }

            const [itemId, data] = entry;

            // data.count is the number of items
            this.setSlotIcon(uiSlot, itemId, data);
        }
    }

    highlightSelectedSlot(selectedIndex) {
        const hotbar = document.getElementById("hotbar");

        for (let i = 0; i < 7; i++) {   
            hotbar.children[i].classList.toggle("selected", i === (selectedIndex-1));
            // hotbar.children[i].classList.toggle("selected", i === selectedIndex);
        }
    }

    setSlotIcon(slotElement, itemName, count) {
        const data = this.itemAtlas.IMAGES[itemName];
        if (!data) {
            console.warn("No atlas entry for", itemName);
            return;
        }

        const tileSize = this.itemAtlas.SIZE; // 64

        const px = data.x * tileSize;
        const py = data.y * tileSize;

        // add the atlas image when needed
        slotElement.style.backgroundImage = 'url("./assets/textures/items.png")';
        slotElement.style.backgroundSize = "128px 128px";
        slotElement.style.backgroundPosition = `-${px}px -${py}px`;

        slotElement.innerHTML = "";

        if (count > 1) {
            const c = document.createElement("div");
            c.className = "count";
            c.textContent = count;
            slotElement.appendChild(c);
        }
    }


    // export function buildInventoryGrid(rows = 4, cols = 8) {
    //     const grid = document.getElementById("inventory-grid");
    //     grid.innerHTML = "";   // Clear existing

    //     const total = rows * cols;

    //     for (let i = 0; i < total; i++) {
    //         const slot = document.createElement("div");
    //         slot.className = "inv-slot";
    //         slot.dataset.index = i;

    //         const icon = document.createElement("div");
    //         icon.className = "icon";
    //         slot.appendChild(icon);

    //         const count = document.createElement("div");
    //         count.className = "count";
    //         slot.appendChild(count);

    //         grid.appendChild(slot);
    //     }
    // }

}