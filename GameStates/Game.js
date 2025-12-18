import * as THREE from 'three';
import Stats from "stats.js";

import { GAMESTATES } from '../Infra/GameStateManager.js';

export default class GameState {
    constructor(game) {
        this.game = game;
        this.world = game.world; //contains the entities

        this.crosshair = null;
        this.healthContainer = null;
        this.healthBar = null;
        this.hotbar = null;
        this.inventoryContainer = null;

        this.styleTag = null;

        this.KeyToActionMap = {
            "KeyD": "moveCamRight",
            "KeyA": "moveCamLeft",
            "KeyW": "moveCamFront",
            "KeyS": "moveCamBack",
        };

        this.KeyToActionOnceMap = {
            "KeyG": "startEditor",
            "Space": "jump",
            "KeyE": "interact",
            "KeyH": "hideCol",
            "KeyI": "toggleInventory",
            "Digit1": "Item1",
            "Digit2": "Item2",
            "Digit3": "Item3",
            "Digit4": "Item4",
            "Digit5": "Item5",
            "Digit6": "Item6",
            "Digit7": "Item7",
        };

        //0: left, 1: middle, 2:right
        this.MouseToActionMap = {
            0: "attack",
        }

        //substate: inventory open
        this.uiState = {
            isInventoryOpen : false,
            isPointerLocked : true,
        }

        //stats
        this.fpsPanel = new Stats();//extra fps panel
        this.fpsPanel.showPanel(0);//fps

        this.player = null; // player handle
        this.targetPos = new THREE.Vector3();

        //used in update(dt)
        this.worldQuat = new THREE.Quaternion();

        //initial camera position
        this.initialCameraPos = new THREE.Vector3(2,1.5+0.1,2); //TODO: link with default cameraheight in prefab?

    }

    onEnter() {
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

        // lock pointer on click canvas
        const canvas = this.game.canvas;
        canvas.requestPointerLock();

        //clear all game actions
        this.actions = {};
        this.actionsOnce = {};
        this.mouseActions = {};

        //input management
        const input = this.game.input;
        input.clearAllListeners(); //important when switching state

        input.on('keydown', (e) => { this.keydown(e) });
        input.on('keyup', (e) => { this.keyup(e) });
        input.on('keypressonce', (e) => { this.keypressonce(e) });
        input.on('mousedown', (e) => { this.mousedown(e) });
        input.on('mouseup', (e) => { this.mouseup(e) });
        input.on('mousemove', (e) => { this.mousemove(e) });
        input.on('resize', (e) => { this.resize(e) });
        input.on('pointerlockchange', (e) => { this.pointerlockchange(e) });

        //game scene
        this.ambientLight = new THREE.AmbientLight(
            new THREE.Color(0.5, 0.5, 1).multiplyScalar(1)
        ); // Soft light

        this.game.scene.add(this.ambientLight);

        //initialize and place camera holder if not in scene
        const yawObject = this.game.yawObject;
        const pitchObject = this.game.pitchObject;
        if (yawObject.parent !== this.game.scene) {
            pitchObject.name = "pitchObject";
            pitchObject.add(this.game.camera);
            yawObject.name = "yawObject";
            yawObject.add(pitchObject);
            const pointLight = new THREE.PointLight(new THREE.Vector3(0, 0, 0), 1, 100);
            yawObject.add(pointLight);
            scene.add(yawObject);

            pitchObject.rotation.set(0, 0, 0);
            yawObject.position.copy(this.initialCameraPos);
            yawObject.rotation.set(0, 0, 0);
        }

        //spawn player
        if (!this.player){

            const playerPos = this.game.yawObject.position.clone();
            this.player = this.game.systems.characterFactory.spawnPlayer('player',
                playerPos,
                this.world
                //add rotation
            );
            //player health bar
            this.player.gameplay.healthBar = this.healthBar;

            const spawnPoints = this.game?.systems?.levelFactory?.enemySpawnGroup;
            let num = 1;
            for (const spawnPoint of spawnPoints.children){
                num --;
                if (num < 0) return;
                const zombiePos = spawnPoint.position.clone();
                zombiePos.y -= 0.9;//TEMP
                const zombieRot = spawnPoint.rotation.clone();
                // Collect world positions of patrol points
                const patrolPath = [];
                spawnPoint.traverse(obj => {
                    if (obj !== spawnPoint) {
                        const wp = obj.getWorldPosition(new THREE.Vector3());
                        patrolPath.push(wp);
                    }
                })
                this.game.systems.characterFactory.spawnCharacter(
                    'zombie',
                    zombiePos,
                    zombieRot,
                    this.world,
                    patrolPath
                )
            }

        }

    }

