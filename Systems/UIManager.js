import { ECT } from '../Entities/Entity.js';
import Stats from "stats.js";
import { configManager } from '../Infra/ConfigManager.js';

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

        // New inventory UI elements
        this.newInventoryUI = null;
        this.weaponSlot = null;
        this.coinSlot = null;
        this.vialSlot = null;
        this.keySlot = null;

        this.useNewInventoryUI = false;

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
        // Check which inventory UI style to use
        const uiConfig = configManager.get('ui');
        this.useNewInventoryUI = uiConfig?.useNewInventoryUI ?? false;

        // ---------------------------
        // Inject CSS for this state
        // ---------------------------
        this.styleTag = document.createElement('style');

        if (this.useNewInventoryUI) {
            this.styleTag.textContent = this.getNewInventoryUIStyles();
        } else {
            this.styleTag.textContent = this.getOldInventoryUIStyles();
        }

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

        // =========== OXYGEN BAR ===========
        this.oxygenContainer = document.createElement('div');
        this.oxygenContainer.id = 'oxygen-container';
        this.oxygenContainer.style.display = 'none'; // Hidden by default

        this.oxygenBar = document.createElement('div');
        this.oxygenBar.id = 'oxygen-bar';
        this.oxygenContainer.appendChild(this.oxygenBar);

        canvasContainer.appendChild(this.oxygenContainer);

        // =========== INVENTORY UI ===========
        if (this.useNewInventoryUI) {
            this.createNewInventoryUI(canvasContainer);
        } else {
            this.createOldInventoryUI(canvasContainer);
        }

        // --- extra FPS Panel ---
        this.fpsPanel = new Stats();//extra fps panel
        this.fpsPanel.showPanel(0);//fps
        const fpsPanel = this.fpsPanel;
        const isMobile = navigator.maxTouchPoints > 0;
        Object.assign(fpsPanel.dom.style, {
            position: 'absolute',
            top: '4px',
            left: 'auto',
            right: isMobile ? '4px' : '100px',
            margin: '0',
            transform: isMobile ? 'scale(1)' : 'scale(2)',
            transformOrigin: 'top right'
        });
        this.game.mainContainer.appendChild(fpsPanel.dom);
    }

    getOldInventoryUIStyles() {
        return `
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

            #oxygen-container {
                position: fixed;
                top: 46px;
                left: 20px;
                width: 200px;
                height: 20px;
                background: #003;
                border: 2px solid #009;
                border-radius: 4px;
            }

            #oxygen-bar {
                width: 100%;
                height: 100%;
                background: #0af;
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

            @media (pointer: coarse) and (max-height: 500px) {
                #hotbar { gap: 6px; padding: 6px 8px; bottom: 8px; }
                .slot { width: 38px; height: 38px; }
                .slot .count { font-size: 10px; }
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
    }

    getNewInventoryUIStyles() {
        return `
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

            #oxygen-container {
                position: fixed;
                top: 46px;
                left: 20px;
                width: 200px;
                height: 20px;
                background: #003;
                border: 2px solid #009;
                border-radius: 4px;
            }

            #oxygen-bar {
                width: 100%;
                height: 100%;
                background: #0af;
                transition: width 0.2s ease-out;
            }

            #new-inventory-ui {
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 10;
            }

            .inventory-section {
                position: absolute;
                display: flex;
                gap: 8px;
            }

            .inventory-section.top-right {
                top: 20px;
                right: 20px;
                flex-direction: row;
            }

            .inventory-section.bottom-right {
                bottom: 20px;
                right: 20px;
                flex-direction: row;
            }

            .discrete-slot {
                width: 64px;
                height: 64px;
                background: rgba(0, 0, 0, 0.6);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                position: relative;
                backdrop-filter: blur(4px);
            }

            @media (pointer: coarse) and (max-height: 500px) {
                .discrete-slot { width: 38px; height: 38px; }
                .discrete-slot .count { font-size: 10px; }
                .inventory-section { gap: 4px; }
                .inventory-section.top-right { top: 8px; right: 8px; }
                .inventory-section.bottom-right { bottom: 8px; right: 8px; }
            }

            .discrete-slot .count {
                position: absolute;
                bottom: 4px;
                right: 6px;
                font-size: 16px;
                font-weight: bold;
                color: white;
                text-shadow: 0 0 4px black, 1px 1px 2px black;
            }

            .discrete-slot.empty {
                opacity: 0.3;
            }
        `;
    }

    createOldInventoryUI(canvasContainer) {
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
    }

    createNewInventoryUI(canvasContainer) {
        // Create main container for new inventory UI
        this.newInventoryUI = document.createElement('div');
        this.newInventoryUI.id = 'new-inventory-ui';

        // =========== TOP RIGHT: Weapon, Coins, Vials ===========
        const topRightSection = document.createElement('div');
        topRightSection.className = 'inventory-section top-right';

        // Weapon slot
        this.weaponSlot = document.createElement('div');
        this.weaponSlot.className = 'discrete-slot empty';
        this.weaponSlot.dataset.category = 'weapon';
        topRightSection.appendChild(this.weaponSlot);

        // Coin slot
        this.coinSlot = document.createElement('div');
        this.coinSlot.className = 'discrete-slot empty';
        this.coinSlot.dataset.category = 'currency';
        topRightSection.appendChild(this.coinSlot);

        // Vial slot
        this.vialSlot = document.createElement('div');
        this.vialSlot.className = 'discrete-slot empty';
        this.vialSlot.dataset.category = 'consumable';
        topRightSection.appendChild(this.vialSlot);

        this.newInventoryUI.appendChild(topRightSection);

        // =========== BOTTOM RIGHT: Special Items (Keys) ===========
        const bottomRightSection = document.createElement('div');
        bottomRightSection.className = 'inventory-section bottom-right';

        // Key slot
        this.keySlot = document.createElement('div');
        this.keySlot.className = 'discrete-slot empty';
        this.keySlot.dataset.category = 'key';
        bottomRightSection.appendChild(this.keySlot);

        this.newInventoryUI.appendChild(bottomRightSection);

        canvasContainer.appendChild(this.newInventoryUI);
    }

    hideGameUI() {
        if (this.crosshair) this.crosshair.remove();
        if (this.healthContainer) this.healthContainer.remove();

        // Old inventory UI elements
        if (this.hotbar) this.hotbar.remove();
        if (this.inventoryContainer) this.inventoryContainer.remove();

        // New inventory UI elements
        if (this.newInventoryUI) this.newInventoryUI.remove();

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

        const hpPercent = (gp.health / gp.maxHealth);
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

            // Hide enemy health bar after 3s of no hits
            if (gp.timeSinceLastHit > 3) {
                gp.healthBar.visible = false;
            }
        }
    }

    updateOxygen(e) {
        const isPlayer = e.playerCtrl;
        if (!isPlayer) return;

        const gp = e.gameplay;
        if (!gp) return;

        const oxygenConfig = this.game.config.get('player.oxygen');
        const oxygenPercent = (gp.oxygen / gp.maxOxygen);

        // Update oxygen bar width
        this.oxygenBar.style.width = (oxygenPercent * 100) + "%";

        // Show/hide oxygen bar based on oxygen level and time at 100%
        if (gp.oxygen < gp.maxOxygen) {
            // Show oxygen bar when oxygen is not at max
            this.oxygenContainer.style.display = 'block';
        } else if (gp.timeSinceOxygenAt100 > oxygenConfig.oxygenBarHideDelay) {
            // Hide oxygen bar after delay when oxygen is at 100%
            this.oxygenContainer.style.display = 'none';
        }
    }

    update(dt, actions) {
        for (const e of this.world.query(ECT.GAMEPLAY)) {
            this.updateHP(e);
            this.updateOxygen(e);
        }
        for (const e of this.world.query(ECT.INVENTORY)) {
            this.updateInventory(e);
        }

        if (!actions) return;
        if (actions.toggleInventory) this.toggleInventory();
    }

    toggleInventory(){
        // Only toggle inventory grid for old UI
        if (!this.useNewInventoryUI) {
            this.uiState.isInventoryOpen = !this.uiState.isInventoryOpen;

            const inventoryContainer = document.getElementById("inventory-grid-container");
            if (inventoryContainer) {
                inventoryContainer.style.display = this.uiState.isInventoryOpen ? "block" : "none";
            }

            if (this.uiState.isInventoryOpen) {
                document.exitPointerLock?.();
            } else {
                this.game.canvas.requestPointerLock?.(); // request lock on canvas
            }
        }
        // New UI doesn't have a toggleable inventory grid
    }

    updateInventory(e) {
        const inventory = e.inventory;
        if (!inventory) return;
        const inventoryObj = inventory?.inventory
        if (!inventory?.needsUpdate) return;
        inventory.needsUpdate = false;

        if (this.useNewInventoryUI) {
            this.updateNewInventoryUI(e);
        } else {
            const hotbarItems = inventory.hotbar;
            this.updateHotbarUI(e, hotbarItems);
        }
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

    updateNewInventoryUI(e) {
        const inventory = e.inventory;
        const uiConfig = configManager.get('ui');
        const categories = uiConfig?.itemCategories || {};

        // Collect all items from hotbar and inventory
        const allItems = [...inventory.hotbar, ...inventory.inventory].filter(item => item !== null);

        // Categorize items
        const itemsByCategory = {
            weapons: [],
            consumables: [],
            currency: [],
            keys: []
        };

        for (const item of allItems) {
            if (categories.weapons?.includes(item.itemId)) {
                itemsByCategory.weapons.push(item);
            } else if (categories.consumables?.includes(item.itemId)) {
                itemsByCategory.consumables.push(item);
            } else if (categories.currency?.includes(item.itemId)) {
                itemsByCategory.currency.push(item);
            } else if (categories.keys?.includes(item.itemId)) {
                itemsByCategory.keys.push(item);
            }
        }

        // Update weapon slot (show first weapon)
        const weapon = itemsByCategory.weapons[0];
        if (weapon) {
            this.setSlotIcon(this.weaponSlot, weapon.itemId, weapon.count);
            this.weaponSlot.classList.remove('empty');
        } else {
            this.weaponSlot.style.backgroundImage = 'none';
            this.weaponSlot.innerHTML = '';
            this.weaponSlot.classList.add('empty');
        }

        // Update coin slot (sum all currency)
        const totalCoins = itemsByCategory.currency.reduce((sum, item) => sum + item.count, 0);
        if (totalCoins > 0) {
            this.setSlotIcon(this.coinSlot, 'coinbag', totalCoins);
            this.coinSlot.classList.remove('empty');
        } else {
            this.coinSlot.style.backgroundImage = 'none';
            this.coinSlot.innerHTML = '';
            this.coinSlot.classList.add('empty');
        }

        // Update vial slot (sum all consumables)
        const totalVials = itemsByCategory.consumables.reduce((sum, item) => sum + item.count, 0);
        if (totalVials > 0) {
            this.setSlotIcon(this.vialSlot, 'vial', totalVials);
            this.vialSlot.classList.remove('empty');
        } else {
            this.vialSlot.style.backgroundImage = 'none';
            this.vialSlot.innerHTML = '';
            this.vialSlot.classList.add('empty');
        }

        // Update key slot (sum all keys)
        const totalKeys = itemsByCategory.keys.reduce((sum, item) => sum + item.count, 0);
        if (totalKeys > 0) {
            this.setSlotIcon(this.keySlot, 'key', totalKeys);
            this.keySlot.classList.remove('empty');
        } else {
            this.keySlot.style.backgroundImage = 'none';
            this.keySlot.innerHTML = '';
            this.keySlot.classList.add('empty');
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

}