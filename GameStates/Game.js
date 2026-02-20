import * as THREE from 'three';

import { GAMESTATES } from '../Infra/GameStateManager.js';
import { CHARACTER_TYPES } from '../Constants.js';

export default class GameState {
    constructor(game) {
        this.game = game;
        this.world = game.world; //contains the entities

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
            "KeyQ": "useItem",
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

        this.player = null; // player handle
        this.targetPos = new THREE.Vector3();

        //used in update(dt)
        this.worldQuat = new THREE.Quaternion();

        //initial camera position
        this.initialCameraPos = new THREE.Vector3(2,1.5+0.1,2); //TODO: link with default cameraheight in prefab?

    }

    onEnter() {

        // lock pointer on click canvas
        const canvas = this.game.canvas;
        canvas.requestPointerLock();

        // show game UI
        this.game.systems.uiManager.showGameUI();

        // hide collision debug by default
        this.game.systems.collisionManager.hide();

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

        // Add sky sphere if enabled
        const skyConfig = this.game.config.get('sky');
        if (skyConfig?.enabled) {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(skyConfig.texture, (texture) => {
                // Set texture wrapping and repeat
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(4, 4); // Wrap 4 times horizontally, 1 time vertically

                const geometry = new THREE.SphereGeometry(skyConfig.radius, skyConfig.segments, skyConfig.segments);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                    fog: false
                });
                this.skySphere = new THREE.Mesh(geometry, material);
                this.skySphere.name = 'SkySphere';
                this.skySphere.rotation.x = Math.PI / 2; // Rotate 90 degrees to hide pole distortion
                this.game.scene.add(this.skySphere);
                console.log('Sky sphere added to scene');
            }, undefined, (error) => {
                console.error('Failed to load sky texture:', error);
            });
        }

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
            this.game.scene.add(yawObject);

            pitchObject.rotation.set(0, 0, 0);
            yawObject.position.copy(this.initialCameraPos);
            yawObject.rotation.set(0, 0, 0);
        }

        //spawn player
        if (!this.player){

            const playerPos = this.game.yawObject.position.clone();
            this.player = this.game.systems.characterFactory.spawnPlayer(
                CHARACTER_TYPES.PLAYER,
                playerPos,
                this.world
                //add rotation
            );
            //player health bar
            // this.player.gameplay.healthBar = this.healthBar;
            this.player.gameplay.healthBar = this.game.systems.uiManager.healthBar;

            const spawnPoints = this.game?.systems?.levelFactory?.enemySpawnGroup;
            let num = 1;
            for (const spawnPoint of spawnPoints.children){
                num --;
                if (num < 0) return;
                const zombiePos = spawnPoint.position.clone();
                zombiePos.y -= 0.9;//TEMP. capsule height not really available yet before spawn
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
                    CHARACTER_TYPES.ZOMBIE,
                    zombiePos,
                    zombieRot,
                    patrolPath
                )
            }

        }

    }

    onExit() {
        //hide game UI
        this.game.systems.uiManager.hideGameUI();

        //input management
        this.game.input.clearAllListeners(); //cleanup

        //clear scene
        this.game.scene.remove(this.ambientLight);
        this.ambientLight.dispose?.(); // optional, safe

        // Clean up sky sphere
        if (this.skySphere) {
            this.game.scene.remove(this.skySphere);
            this.skySphere.geometry.dispose();
            if (this.skySphere.material) {
                if (this.skySphere.material.map) {
                    this.skySphere.material.map.dispose();
                }
                this.skySphere.material.dispose();
            }
            this.skySphere = null;
        }
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
            this.game.canvas.requestPointerLock(); //lock to canvas if not the case
            return;
        }

        if (this.game.systems.uiManager.uiState.isInventoryOpen) return;
        const action = this.MouseToActionMap[e.button];
        if (action) this.mouseActions[action] = true;
    }

    mouseup(e) {
        const action = this.MouseToActionMap[e.button];
        if (action) this.mouseActions[action] = false;
    }

    mousemove(e) {
        const uiState = this.game.systems.uiManager.uiState;
        if (uiState.isInventoryOpen || 
            !uiState.isPointerLocked) return;
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
        this.game.systems.uiManager.uiState.isPointerLocked = isLocked;
        const crosshair = this.game.systems.uiManager.crosshair;
        if (isLocked) {
            crosshair.style.display = "block";
        } else {
            crosshair.style.display = "none";
        }
    }    

    update(dt) {

        //fps counter
        const fpsPanel = this.game.systems.uiManager.fpsPanel;
        fpsPanel.begin(); // start measuring frame

        const actions = { ...this.actions, ...this.actionsOnce, ...this.mouseActions };
        const uiState = this.game.systems.uiManager.uiState;
        const enableMovement = !uiState.isInventoryOpen && !uiState.isDialogActive
        
        //update every system
        //the order is important here, because some colliders are animation driven (weapons, doors...)
        //update body, mesh and animation before scheduling these animated weapon collider and step the world 
        this.game.systems.playerCtrlManager.update(dt,actions,enableMovement);//player desired movement, desired animation
        this.game.systems.aiManager.update(dt);//enemies desired movement, desired animation
        this.game.systems.movementManager.update(dt);//apply gravity
        this.game.systems.collisionManager.update(dt);//calculate collisions, sync mesh and schedule bodies
        this.game.systems.animatorManager.update(dt); //update animated bone/mesh position, use desired animations
        this.game.systems.collisionManager.updateAnimCollider(dt); //sync the animation driven collider to their respective mesh (schedule) 
        this.game.systems.collisionManager.step(dt); //step the collision world
        this.game.systems.collisionManager.updateAttack(dt);//attack component test for collision (attack)

        //order not important here
        this.game.systems.healthManager.update(dt); //update health and status (hurt, invincible) of entities
        this.game.systems.cameraManager.update(dt); //sync camera
        this.game.systems.dialogManager.update(dt, actions); //update dialog system
        this.game.systems.materialManager.update(dt); //update materials
        this.game.systems.uiManager.update(dt,actions); //update UI
        this.game.systems.lightManager.update(dt); //update lights
        this.game.systems.uvAnimManager.update(dt); //update moving texture (UV) animations

        //misc actions
        if (actions.startEditor) this.game.stateManager.setState(GAMESTATES.EDITOR);
        if (actions.hideCol) {this.game.systems.collisionManager.toggle();};

        //cleanup the entities marked for disabling
        this.world.cleanup();

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

        const fpsPanel = this.game.systems.uiManager.fpsPanel;
        fpsPanel.end(); //end measuring frame
    }

}

