// @ts-nocheck
import * as THREE from 'three';
import * as RAPIER from 'rapier';
import Pathfinding from "three-pathfinding";
import Stats from "stats.js";

import * as Constants from '../Constants.js';
import { ENTITY_TYPES } from '../Entities/Entity.js';
import AnimatorManager from '../Systems/AnimatorManager.js';
import { ENEMY_STATES } from '../Systems/AIManager.js';
import { GAMESTATES } from '../Systems/GameStateManager.js';


export default class GameState {
    constructor(game) {
        this.game = game;

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

        //substate: inventory open
        this.isInventoryOpen = false;
        this.isPointerLocked = true;

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
        this.Actions = {};
        this.ActionsOnce = {};

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
            this.player = this.game.systems.characterManager.spawnPlayer('player',
                playerPos
                //add rotation
            );
            //player health bar
            this.player.gameplay.healthBar = this.healthBar;

            const spawnPoints = this.game?.systems?.levelManager?.enemySpawnGroup;
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
                this.game.systems.characterManager.spawnCharacter(
                    'zombie',
                    zombiePos,
                    zombieRot,
                    patrolPath
                )
            }

        }

    }


    keydown(e) {
        const action = this.KeyToActionMap[e.code];
        if (action) {
            // console.log("keydown", action);
            this.Actions[action] = true;
        }
    }

    keyup(e) {
        const action = this.KeyToActionMap[e.code];
        if (action) {
            // console.log("keyup", action);
            this.Actions[action] = false;
        }
    }

    keypressonce(e) {
        const action = this.KeyToActionOnceMap[e.detail.code];
        if (action) {
            // console.log("keypressonce", action);
            this.ActionsOnce[action] = true;
        }
    }

    mousedown(e) {

        if (this.isInventoryOpen) return;

        const canvas = this.game.canvas;
        if (document.pointerLockElement !== canvas) {
            canvas.requestPointerLock();
            return;
        }

        const animatorManager = this.game.systems.animatorManager;
        if (e.button === 0) { //left click

            const playerWpn = this.player.weapon;
            if (playerWpn.isAttacking) return;
            playerWpn.isAttacking = true;
            playerWpn.timeSinceStartAttack = 0;

            animatorManager.play(
                this.player, 
                Constants.ANIM.ATTACK,
                false,
                false,
                false,
                (() => {
                    // console.log("END PLAYER ATTACK");
                    playerWpn.isAttacking = false;
                })
            );

            //raycast
            this.raycastActionnables(); //raycast against actionnable objects

        }
    }

    mouseup(e) {
    }

    mousemove(e) {

        if (this.isInventoryOpen) return;
        if (!this.isPointerLocked) return;  // check the flag instead of pointerLockElement

        const dx = e.movementX;
        const dy = e.movementY;

        const sensitivity = 0.002;

        const yawObject = this.game.yawObject;
        const pitchObject = this.game.pitchObject;
        yawObject.rotation.y -= e.movementX * sensitivity; // Y-axis (left/right)
        pitchObject.rotation.x -= e.movementY * sensitivity; // X-axis (up/down)

        // Clamp pitch to prevent flipping
        const maxPitch = Math.PI / 2;
        pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, pitchObject.rotation.x));
    }

    resize(e) {
        const canvasContainer = this.game.canvasContainer;
        this.game.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        this.game.camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        this.game.camera.updateProjectionMatrix();
    }

    pointerlockchange(e) {
        console.log("GAME pointerlockchange")
        const isLocked = document.pointerLockElement === this.game.canvas;
        this.isPointerLocked = isLocked;
        if (isLocked) {
            this.crosshair.style.display = "block";
        } else {
            this.crosshair.style.display = "none";
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


    update(dt) {

        //fps counter
        this.fpsPanel.begin(); // start measuring frame


        //loop through entities and update their rigidbodies        
        const entities = this.game.entities;
        const activeEntities = this.game.activeEntities;
        const animatorManager = this.game.systems.animatorManager;
        const uiManager = this.game.systems.uiManager;

        for (const e of activeEntities) {

            //kinematic collider driven by animation
            //update mesh and animation before scheduling collider movement
            //as some colliders track a bone

            this.calculateDesiredMovement(dt, e); //calculate desired movement
            this.calculateCorrectMovement(e); //calculate corrected movement (after collision)
            this.syncMesh(e); //apply corrected movement to mesh
            animatorManager.update(dt, e); //update animated bone/mesh position
            this.scheduleSyncBody(e); //sync the kinematic rigidbodies to their mesh/bones (schedule)
            this.weaponSyncBody(e); //sync the weapon body to its respective mesh (schedule)
            this.weaponAttack(e, dt); //if weapon is attacking, test weapon collision

            //update animations
            this.updateAnimation(e);
            //update material
            this.updateMaterial(e);
            //update GUI elements
            uiManager.updateGUI(e);

        }

        // step physics world
        this.game.systems.physicsManager.step(dt);

        // keep camera holder at same position as body
        const yawObject = this.game.yawObject;
        const root = this.player.visual.root;
        yawObject.position.copy(root.position);
        yawObject.position.y += this.player.transform.cameraHeight; //keep same height for now

        const ActionsOnce = this.ActionsOnce;
        if (ActionsOnce.startEditor)
            this.game.stateManager.setState(GAMESTATES.EDITOR);
        // if (ActionsOnce.jump) jump();
        if (ActionsOnce.interact) this.interact();
        if (ActionsOnce.hideCol) {this.game.systems.physicsManager.toggle();};
        if (ActionsOnce.toggleInventory) this.toggleInventory();

        if (ActionsOnce.Item1) uiManager.highlightSelectedSlot(1);
        if (ActionsOnce.Item2) uiManager.highlightSelectedSlot(2);
        if (ActionsOnce.Item3) uiManager.highlightSelectedSlot(3);
        if (ActionsOnce.Item4) uiManager.highlightSelectedSlot(4);
        if (ActionsOnce.Item5) uiManager.highlightSelectedSlot(5);
        if (ActionsOnce.Item6) uiManager.highlightSelectedSlot(6);
        if (ActionsOnce.Item7) uiManager.highlightSelectedSlot(7);


        //clear the onpress/onrelease actions now that they have been sampled
        //in that loop to avoid resampling
        for (let key in this.ActionsOnce) this.ActionsOnce[key] = false;

    }

    interact(){
        console.log("interact");
        //perform raycast from camera center
        //if object hit is interactable, call its interact function component
    }

    toggleInventory(){
        this.isInventoryOpen = !this.isInventoryOpen;
        this.inventoryContainer.style.display = this.isInventoryOpen ? "block" : "none";

        if (this.isInventoryOpen) {
            document.exitPointerLock?.();
        } else {
            this.game.canvas.requestPointerLock?.(); // request lock on canvas
        }
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

    calculateDesiredMovement(dt, e) {
        const PlayerControllerComponent = e.playerController;
        const transformComponent = e.transform;
        const visualComponent = e.visual;
        const physicsBodyComponent = e.physics;
        const body = physicsBodyComponent?.body;
        const moveVector = transformComponent?.moveVector;
        const isPlayer = e.type === ENTITY_TYPES.PLAYER;
        const isCharacter = e.type === ENTITY_TYPES.CHARACTER;
        const root = visualComponent?.root;
        const yawObject = this.game.yawObject;

        if (isPlayer) {

            //check if player in water/at surface
            const belowChin = this.game.yawObject.position.clone()
            belowChin.y -= 0.3;
            physicsBodyComponent.isInWater = this.checkIsInWater(belowChin);
            if (physicsBodyComponent.isInWater) {
                const isHeadInWater = this.checkIsInWater(this.game.yawObject.position);
                if (!physicsBodyComponent.isAtSurface && !isHeadInWater) console.log("ATSURFACE")
                physicsBodyComponent.isAtSurface = !isHeadInWater;
            } else {
                physicsBodyComponent.isAtSurface = false;
            }

            //calculate moveVector from inputs + camera orientation + vertical speed 
            moveVector.set(0, 0, 0);
            const Actions = this.Actions;
            if (Actions.moveCamLeft) moveVector.x = -1;
            if (Actions.moveCamRight) moveVector.x = 1;
            if (Actions.moveCamFront) moveVector.z = -1;
            if (Actions.moveCamBack) moveVector.z = 1;
            moveVector.normalize();
            if (!physicsBodyComponent.isInWater)
                this.game.yawObject.getWorldQuaternion(this.worldQuat);
            else
                this.game.pitchObject.getWorldQuaternion(this.worldQuat); //move in all directions in water
            moveVector.applyQuaternion(this.worldQuat);
            moveVector.multiplyScalar(transformComponent.moveSpeed);


            //calculate desired rotation from camera orientation
            const targetQuat = new THREE.Quaternion().multiplyQuaternions(yawObject.quaternion, transformComponent.tweakRot);
            // const slerpQuat = root.quaternion.clone().slerp(targetQuat, 0.1);
            // transformComponent.newRotation.copy(slerpQuat);
            transformComponent.newRotation.copy(targetQuat);


        } else if (isCharacter) {

            const aiManager = this.game.systems.aiManager;
            aiManager.calculateDesiredMovement(dt, e);

        }

        if (isCharacter || isPlayer) {

            // update invincibility status
            //TODO: not the best place for this, maybe move all player logic
            //into player controller component (equivalent of ai manager for enemy)
            //invincibility for enemy is driven by animation
            const gp = e.gameplay;
            gp.timeSinceLastHit += dt;
            if (isPlayer) {
                if (gp.invincibility && gp.timeSinceLastHit > 1)
                    gp.invincibility = false;
            } 

            //update vertical speed
            if (
                (!physicsBodyComponent.isInWater && physicsBodyComponent.isTouchingGround)
                || (physicsBodyComponent.isAtSurface)
            ) {
                if (isPlayer && this.ActionsOnce.jump) {
                    transformComponent.verticalSpeed = transformComponent.jumpSpeed;
                } else if (!physicsBodyComponent.isInWater) {
                    transformComponent.verticalSpeed = - 0.1; //small downward force to keep grounded
                }
            } else if (physicsBodyComponent.isInWater) { //in water downward speed attenuates quickly to 0
                transformComponent.verticalSpeed = (Math.abs(transformComponent.verticalSpeed) < 0.00001) ? 0 : (transformComponent.verticalSpeed * 0.93)
            } else {
                transformComponent.verticalSpeed = Math.max(-Constants.MAXFALLSPEED, transformComponent.verticalSpeed - (Constants.GRAVITY * dt));
            }
            moveVector.y += transformComponent.verticalSpeed;

            //add repulsion forces from hit
            const repulsionDuration = 0.2;//1s //TODO: move to constants
            if (gp.timeSinceLastHit > repulsionDuration){
                gp.hitRepulsionForce.set(0,0,0);
            }
            moveVector.add(gp.hitRepulsionForce);

            //decorrelate from framerate
            moveVector.multiplyScalar(dt);
        }


    }

    calculateCorrectMovement(e) {
        const physicsBodyComponent = e.physics;
        const transformComponent = e.transform;
        if (!transformComponent || !physicsBodyComponent) return;
        // check for collision and correct movement
        const result = this.game.systems.physicsManager.calculateCorrectMovement(
            physicsBodyComponent.kcc,
            physicsBodyComponent.body,
            physicsBodyComponent.collider,
            transformComponent.moveVector,
            transformComponent.newRotation,
            physicsBodyComponent.collisionGroup
        );
        physicsBodyComponent.isTouchingGround = result.isTouchingGround;
        transformComponent.newPosition = result.newPosition;
    }

    syncMesh(e) {
        const physicsBodyComponent = e.physics;
        const transformComponent = e.transform;
        if (!transformComponent || !physicsBodyComponent) return;
        const visualComponent = e.visual;
        const root = visualComponent.root;
        //update rotation
        if (e.type === ENTITY_TYPES.CHARACTER)
            root.quaternion.slerp(transformComponent.newRotation, 0.1);
        else
            root.quaternion.copy(transformComponent.newRotation);
        root.position.copy(transformComponent.newPosition);
        root.position.sub(physicsBodyComponent?.offsetRootToBody);
    }

    scheduleSyncBody(e) {
        const physicsBodyComponent = e.physics;
        const visualComponent = e.visual;
        const body = physicsBodyComponent?.body;
        const off = physicsBodyComponent?.offsetRootToBody;
        const target = visualComponent?.root;
        if (!body || !target) return;
        const result = this.game.systems.physicsManager.scheduleSyncBody(body, target, off);
    }

    weaponSyncBody(e) {
        const weaponComponent = e.weapon;
        if (!weaponComponent) return;
        const physicsBodyComponent = e.physics;
        const visualComponent = e.visual;
        const body = weaponComponent?.weaponBody;
        const off = weaponComponent?.weaponOffsetRootToBody;
        const target = weaponComponent?.weapon;
        if (!body || !target) return;
        const result = this.game.systems.physicsManager.scheduleSyncBody(body, target, off);
    }

    weaponAttack(e, dt) {
        const weaponComponent = e.weapon;
        if (!weaponComponent) return;
        if (!weaponComponent.isAttacking) return;
        weaponComponent.timeSinceStartAttack += dt;
        if (
            weaponComponent.timeSinceStartAttack >= weaponComponent.attackDamageStart &&
            (weaponComponent.attackDamageEnd ?
                (weaponComponent.timeSinceStartAttack < weaponComponent.attackDamageEnd) : true)
        ) { 
            const characterBody = e.physics.body;
            this.game.systems.physicsManager.intersectionsWithShape(
                weaponComponent.weaponBody,
                weaponComponent.weaponColliderDesc.shape,
                {
                    excludeCollider: weaponComponent.weaponCollider,
                    excludeBody: characterBody,
                    callback: ((otherCollider) => {
                        const colentity = otherCollider?.userData?.entity;
                        if (colentity){
                            console.log(e.name, "hit something", colentity.name)
                            this.hurt(colentity, e);
                        }
                    })
                }
            )
        }
    }

    hurt(target, source) {
        const maxHitRepulsionForce = 5;//1s //TODO: move in constants
        const ai = target.ai;
        const vs = target.visual;
        const gp = target.gameplay;
        if (gp.invincibility || gp.health <= 0)
            return;

        gp.health -= 10;
        // gp.health -= 50;
        const isPlayer = target.type === ENTITY_TYPES.PLAYER;

        const wpn =target.weapon;
        if (wpn){
            wpn.isAttacking = false; //cancel the attack on hurt
        }

        const vssource = source.visual;
        const hitRepulsionForce = vs.root.position.clone().sub(vssource.root.position);
        hitRepulsionForce.y = 0;
        hitRepulsionForce.normalize().multiplyScalar(maxHitRepulsionForce);
        gp.hitRepulsionForce.copy(hitRepulsionForce);

        if (gp.health <= 0) {
            console.log("character dead");
            if (isPlayer) {
                this.game.stateManager.setState(GAMESTATES.GAMEOVER);
            } else {
                this.game.systems.aiManager.die(target);
            }
        } else {
            if (isPlayer) {
                gp.invincibility = true;
                gp.timeSinceLastHit = 0;
            } else {
                this.game.systems.aiManager.hurt(target);       
                gp.timeSinceLastHit = 0;
            }
                 
        }

    }

    disableEntity(e) {
        const ps = e.physics;
        const wpn = e.weapon;
        this.game.systems.physicsManager.scheduleRemoval(ps.body, ps.collider);
        this.game.systems.physicsManager.scheduleRemoval(wpn.weaponBody, wpn.weaponCollider);
        this.game.activeEntities.delete(e);
    }

    updateAnimation(e) {
        const isPlayer = e.type === ENTITY_TYPES.PLAYER;
        const isCharacter = e.type === ENTITY_TYPES.CHARACTER;
        const animatorManager = this.game.systems.animatorManager;

        if (isPlayer) {
            const Actions = this.Actions;
            if (
                Actions.moveCamLeft ||
                Actions.moveCamRight ||
                Actions.moveCamFront ||
                Actions.moveCamBack
            ) {
                animatorManager.play(e, Constants.ANIM.WALK_L);
            } else {
                animatorManager.stop(e, Constants.ANIM.WALK_L);
            }
        } else if (isCharacter) {
            const aiComponent = e.ai;
            switch (aiComponent.enemyState) {
                case ENEMY_STATES.IDLE:    animatorManager.play(e, Constants.ANIM.IDLE); break;
                case ENEMY_STATES.PATROL :
                case ENEMY_STATES.CHASE : 
                case ENEMY_STATES.SEARCH:
                    animatorManager.play(e, Constants.ANIM.WALK); 
                    break;
                case ENEMY_STATES.ATTACK:  
                    animatorManager.play(e, Constants.ANIM.ATTACK, false, false, false,
                        (() => {
                            aiComponent.animationFinished = true;
                        }), 
                    ); 
                    break;
                case ENEMY_STATES.HURT:    
                    animatorManager.play(e, Constants.ANIM.HURT, false, true, false, 
                        (() => {
                            aiComponent.animationFinished = true;
                        }), 
                        false);
                    break;
                case ENEMY_STATES.DEATH:   
                    animatorManager.stop(e, Constants.ANIM.ATTACK);
                    animatorManager.play(e, Constants.ANIM.DIE, false, false, false, 
                        (() => {
                            this.disableEntity(e);
                        })
                    , false);
                 break;
            }

            switch (aiComponent.enemyState) {
                case ENEMY_STATES.PATROL:
                    animatorManager.makeRigLookAt(e, aiComponent.patrolPath[0]);
                    break;
                case ENEMY_STATES.CHASE:
                    animatorManager.makeRigLookAt(e, this.game.yawObject);
                    break;
                case ENEMY_STATES.SEARCH:
                    animatorManager.makeRigLookAt(e, aiComponent.lastSeenPlayerPosition);
                    break;
            }
        }
    }

    updateMaterial(e) {
        const isPlayer = e.type === ENTITY_TYPES.PLAYER;
        const aiComponent = e.ai;
        if (isPlayer) {
            const gp = e.gameplay;
            const visualComponent = e.visual;
            if (gp.invincibility)
                visualComponent.skinnedMesh.material = visualComponent.hurtMaterial;
            else
                visualComponent.skinnedMesh.material = visualComponent.normalMaterial;
        } else {
            const aiComponent = e.ai;
            const visualComponent = e.visual;
            if (!aiComponent || !visualComponent) return;
            if (aiComponent.enemyState === ENEMY_STATES.HURT){
                visualComponent.skinnedMesh.material = visualComponent.hurtMaterial;
            } else if (visualComponent.skinnedMesh.material !== visualComponent.normalMaterial) {
                visualComponent.skinnedMesh.material = visualComponent.normalMaterial;
            }
        }
    }


    checkIsInWater(point) {
        const physicsManager = this.game.systems.physicsManager;
        return physicsManager.intersectionsWithPoint(point, Constants.COL_MASKS.WATER);
    }

    raycastActionnables() {
        let selectObject = null;
        const raycaster = this.game.raycaster;
        const screenCenter = this.game.screenCenter;
        const camera = this.game.camera;
        const levelManager = this.game.systems.levelManager;

        //TODO: only call this function when clicked
        //TODO: optimize with octree or BVH tree
        const visibleTargets = levelManager.getRaycastTargets(true, true); //static and actionnables
        raycaster.setFromCamera(screenCenter, camera);
        let doesIntersect = false;
        const hits = raycaster.intersectObjects(visibleTargets, true);//true means recursive raycast, it parses children too

        let closestHit = null;

        for (const hit of hits) {
            if (!closestHit || hit.distance < closestHit.distance) {
                closestHit = hit;
            }
        }

        if (closestHit && closestHit.distance < 3) {
            doesIntersect = true;
        }

        if (doesIntersect) {

            console.log("HIT", closestHit.object.name);
            const selectEntity = closestHit.object?.userData?.entity;

            if (selectEntity?.type === ENTITY_TYPES.ACTIONNABLE) {
                console.log("hit actionnable");
                const interactableComponent = selectEntity.interactable;
                interactableComponent?.interact(this.player);
            }

        }

    }


}

