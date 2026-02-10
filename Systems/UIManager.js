import { ECT } from '../Entities/Entity.js';
import Stats from "stats.js";

export default class UIManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.itemAtlas = null;

        this.styleTag = null;
        this.crosshair = null;
        this.healthContainer = null;
        this.healthBar = null;
        this.hotbar = null;
        this.inventoryContainer = null;

        //stats
        this.fpsPanel = new Stats();//extra fps panel
        this.fpsPanel.showPanel(0);//fps

        //substate: inventory open
        this.uiState = {
            isInventoryOpen : false,
            isPointerLocked : true,
            isDialogActive : false,
        }
    }

    showGameUI(){
        // ---------------------------
        // Inject CSS for this state
        // ---------------------------
        this.styleTag = document.createElement('style');
        this.styleTag.textContent = `
            #crosshair {
                position: absolute;
                color: white;
                font-size: 24px;
                pointer-events: none;
                z-index: 10;
                display: block;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }

            #health-container {
                position: fixed;
                top: 20px;
                left: 20px;
                width: 200px;
                height: 20px;
                background: #300;
                border: 2px solid #900;
                border-radius: 4px;
            }

            #health-bar {
                width: 100%;
                height: 100%;
                background: #0f0;
                transition: width 0.2s ease-out;
            }

            #hotbar {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 12px;
                padding: 10px 16px;
                background: rgba(0, 0, 0, 0.45);
                border-radius: 10px;
                backdrop-filter: blur(4px);
            }

            .slot {
                width: 64px;
                height: 64px;
                background: rgba(255,255,255,0.15);
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                position: relative;
            }

            .slot.selected {
                border: 2px solid white;
                box-shadow: 0 0 8px white;
            }

            #inventory-grid-container {
                position: absolute;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px;
                background: rgba(0,0,0,0.7);
                border-radius: 10px;
                display: none;
                z-index: 100;
            }

            #inventory-grid {
                display: grid;
                grid-template-columns: repeat(8, 64px);
                grid-template-rows: repeat(4, 64px);
                gap: 8px;
            }

            .inv-slot {
                width: 64px;
                height: 64px;
                background: rgba(255,255,255,0.1);
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                position: relative;
                cursor: pointer;
            }

            .inv-slot .icon {
                width: 100%;
                height: 100%;
                background-image: url("./assets/textures/items.png");
                background-size: 128px 128px;
                background-repeat: no-repeat;
                background-position -9999px -9999px;
            }

            .inv-slot .count {
                position: absolute;
                bottom: 4px;
                right: 6px;
                font-size: 16px;
                color: white;
                text-shadow: 0 0 4px black;
            }
        `;
        document.head.appendChild(this.styleTag);

        // -------------------------
        // Locate canvas-container
        // -------------------------
        const canvasContainer = this.game.canvasContainer;

        // =========== CROSSHAIR ===========
        this.crosshair = document.createElement('div');
        this.crosshair.id = 'crosshair';
        this.crosshair.textContent = '+';
        canvasContainer.appendChild(this.crosshair);

        // =========== HEALTH BAR ===========
        this.healthContainer = document.createElement('div');
        this.healthContainer.id = 'health-container';

        this.healthBar = document.createElement('div');
        this.healthBar.id = 'health-bar';
        this.healthContainer.appendChild(this.healthBar);

        canvasContainer.appendChild(this.healthContainer);

        // =========== HOTBAR ===========
        this.hotbar = document.createElement('div');
        this.hotbar.id = 'hotbar';
        for (let i = 0; i < 7; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.index = i;
            this.hotbar.appendChild(slot);
        }
        canvasContainer.appendChild(this.hotbar);

        // =========== INVENTORY GRID ===========
        this.inventoryContainer = document.createElement('div');
        this.inventoryContainer.id = 'inventory-grid-container';

        const grid = document.createElement('div');
        grid.id = 'inventory-grid';

        for (let i = 0; i < 32; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';

            const icon = document.createElement('div');
            icon.className = 'icon';

            // slot.appendChild(icon);
            grid.appendChild(slot);
        }

        this.inventoryContainer.appendChild(grid);
        canvasContainer.appendChild(this.inventoryContainer);

        // --- extra FPS Panel ---
        this.fpsPanel = new Stats();//extra fps panel
        this.fpsPanel.showPanel(0);//fps
        const fpsPanel = this.fpsPanel;
        Object.assign(fpsPanel.dom.style, {
            position: 'absolute',
            top: '100px',
            left: 'auto',
            right: '100px',
            margin: '0',
            transform: 'scale(2)',
            transformOrigin: 'top right'
        });
        this.game.mainContainer.appendChild(fpsPanel.dom);
    }

    hideGameUI() {
        if (this.crosshair) this.crosshair.remove();
        if (this.healthContainer) this.healthContainer.remove();
        if (this.hotbar) this.hotbar.remove();
        if (this.inventoryContainer) this.inventoryContainer.remove();
        if (this.fpsPanel && this.fpsPanel.dom && this.fpsPanel.dom.parentNode) {
            this.fpsPanel.dom.parentNode.removeChild(this.fpsPanel.dom);
        }
        // Optionally null out the reference
        this.fpsPanel = null;

        if (this.styleTag) {
            this.styleTag.remove();
            this.styleTag = null;
        }
    }

    async loadItems() {
        try {
            this.itemAtlas = await (await fetch('./assets/textures/items.json')).json();
        } catch (err) {
            console.error("Failed to load items:", err);
        }
    }

    updateHP(e) {
        const isPlayer = e.playerCtrl;
        const gp = e.gameplay;
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

    update(dt, actions) {
        for (const e of this.world.query(ECT.GAMEPLAY)) {
            this.updateHP(e);
        }
        for (const e of this.world.query(ECT.INVENTORY)) {
            this.updateInventory(e);
        }

        if (!actions) return;
        if (actions.toggleInventory) this.toggleInventory();
    }

    toggleInventory(){
        this.uiState.isInventoryOpen = !this.uiState.isInventoryOpen;

        const inventoryContainer = document.getElementById("inventory-grid-container");
        inventoryContainer.style.display = this.uiState.isInventoryOpen ? "block" : "none";
        
        if (this.uiState.isInventoryOpen) {
            document.exitPointerLock?.();
        } else {
            this.game.canvas.requestPointerLock?.(); // request lock on canvas
        }
    }

    updateInventory(e) {
        const inventory = e.inventory;
        if (!inventory) return;
        const inventoryObj = inventory?.inventory
        if (!inventory?.needsUpdate) return;
        inventory.needsUpdate = false;

        // Convert object to array of [itemId, data] pairs
        // const inventoryEntries = Object.entries(inventoryObj);

        // // Take first 7 items for hotbar
        // const hotbarItems = inventoryEntries.slice(0, 7);

        const hotbarItems = inventory.hotbar;

        this.updateHotbarUI(e, hotbarItems);

        // this.highlightSelectedSlot(inventoryObj.selectedSlot);
    }

    updateHotbarUI(e, hotbarItems) {
        const inventory = e.inventory;
        const hotbar = document.getElementById("hotbar");

        for (let i = 0; i < hotbarItems.length; i++) {
            const uiSlot = hotbar.children[i];
            const item = inventory.hotbar[i];

            if (!item) {
                uiSlot.style.backgroundImage = "none";
                uiSlot.innerHTML = "";
                continue;
            }

            this.setSlotIcon(uiSlot, item.itemId, item.count);
            uiSlot.classList.toggle("selected", i === inventory.selectedSlot);
        }
    }

    // highlightSelectedSlot(selectedIndex) {
    //     const hotbar = document.getElementById("hotbar");

    //     for (let i = 0; i < 7; i++) {   
    //         hotbar.children[i].classList.toggle("selected", i === (selectedIndex-1));
    //         // hotbar.children[i].classList.toggle("selected", i === selectedIndex);
    //     }
    // }

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

}