    onExit() {
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

        //input management
        this.game.input.clearAllListeners(); //cleanup

        //clear scene
        this.game.scene.remove(this.ambientLight);
        this.ambientLight.dispose?.(); // optional, safe
    }

    keydown(e) {
        const action = this.KeyToActionMap[e.code];
        if (action) this.actions[action] = true;
    }

    keyup(e) {
        const action = this.KeyToActionMap[e.code];
        if (action) this.actions[action] = false;
    }

    keypressonce(e) {
        const action = this.KeyToActionOnceMap[e.detail.code];
        if (action) this.actionsOnce[action] = true;
    }

    mousedown(e) {
        if (document.pointerLockElement !== this.game.canvas) {
            canvas.requestPointerLock(); //lock to canvas if not the case
            return;
        }

        if (this.uiState.isInventoryOpen) return;
        const action = this.MouseToActionMap[e.button];
        if (action) this.mouseActions[action] = true;
    }

    mouseup(e) {
        const action = this.MouseToActionMap[e.button];
        if (action) this.mouseActions[action] = false;
    }

    mousemove(e) {
        if (this.uiState.isInventoryOpen || !this.uiState.isPointerLocked) return;
        this.game.systems.cameraManager.mousemove(e.movementX, e.movementY);
    }

    resize(e) {
        const canvasContainer = this.game.canvasContainer;
        this.game.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        this.game.camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        this.game.camera.updateProjectionMatrix();
    }

    pointerlockchange(e) {
        const isLocked = document.pointerLockElement === this.game.canvas;
        this.uiState.isPointerLocked = isLocked;
        if (isLocked) {
            this.crosshair.style.display = "block";
        } else {
            this.crosshair.style.display = "none";
        }
    }    

    update(dt) {

        //fps counter
        this.fpsPanel.begin(); // start measuring frame

        const actions = { ...this.actions, ...this.actionsOnce, ...this.mouseActions };
        const enableMovement = !this.uiState.isInventoryOpen
        
        //update every system
        //the order is important here, since weapon kinematic collider is driven by animation
        //update body, mesh and animation before scheduling weapon collider and step the world 
        this.game.systems.playerCtrlManager.update(dt,actions,enableMovement);//player desired movement, desired animation
        this.game.systems.aiManager.update(dt);//enemies desired movement, desired animation
        this.game.systems.movementManager.update(dt);//apply gravity
        this.game.systems.collisionManager.update(dt);//calculate collisions, sync mesh and schedule bodies
        this.game.systems.animatorManager.update(dt); //update animated bone/mesh position, use desired animations
        this.game.systems.collisionManager.updateWpn(dt); //sync the weapon body to its respective mesh (schedule) and test for collision (attack)
        this.game.systems.collisionManager.step(dt); //step the collision world

        //order not important here
        this.game.systems.healthManager.update(dt); //update health and status (hurt, invincible) of entities
        this.game.systems.cameraManager.update(dt); //sync camera
        this.game.systems.materialManager.update(dt); //update materials
        this.game.systems.uiManager.update(dt,actions); //update UI

        //misc actions
        if (actions.startEditor) this.game.stateManager.setState(GAMESTATES.EDITOR);
        if (actions.hideCol) {this.game.systems.collisionManager.toggle();};

        //clear the onpress/onrelease actions now that they have been sampled
        //in that loop to avoid resampling
        for (let key in this.actionsOnce) this.actionsOnce[key] = false;

    }

    render(dt) {
        const renderer = this.game.renderer;
        const canvasContainer = this.game.canvasContainer;
        const scene = this.game.scene;
        const camera = this.game.camera;
        renderer.setViewport(0, 0, canvasContainer.clientWidth, canvasContainer.clientHeight);//TODO: you just need to do that once?
        renderer.render(scene, camera);

        this.fpsPanel.end(); //end measuring frame
    }

}

