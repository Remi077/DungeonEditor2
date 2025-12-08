// @ts-nocheck
import * as THREE from 'three';
import * as RAPIER from 'rapier';
import * as Shared from '../Shared.js';
import { ENTITY_COMPONENT_TAGS, ENTITY_TYPES } from '../Entities/Entity.js';
// import * as Stats from './GameStats.js';
import * as GameHUD from './GameHUD.js';
import Pathfinding from "three-pathfinding";
import Stats from "stats.js";
import AnimatorManager from '../AnimatorManager.js';


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

        //stats
        this.fpsPanel = new Stats();//extra fps panel
        this.fpsPanel.showPanel(0);//fps

        this.player = null; // player handle

        //used in update(dt)
        this.worldQuat = new THREE.Quaternion();

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

            slot.appendChild(icon);
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
        input.on('resize', (e) => { this.resize(e) });
        input.on('mousedown', (e) => { this.mousedown(e) });
        input.on('mouseup', (e) => { this.mouseup(e) });
        input.on('mousemove', (e) => { this.mousemove(e) });
        input.on('resize', (e) => { this.resize(e) });

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
            yawObject.position.set(Shared.cameraOffsetX, Shared.cameraOffsetY, Shared.cameraOffsetZ);
            yawObject.rotation.set(0, 0, 0);
        }


        //spawn player
        if (!this.player){
            this.player = this.game.systems.characterManager.spawnPlayer('player',
                yawObject.position.clone()
                // new THREE.Vector3(0,0,0)
            );
        }



        // // 1. Level is ready (already loaded by LevelManager)
        // await this.game.systems.levelManager.ensureLoaded();

        // // 2. Load the player
        // const gltf = await this.game.systems.characterManager.loadCharacter('./assets/characters/player.glb');

        // // 3. Create player entity
        // this.player = this.game.systems.characterManager.createPlayer(gltf);

        // // 4. Place player in scene
        // this.game.scene.add(this.player.get(ModelComponent).object3D);

        // // 5. Register in ECS
        // this.game.ecs.register(this.player);


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
        const animatorManager = this.game.systems.animatorManager;
        if (e.button === 0) { //left click
            animatorManager.play(this.player, Shared.ANIM_ATTACK_NAME);

            //raycast
            this.raycastActionnables(); //raycast against actionnable objects

            // console.log("Play attack animation");
            // animatorManager.play(this.player, "Attack_Right");
        }
        // const canvas = this.game.canvas;
        // if (e.button === 2 &&
        //     document.pointerLockElement !== canvas) {
        //     canvas.requestPointerLock();
        //     this.crosshair.style.display = "block";
        // }
    }

    mouseup(e) {
        // const canvas = this.game.canvas;
        // if (e.button === 2 &&
        //     document.pointerLockElement === canvas) {
        //     document.exitPointerLock();
        //     this.crosshair.style.display = "none";
        // }
    }

    mousemove(e) {
        // if (
        //     !(this.game.input.isMouseDown(2)) //||
        //     // !(this.game.input.isMouseOver(this.game.canvas))
        // ) return; //right click

        const dx = e.movementX;
        const dy = e.movementY;

        // console.log(dx,dy);

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
        const animatorManager = this.game.systems.animatorManager;
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            //kinematic collider driven by animation
            //update mesh and animation before scheduling collider movement
            //as some colliders track a bone
            this.calculateDesiredMovement(dt, entity); //calculate desired movement
            this.calculateCorrectMovement(entity); //calculate corrected movement (after collision)
            this.syncMesh(entity); //apply corrected movement to mesh
            animatorManager.update(dt, entity); //update animated bone/mesh position
            this.scheduleSyncBody(entity); //sync the kinematic rigidbodies to their mesh/bones (schedule)

            //update animations
            this.updateAnimation(entity);
        }

        // animatorManager.update(dt, entities);

        // step physics world
        this.game.systems.physicsManager.step(dt);

        // sync the mesh position/rotation with physics bodies
        // for (let i = 0; i < entities.length; i++) {
        //     const entity = entities[i];
        //     this.syncMeshToRigidBody(entity);
        // }

        // keep camera holder at same position as body
        const yawObject = this.game.yawObject;
        const root = this.player.get(ENTITY_COMPONENT_TAGS.VISUAL).root;
        yawObject.position.copy(root.position);
        yawObject.position.y += Shared.cameraHeight; //keep same height for now


        // update animations
        // if (
        //     Actions.moveCamLeft ||
        //     Actions.moveCamRight ||
        //     Actions.moveCamFront ||
        //     Actions.moveCamBack
        // ) playClip(Shared.playerState,Shared.ANIM_WALK_NAME_L);
        // else stopClip(Shared.playerState);

        const ActionsOnce = this.ActionsOnce;
        if (ActionsOnce.startEditor)
            this.game.stateManager.setState('editor');
        // if (ActionsOnce.jump) jump();
        if (ActionsOnce.interact) interact();
        if (ActionsOnce.hideCol) {this.game.systems.physicsManager.toggle();};
        // if (ActionsOnce.toggleInventory) Shared.toggleInventory();

        // if (ActionsOnce.Item1) Shared.highlightSelectedSlot(1);
        // if (ActionsOnce.Item2) Shared.highlightSelectedSlot(2);
        // if (ActionsOnce.Item3) Shared.highlightSelectedSlot(3);
        // if (ActionsOnce.Item4) Shared.highlightSelectedSlot(4);
        // if (ActionsOnce.Item5) Shared.highlightSelectedSlot(5);
        // if (ActionsOnce.Item6) Shared.highlightSelectedSlot(6);
        // if (ActionsOnce.Item7) Shared.highlightSelectedSlot(7);


        //clear the onpress/onrelease actions now that they have been sampled
        //in that loop to avoid resampling
        for (let key in this.ActionsOnce) this.ActionsOnce[key] = false;

    }

    interact(){
        console.log("interact");
        //perform raycast from camera center
        //if object hit is interactable, call its interact function component
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

    calculateDesiredMovement(dt, entity) {
        const PlayerControllerComponent = entity.get(ENTITY_COMPONENT_TAGS.PLAYERCONTROLLER);
        const transformComponent = entity.get(ENTITY_COMPONENT_TAGS.TRANSFORM);
        const visualComponent = this.player.get(ENTITY_COMPONENT_TAGS.VISUAL);
        const physicsBodyComponent = entity.get(ENTITY_COMPONENT_TAGS.PHYSICS);
        const moveVector = transformComponent?.moveVector;
        const isPlayer = PlayerControllerComponent?.isPlayer;
        const root = visualComponent?.root;
        const yawObject = this.game.yawObject;

        if (isPlayer) {

            //calculate moveVector from inputs + camera orientation + vertical speed 
            moveVector.set(0, 0, 0);
            const Actions = this.Actions;
            const ActionsOnce = this.ActionsOnce;
            if (Actions.moveCamLeft) moveVector.x = -1;
            if (Actions.moveCamRight) moveVector.x = 1;
            if (Actions.moveCamFront) moveVector.z = -1;
            if (Actions.moveCamBack) moveVector.z = 1;
            moveVector.normalize();
            this.game.yawObject.getWorldQuaternion(this.worldQuat);
            moveVector.applyQuaternion(this.worldQuat);
            moveVector.multiplyScalar(transformComponent.moveSpeed);
            if (physicsBodyComponent.isTouchingGround) {
                if (ActionsOnce.jump) {
                    transformComponent.verticalSpeed = Shared.jumpSpeed;
                } else {
                    transformComponent.verticalSpeed = - 0.1; //small downward force to keep grounded
                }
            } else {
                transformComponent.verticalSpeed = Math.max(-Shared.maxFallSpeed, transformComponent.verticalSpeed - (Shared.gravity * dt));
            }
            moveVector.y += transformComponent.verticalSpeed;
            moveVector.multiplyScalar(dt);

            //calculate desired rotation from camera orientation
            const targetQuat = new THREE.Quaternion().multiplyQuaternions(yawObject.quaternion, transformComponent.tweakRot);
            const slerpQuat = root.quaternion.clone().slerp(targetQuat, 0.1);
            transformComponent.newRotation.copy(slerpQuat);

        }
    }

    calculateCorrectMovement(entity) {
        const physicsBodyComponent = entity.get(ENTITY_COMPONENT_TAGS.PHYSICS);
        const transformComponent = entity.get(ENTITY_COMPONENT_TAGS.TRANSFORM);
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

    syncMesh(entity) {
        const physicsBodyComponent = entity.get(ENTITY_COMPONENT_TAGS.PHYSICS);
        const transformComponent = entity.get(ENTITY_COMPONENT_TAGS.TRANSFORM);
        if (!transformComponent || !physicsBodyComponent) return;
        const visualComponent = entity.get(ENTITY_COMPONENT_TAGS.VISUAL);
        const root = visualComponent.root;
        //update rotation
        root.quaternion.copy(transformComponent.newRotation);
        root.position.copy(transformComponent.newPosition);
        root.position.sub(physicsBodyComponent?.offsetRootToBody);
    }

    scheduleSyncBody(entity) {
        const physicsBodyComponent = entity.get(ENTITY_COMPONENT_TAGS.PHYSICS);
        const visualComponent = entity.get(ENTITY_COMPONENT_TAGS.VISUAL);
        const body = physicsBodyComponent?.body;
        const off = physicsBodyComponent?.offsetRootToBody;
        const target = visualComponent?.root;
        if (!body || !target) return;
        const result = this.game.systems.physicsManager.scheduleSyncBody(body, target, off);
    }

    // syncMeshToRigidBody(entity) {
    //     const physicsBodyComponent = entity.get(ENTITY_COMPONENT_TAGS.PHYSICS);
    //     const visualComponent = entity.get(ENTITY_COMPONENT_TAGS.VISUAL);
    //     this.game.systems.physicsManager.syncMeshToRigidBody(
    //         visualComponent.root,
    //         physicsBodyComponent.body,
    //         physicsBodyComponent.offsetRootToBody
    //     );
    // }

    updateAnimation(entity) {
        const PlayerControllerComponent = entity.get(ENTITY_COMPONENT_TAGS.PLAYERCONTROLLER);
        const isPlayer = PlayerControllerComponent?.isPlayer;
        const animatorManager = this.game.systems.animatorManager;

        if (isPlayer) {
            const Actions = this.Actions;
            if (
                Actions.moveCamLeft ||
                Actions.moveCamRight ||
                Actions.moveCamFront ||
                Actions.moveCamBack
            ) {
                animatorManager.play(entity, Shared.ANIM_WALK_NAME_L);
            } else {
                animatorManager.stop(entity, Shared.ANIM_WALK_NAME_L);
            }
        }
    }


    raycastActionnables() {
        let selectObject = null;
        const raycastTargets = [];
        const raycaster = this.game.raycaster;
        const screenCenter = this.game.screenCenter;
        const camera = this.game.camera;
        const levelManager = this.game.systems.levelManager;

        //TODO: only call this function when clicked
        //TODO: optimize with octree or BVH tree
        levelManager.actionnablesGroup.traverse((child) => {
            if (child.isMesh) raycastTargets.push(child);
        });
        levelManager.staticGroup.traverse((child) => {
            if (child.isMesh) raycastTargets.push(child);
        });
        // levelManager.enemyGroup.traverse((child) => {
        //     if (child.isMesh) raycastTargets.push(child);
        // });
        // const raycastTargets = raycastChunkArray;
        raycaster.setFromCamera(screenCenter, camera);
        let doesIntersect = false;
        const visibleTargets = raycastTargets.filter(obj => obj.visible);
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
                const interactableComponent = selectEntity.get(ENTITY_COMPONENT_TAGS.INTERACTABLE);
                interactableComponent?.interact();
            }

            // if (closestHit.object?.userData?.type == "actionnable" //||
                // closestHit.object?.userData?.type == "enemy"
            // ) {
                // selectObject = closestHit.object;
                // if (selectObject.userData.actionnableParent != null)
                // selectObject = selectObject.userData.actionnableParent
            // }
        }

    }


}









/*---------------------------------*/
// actions variables
/*---------------------------------*/
// export let Actions = {};
let gameId = null;
let enemyId = null;

// export let ActionToKeyMap = {
//     moveCamRight: { key: 'KeyD' },
//     moveCamLeft: { key: 'KeyA' },
//     moveCamFront: { key: 'KeyW' },
//     moveCamBack: { key: 'KeyS' },
//     startGame: { key: 'KeyG', OnPress: true },
//     jump: { key: 'Space', OnPress: true },
//     interact: { key: 'KeyE', OnPress: true },
//     hideCol: { key: 'KeyH', OnPress: true },
//     toggleInventory: { key: 'KeyI', OnPress: true },

//     Item1: { key: 'Digit1', OnPress: true },
//     Item2: { key: 'Digit2', OnPress: true },
//     Item3: { key: 'Digit3', OnPress: true },
//     Item4: { key: 'Digit4', OnPress: true },
//     Item5: { key: 'Digit5', OnPress: true },
//     Item6: { key: 'Digit6', OnPress: true },
//     Item7: { key: 'Digit7', OnPress: true },

// };

/*---------------------------------*/
/* startGameLoop */
/*---------------------------------*/
let firstInit = true;
let myClonedEnemyHandle = null;
export function startGameLoop() {

    Shared.resetAllActions();
    Shared.editorState.gameRunning = true;
    Shared.setPause(false);
    requestAnimationFrame(gameLoopFirstFrame);
    // Shared.clock.start();
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTGAMECOLOR);
    Shared.playerState.verticalSpeed = 0;
    Shared.playerState.collisionmask = Shared.COL_MASKS.PLAYER;

    document.addEventListener("mousedown", onMouseClick, false);
    // document.addEventListener("mouseup", onMouseUp, false);

    if (firstInit) {
        firstInit = false;

        Shared.buildInventoryGrid(4, 8);


        const campos = Shared.yawObject.position;

        Shared.playerState.capsuleTotalHeight = Shared.playerHeight;
        Shared.playerState.capsuleRadius = Shared.playerRadius;
        Shared.playerState.capsuleCylinderhalfHeight = Shared.halfHeight;

        // --- Create kinematic body ---
        const playerBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(campos.x, campos.y + Shared.cameraHeightFromCapsuleCenter, campos.z); // initial position where camera is

        const playerBody = Shared.createRigidBodyCustom(playerBodyDesc, "playerBody");

        // --- Create character controller ---
        const kcc = Shared.physWorld.createCharacterController(Shared.skin); //0.1 is skin distance
        // kcc.setSlideEnabled(true);
        // Don’t allow climbing slopes larger than 45 degrees.
        kcc.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        // Automatically slide down on slopes smaller than 30 degrees.
        // kcc.setMinSlopeSlideAngle(30 * Math.PI / 180);
        kcc.setMinSlopeSlideAngle(40 * Math.PI / 180);
        // kcc.setMinSlopeSlideAngle(30 * Math.PI / 180);
        // Autostep if the step height is smaller than 0.5, its width is larger than 0.2,
        // and allow stepping on dynamic bodies.
        kcc.enableAutostep(0.5, 0.2, true);
        // kcc.enableAutostep(1.5, 0.2, true);
        // Snap to the ground if the vertical distance to the ground is smaller than 0.5.
        kcc.enableSnapToGround(0.5);
        // kcc.disableSnapToGround();

        // --- Create capsule collider ---
        const playerColliderDesc = RAPIER.ColliderDesc.capsule(Shared.playerState.capsuleCylinderhalfHeight, Shared.playerState.capsuleRadius)
            .setFriction(0.9)
            .setRestitution(0)
            .setCollisionGroups(Shared.COL_MASKS.PLAYER);
        // .setFriction(1.5)

        const playerCollider = Shared.createColliderCustom(playerColliderDesc, playerBody, "playerCollider");

        Shared.playerState.body = playerBody;
        Shared.playerState.collider = playerCollider;
        Shared.playerState.collider.userData.characterState = Shared.playerState;
        Shared.playerState.colliderDesc = playerColliderDesc;
        Shared.playerState.offsetRootToBody = new THREE.Vector3(
            0, Shared.playerState.capsuleCylinderhalfHeight + Shared.playerState.capsuleRadius, 0
        );
        Shared.playerState.tweakRot = Math.PI
        Shared.playerState.tweakPos = new THREE.Vector3(0.1, 0, 0.1);

        Shared.playerState.kcc = kcc;
        Shared.playerState.attackDamageStart = 0.2;
        Shared.playerState.attackDamageEnd = null;//0.2+0.2;

        initHighlightPool(Shared.scene);

        //initialize enemy template rapier primitives
        const EnemyTemplateState = Shared.EnemyTemplateState;
        // const enemyColliderDesc = RAPIER.ColliderDesc.capsule(Shared.halfHeight, Shared.playerRadius*0.7)
        // const enemyColliderDesc = RAPIER.ColliderDesc.capsule(Shared.halfHeight, Shared.playerRadius)
        EnemyTemplateState.capsuleTotalHeight = 1.8;
        EnemyTemplateState.capsuleRadius = 0.2;
        EnemyTemplateState.capsuleCylinderhalfHeight = (EnemyTemplateState.capsuleTotalHeight / 2) -
            EnemyTemplateState.capsuleRadius;
        // const enemyColliderDesc = RAPIER.ColliderDesc.capsule(Shared.halfHeight, 0.3)
        const enemyColliderDesc = RAPIER.ColliderDesc.capsule(EnemyTemplateState.capsuleCylinderhalfHeight,
            EnemyTemplateState.capsuleRadius)
            .setFriction(0.9)
            .setRestitution(0)
            .setCollisionGroups(Shared.COL_MASKS.ENEMY);
        const e_kcc = Shared.physWorld.createCharacterController(Shared.skin); //0.1 is skin distance
        e_kcc.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        // e_kcc.setMinSlopeSlideAngle(30 * Math.PI / 180);
        e_kcc.setMinSlopeSlideAngle(40 * Math.PI / 180);
        e_kcc.enableAutostep(0.5, 0.2, true);
        e_kcc.enableSnapToGround(0.5);
        EnemyTemplateState.kcc = e_kcc
        EnemyTemplateState.moveSpeed = 0.8;
        // EnemyTemplateState.moveSpeed = 2;
        EnemyTemplateState.collisionmask = Shared.COL_MASKS.ENEMY
        EnemyTemplateState.colliderDesc = enemyColliderDesc
        // EnemyTemplateState.offsetRootToBody = new THREE.Vector3(0, Shared.halfHeight + Shared.playerRadius, 0);
        EnemyTemplateState.offsetRootToBody = new THREE.Vector3(0,
            EnemyTemplateState.capsuleCylinderhalfHeight + EnemyTemplateState.capsuleRadius, 0);
        EnemyTemplateState.attackDamageStart = 0.5;
        EnemyTemplateState.attackDamageEnd = 0.5 + 0.3;
        EnemyTemplateState.healthBar = GameHUD.createHealthBar(0.5, 0.05)
        EnemyTemplateState.healthBar.position.y = Shared.playerHeight + 0.3;
        EnemyTemplateState.root.add(EnemyTemplateState.healthBar);

        /*--------------------------------------------*/
        // DEBUG ENEMY BY SEEING IT THROUGH THE WALLS //
        /*--------------------------------------------*/
        if (0) {
            let enemyMat = null;

            // Correct syntax: forEach(callback)
            EnemyTemplateState.root.children.forEach(child => {
                if (child.isSkinnedMesh) {          // Correct property name
                    enemyMat = child.material;
                }
            });

            if (enemyMat) {
                enemyMat.depthTest = false;         // camelCase
                enemyMat.depthWrite = false;        // camelCase
                enemyMat.transparent = true;        // required for visibility changes
                enemyMat.opacity = 1.0;             // optional
            }
        }
        /*--------------------------------------------*/
        /*--------------------------------------------*/





        let num = 2;
        Shared.enemySpawnGroup.children.forEach(
            child => {
                num--;
                if (num < 0) return;
                const p = child.getWorldPosition(new THREE.Vector3());
                const q = child.getWorldQuaternion(new THREE.Quaternion());
                const myClonedEnemy = Shared.EnemyTemplateState.clone(
                    child.name, p, //q
                );
                // Collect world positions of patrol points
                child.traverse(obj => {
                    if (obj !== child) {
                        const wp = obj.getWorldPosition(new THREE.Vector3());
                        myClonedEnemy.patrolPath.push(wp);
                    }
                });
                Shared.enemyGroup.add(myClonedEnemy.root);
            }
        )

        //start enemy loop
        enemyLoop();

        //start animate loop
        animateLoop();

    }

}

/*---------------------------------*/
/* gameLoopFirstFrame */
/*---------------------------------*/
function gameLoopFirstFrame() {
    //place the player rigidbody where the camera currently is and step the world
    Shared.playerState.curPos = Shared.yawObject.position.clone();
    Shared.playerState.curPos.y -= Shared.cameraHeightFromCapsuleCenter;
    Shared.playerState.body.setNextKinematicTranslation(Shared.playerState.curPos);
    Shared.physWorld.step();
    gameId = requestAnimationFrame(gameLoop);

    // playClip(Shared.EnemyTemplateState,"Idle");
    // playClip(myClonedEnemyHandle,"Idle");
}

/*---------------------------------*/
// stopGameLoop
/*---------------------------------*/
export function stopGameLoop() {
    Shared.editorState.gameRunning = false;
    cancelAnimationFrame(gameId);
    cancelAnimationFrame(enemyId);
    for (const characterState of Shared.characterStateNameMap.values()) {
        cancelAnimationFrame(characterState.attackLoopId);
    }
    document.removeEventListener("mousedown", onMouseClick, false);
    // document.removeEventListener("mouseup", onMouseUp, false);
}

/*---------------------------------*/
// gameLoop
/*---------------------------------*/
let lastUVUpdate = 0;
const verbose = false;
let deltaTime = 0;
let isInWater = false;
let isAtSurface = false;

function gameLoop(now) {
    const scene = Shared.scene;

    if (!Shared.editorState.gameRunning) return;

    //execute actions
    executeActions();

    if (!Shared.editorState.pause) { // && !skipOneFrame) {

        //fps counter
        // Stats.stats.begin();

        //initialize gameplay variables this loop
        deltaTime = Shared.clock.getDelta();       // Time elapsed since last frame
        // getDelta resets the clock at every call
        // so its important its called once per clock and per frame
        // all the other frame loop (enemyLoop, animateLoop) which reads deltaTime and call
        // requestAnimationFrame actually run on one single thread in a given unknown order
        // so best approach is to set deltaTime at same place every loop and have all the 
        // other loops consume this deltaTime

        // clear the onpress/onrelease actions now that they have been sampled 
        // in that loop to avoid resampling
        Shared.releaseSingleEventActions();

        //debug only: clear visibility of colliding meshes
        hideAllHighlights();

        /*-----------------------------------------------------*/
        /* INITIALIZE PLAYER MOVE AND ROTATION BASED ON INPUTS */
        /*-----------------------------------------------------*/
        if (!Shared.playerState.isInWater) {
            Shared.playerState.moveVector.applyQuaternion(Shared.yawObject.quaternion);
        } else {
            const worldQuat = new THREE.Quaternion();
            Shared.pitchObject.getWorldQuaternion(worldQuat);
            Shared.playerState.moveVector.applyQuaternion(worldQuat);
        }
        Shared.playerState.rotation.copy(Shared.yawObject.quaternion);
        Shared.playerState.newPos = Shared.playerState.curPos.clone();

        computeNextPos(Shared.playerState, deltaTime); // compute next position based on movement and collisions

        // BODY FINAL UPDATES
        Shared.updateMeshRotPos(Shared.playerState); // update the mesh position
        syncCameraTo(Shared.playerState, camPlayerTweak); // update the camera position

        raycastActionnables();        //raycast against actionnables

        //consistent approach: 
        //we update the mesh/rendered models based on movement/collision data
        //then in last step we sync the rigidbodies to the rendered models

        Shared.scheduleSyncBodyFromcharacterState(Shared.playerState) // schedule player rigidbody sync
        Shared.scheduleSyncBodyToMesh(Shared.playerState.weapon, Shared.playerState.weaponBody, Shared.playerState.weaponOffsetRootToBody) // schedule weapon rigidbody sync

        updatePhysics(); // update all the scene kinematic rigidbodies. Player/enemies/weapons/doors etc...

        //check if player is in water
        const prevIsInWater = isInWater;
        const belowChin = Shared.yawObject.position.clone()
        belowChin.y -= 0.3;
        isInWater = checkIsInWater(belowChin);
        if (!prevIsInWater && isInWater) console.log("ENTERSWATER");
        if (prevIsInWater && !isInWater) console.log("EXITSWATER");
        Shared.playerState.isInWater = isInWater;
        Shared.playerState.isAtSurface = false;
        if (isInWater) {
            const isHeadInWater = checkIsInWater(Shared.yawObject.position);
            if (!isHeadInWater) {
                console.log("ATSURFACE")
                Shared.playerState.isAtSurface = true;
            }
        }

        worldstep(); // step the physic world

        Shared.rapierDebug.update(); // update collider debug logic

        //render scene
        Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);//TODO: you just need to do that once?
        Shared.renderer.render(Shared.scene, Shared.camera);

        //calculate/display stats
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
        Stats.updateTextStatsThrottled();
        Stats.stats.end();

    }
    // skipOneFrame = false;

    neednewframe = false;
    //repeat loop at next frame
    gameId = requestAnimationFrame(gameLoop);

}



/*---------------------------------*/
/* enemyLoop */
/*---------------------------------*/
//TODO: moved in Shared
const enableEnemy = true;
// const enemyMoveSpeed = Shared.moveSpeed*0.8;     // Adjust movement speed
const enemyMoveSpeed = Shared.moveSpeed * 0.02;     // Adjust movement speed
// const enemyAttackDistance = 2;        
const enemyAttackDistance = 1.8;
const up = new THREE.Vector3(0, 1, 0);
const agentRadius = 1.2; // tune to your capsule size
// let oneFrameOnly = false;

// let timeSinceLastCalculatedPath = 0;
// let pathbuffer = null;
// let lastKnownPlayerPosition = null;
function enemyLoop() {

    if (
        !Shared.editorState.pause && enableEnemy
        // && !oneFrameOnly
    ) {
        // oneFrameOnly = true;

        Shared.debugLine.visible = false;

        Shared.enemyGroup.children.forEach(enemy => {

            const ec = Shared.characterStateNameMap.get(enemy.userData.name);
            const isAlive = ec.health > 0;
            let targetPos;
            let inReach;

            // Compute direction but ignore vertical difference:
            if (isAlive) {
                // ec.enemyState = Shared.ENEMY_STATES.CHASE; //temp


                //check if enemy sees player (dont do this every frame)
                if (ec.timeSinceLastSightCheck > 0.3) {
                    ec.timeSinceLastSightCheck = 0;
                    ec.playerSeen = canEnemySeeTarget(ec, Shared.playerState.root)
                    if (ec.playerSeen) {
                        ec.lastSeenPlayerPosition = Shared.playerState.root.position.clone();
                        console.log("PLAYER DETECTED at", ec.lastSeenPlayerPosition);
                        ec.timeSinceLastSeen = 0;
                    }
                } else {
                    ec.timeSinceLastSightCheck += deltaTime;
                }



                // enemy state machine

                switch (ec.enemyState) {
                    case Shared.ENEMY_STATES.IDLE:
                        //stay still
                        ec.moveVector.set(0, 0, 0);
                        playClip(ec, "Idle", true);
                        //if detects player go to chase
                        if (ec.playerSeen) {
                            ec.enemyState = Shared.ENEMY_STATES.CHASE;
                        }
                        //else after a certain time, patrol
                        else if (ec.timeSinceChangedState > 5) {
                            ec.timeSinceChangedState = 0;
                            if (ec.patrolPath.length > 0)
                                ec.enemyState = Shared.ENEMY_STATES.PATROL;
                        }
                        break;
                    case Shared.ENEMY_STATES.PATROL:
                        //go along patrol path
                        playClip(ec, "Walk", true);
                        targetPos = ec.patrolPath[0].clone();
                        inReach = moveTo(ec, targetPos, 1);
                        if (inReach)
                            rotateLeft(ec.patrolPath)
                        //if detects player go to chase
                        if (ec.playerSeen) {
                            ec.enemyState = Shared.ENEMY_STATES.CHASE;
                        }
                        //else after a certain time, idle
                        else if (ec.timeSinceChangedState > 10) {//TODO: we could store in ec a random walk time (same for idle)
                            ec.timeSinceChangedState = 0;
                            ec.enemyState = Shared.ENEMY_STATES.IDLE;
                        }
                        break;
                    case Shared.ENEMY_STATES.CHASE:
                        //chase player and attack if within reach
                        playClip(ec, "Walk", true);
                        targetPos = Shared.yawObject.position.clone();
                        inReach = moveTo(ec, targetPos, enemyAttackDistance);
                        if (inReach && !ec.invincibility) //enemy cannot attack if it just got hurt (invincible)
                            attack(ec);
                        //if line of sight breaks for a certain time, search
                        if (!ec.playerSeen) {
                            console.log("timeSinceLastSeen", ec.timeSinceLastSeen)
                            ec.timeSinceLastSeen += deltaTime;
                            if (ec.timeSinceLastSeen > 1) {
                                console.log("SEARCH");
                                ec.enemyState = Shared.ENEMY_STATES.SEARCH;
                                if (1) drawDebugSphere(ec.lastSeenPlayerPosition, Shared.scene);
                            }
                        }
                        break;
                    case Shared.ENEMY_STATES.SEARCH:
                        //go to last place where player was seen
                        playClip(ec, "Walk", true);
                        //TODO: project lastSeenPlayerPosition on navmesh to be sure enemy cannot get stuck
                        targetPos = ec.lastSeenPlayerPosition.clone();
                        inReach = moveTo(ec, targetPos, 1);
                        //if detects player go to chase
                        if (ec.playerSeen) {
                            ec.enemyState = Shared.ENEMY_STATES.CHASE;
                        }
                        //else go to idle 
                        else if (inReach) {
                            ec.enemyState = Shared.ENEMY_STATES.IDLE;
                            ec.timeSinceChangedState = 0;
                        }
                        break;
                    case Shared.ENEMY_STATES.DEATH:
                        //do nothing anymore (despawn?)
                        break;
                }
                ec.timeSinceChangedState += deltaTime;


                //compute next position based on movement, collisions, gravity
                updateEnemyPhysics(ec);

                //disappear the health bar after a certain time showing up
                if (ec.healthBar.visible) {
                    ec.timeSinceHealthBarShowedUp += deltaTime;
                    if (ec.timeSinceHealthBarShowedUp > healthBarDuration)
                        ec.healthBar.visible = false;
                }

            }

        });


    }
    enemyId = requestAnimationFrame(enemyLoop);
}


//rotate array
function rotateLeft(arr) {
    arr.push(arr.shift());
}


function moveTo(enemycharacterState, targetPos, withinDistance) {

    const ec = enemycharacterState;
    const enemyPos = ec.root.position.clone();

    // same as player loop:
    // 1) compute desired movement (enemy goes to player)
    // 2) compute next position based on movement+collisions+gravity
    // 3) update mesh position
    // 4) schedule body and weaponbody sync

    const toPlayer = targetPos.clone().sub(enemyPos);
    toPlayer.y = 0;                  // <-- remove pitch
    toPlayer.normalize();
    const yaw = Math.atan2(toPlayer.x, toPlayer.z); // Compute yaw angle from direction (THREE uses Z-forward)
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));// Build quaternion with yaw only

    // ec.rotation = q;

    //if within reach attack, otherwise move towards player
    if (enemyPos.distanceTo(targetPos) < withinDistance) {
        ec.rotation = q;
        // console.log("ATTACK");
        // playClip(ec,"Idle",true);
        // playClip(ec,"Attack",true);
        ec.moveVector.set(0, 0, 0);
        // stopClip(ec);
        return true;
        // if (!ec.invincibility) //enemy just got hurt and cannot attack
        //     attack(ec);
    } else {

        //use a straight line to player
        if (0) {
            ec.rotation = q;
            toPlayer.multiplyScalar(ec.moveSpeed);
            ec.moveVector = toPlayer;
        }

        if (1) {

            const start = projectToNavmesh(Shared.pathfinder, enemyPos);
            const end = projectToNavmesh(Shared.pathfinder, targetPos);

            if (!start || end) {
                console.warn("Could not project position(s) onto navmesh.");
            }

            //use the navmesh
            const groupID = Shared.pathfinder.getGroup("level", enemyPos);

            let path = ec.pathbuffer;
            // Compute path
            if (ec.timeSinceLastCalculatedPath < Shared.calculatePathPeriod) {
                ec.timeSinceLastCalculatedPath += deltaTime;
            } else if (ec.lastKnownPlayerPosition !== null && ec.lastKnownPlayerPosition.equals(targetPos)) {
                //timer expired but player didnt move => dont recompute, just restart timer
                ec.timeSinceLastCalculatedPath = 0;
            } else {
                //timer expired and player moved => recompute path
                ec.timeSinceLastCalculatedPath = 0;

                path = Shared.pathfinder.findPath(
                    start,
                    end,
                    "level",
                    groupID
                );
                ec.pathbuffer = path;

                console.log(ec.name, "CALCULATE PATH", performance.now());
                ec.lastKnownPlayerPosition = targetPos.clone();
                if (1) drawDebugPath(path, Shared.scene);
            }

            let newNavMeshPos = enemyPos.clone();
            if (path) {
                if (path.length > 0) {
                    const target = path[0];

                    //calculate desired movement
                    const dir = target.clone().sub(enemyPos).setY(0);
                    const dist = dir.length();

                    // if (enemyPos.distanceTo(target) < 1)
                    if (enemyPos.distanceTo(target) < 0.05) {
                        path.shift();
                    } else {
                        dir.normalize();

                        //desired step
                        const desiredStep = dir.clone().multiplyScalar(ec.moveSpeed);
                        // const rawEnd = enemyPos.clone().add(desiredStep);

                        // const nextPos = clampStepWithRadius(
                        //     Shared.pathfinder,
                        //     enemyPos,
                        //     rawEnd,
                        //     "level"
                        // );

                        ec.moveVector = desiredStep;

                        const yaw2 = Math.atan2(ec.moveVector.x, ec.moveVector.z);
                        const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw2, 0, "YXZ"));
                        // const qlerp = 
                        ec.rotation = q2;
                    }
                } else {
                    console.log("NO MORE PATH");

                    //normal steer logic
                    ec.rotation = q;
                    toPlayer.multiplyScalar(ec.moveSpeed);
                    ec.moveVector = toPlayer;
                }
            }
        }

        ec.newPos = ec.curPos.clone();
        // playClip(ec, "Walk", true);

        return false;
    }


}


function canEnemySeeTarget(ec, target, sightDistance = 10, fovDegrees = 90) {
    const targetPos = target.position.clone();
    targetPos.y += Shared.playerHeight / 2;//TOIMPROVE
    const enemyEyes = ec.root.position.clone();
    enemyEyes.y += (ec.capsuleTotalHeight * 0.9);


    // 1️⃣ Early exit: too far
    const dist = targetPos.distanceTo(enemyEyes);
    if (dist > sightDistance) return false;

    // 2️⃣ Check FOV
    const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(ec.root.quaternion);
    const toTarget = targetPos.clone().sub(enemyEyes).normalize();
    const angle = enemyForward.angleTo(toTarget); // radians
    if (
        (ec.enemyState === Shared.ENEMY_STATES.IDLE) ||
        (ec.enemyState === Shared.ENEMY_STATES.PATROL)
    ) //when in chase/search mode enemy can see from all angles (otherwise too easy to run in the back of enemies)
    {
        if (angle > THREE.MathUtils.degToRad(fovDegrees / 2)) return false; // outside FOV

    }
    // 3️⃣ Collect raycastable objects
    const raycastTargets = [];
    Shared.actionnablesGroup.traverse(child => { if (child.isMesh) raycastTargets.push(child); });
    Shared.staticGroup.traverse(child => { if (child.isMesh) raycastTargets.push(child); });
    //TODO: can an enemy hides an other?
    // Shared.enemyGroup.traverse(child => { if (child.isMesh && !ec.root.contains(child)) raycastTargets.push(child); });
    Shared.rigGroup.traverse(child => { if (child.isMesh || child.isSkinnedMesh) raycastTargets.push(child); });
    const visibleTargets = raycastTargets.filter(obj => obj.visible);

    // 4️⃣ Raycast from enemy to target
    // Setup ray from enemy to target
    const origin = enemyEyes;
    const direction = targetPos.clone().sub(origin).normalize();

    raycaster.set(origin, direction);

    const intersects = raycaster.intersectObjects(visibleTargets, true); // recursive

    if (intersects.length === 0) return false;

    // 5️⃣ Check if first hit is the target or its descendant    
    // Check if the first hit is target or a descendant of target
    let hitObj = intersects[0].object;
    console.log("ENEMY" + ec.name + "sees " + hitObj.name);
    while (hitObj) {
        if (hitObj === target) {

            // Ray start & end
            const start = origin.clone();
            const end = origin.clone().add(direction.clone().multiplyScalar(100)); // Extend ray visually

            // Update line geometry
            Shared.debugLine.geometry.setFromPoints([start, end]);

            // Toggle visibility
            Shared.debugLine.visible = true;

            return true;
        }
        // Stop if we've reached a Group or the Scene
        if (hitObj.type === 'Group' || hitObj.type === 'Scene') break;
        hitObj = hitObj.parent;
    }

    return false;
}


function updateEnemyPhysics(ec) {
    computeNextPos(ec, deltaTime); //compute next position based on movement and collisions

    Shared.updateMeshRotPos(ec, true); //update mesh position (and lerp rotation)
    Shared.scheduleSyncBodyFromcharacterState(ec) // schedule player rigidbody sync
    Shared.scheduleSyncBodyToMesh(ec.weapon, ec.weaponBody, ec.weaponOffsetRootToBody) // schedule weapon rigidbody sync
}



function drawDebugPath(path, scene) {
    //remove old debug spheres
    if (scene.debugPathSpheres) {
        scene.debugPathSpheres.forEach(s => scene.remove(s));
    }
    scene.debugPathSpheres = [];

    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    path.forEach(point => {
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(point);
        scene.add(sphere);
        scene.debugPathSpheres.push(sphere);
    })
}

function drawDebugSphere(pos, scene) {
    //remove old debug spheres
    if (scene.debugSpheres) {
        scene.debugSpheres.forEach(s => scene.remove(s));
    }
    scene.debugSpheres = [];

    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(pos);
    scene.add(sphere);
    console.log("sphere added at", pos);
    scene.debugSpheres.push(sphere);
}

function projectToNavmesh(pathfinder, pos) {
    const zone = "level";

    // Find nearest group
    const groupID = pathfinder.getGroup(zone, pos);
    if (groupID === null || groupID === undefined) return null;

    // Find nearest polygon node (without polygon check)
    const node = pathfinder.getClosestNode(pos, zone, groupID, false);
    if (!node) return null;

    // Move position to that node's centroid
    return node.centroid.clone();

}

// function clampStepWithRadius(pathfinder, start, end, zone="level"){

//     // Get group
//     const groupID = pathfinder.getGroup(zone, start);
//     if (groupID === null || groupID === undefined) return start.clone();

//     // Get polygon node
//     const node = pathfinder.getClosestNode(start, zone, groupID, false);
//     if (!node) return start.clone();

//     // endTarget must be a Vector3: clampStep will write into it
//     const out = end.clone();

//     // Call your clampStep: output is written into `out`
//     pathfinder.clampStep(start, end, node, zone, groupID, out);

//     return out; // This is the real output
// }

/*---------------------------------*/
/* myworldstep */
/*---------------------------------*/
//wrapper around world step to check its not called twice within the same frame
//otherwise the physics go crazy
let neednewframe = false;
function worldstep() {
    if (neednewframe) {
        throw new Error("world.step has been called more than once within the same frame, this is forbidden.");
    }
    Shared.physWorld.step();
    neednewframe = true;
}

/*---------------------------------*/
// executeActions
/*---------------------------------*/
function executeActions() {
    if (!Shared.editorState.pause) {
        //pauseable actions
        Shared.playerState.moveVector.set(0, 0, 0);
        if (Actions.moveCamLeft) Shared.playerState.moveVector.x = -1;
        if (Actions.moveCamRight) Shared.playerState.moveVector.x = 1;
        if (Actions.moveCamFront) Shared.playerState.moveVector.z = -1;
        if (Actions.moveCamBack) Shared.playerState.moveVector.z = 1;
        Shared.playerState.moveVector.normalize();
        if (Actions.startGame) Shared.toggleGameMode();
        if (Actions.jump) jump();
        if (Actions.interact) interact();
        if (Actions.hideCol) toggleHideCollider();
        if (Actions.toggleInventory) Shared.toggleInventory();

        if (Actions.Item1) Shared.highlightSelectedSlot(1);
        if (Actions.Item2) Shared.highlightSelectedSlot(2);
        if (Actions.Item3) Shared.highlightSelectedSlot(3);
        if (Actions.Item4) Shared.highlightSelectedSlot(4);
        if (Actions.Item5) Shared.highlightSelectedSlot(5);
        if (Actions.Item6) Shared.highlightSelectedSlot(6);
        if (Actions.Item7) Shared.highlightSelectedSlot(7);


        //animations
        if (
            Actions.moveCamLeft ||
            Actions.moveCamRight ||
            Actions.moveCamFront ||
            Actions.moveCamBack
        ) playClip(Shared.playerState, Shared.ANIM_WALK_NAME_L);
        else stopClip(Shared.playerState);

    } else {
        //unpauseable actions
    }
}


/*---------------------------------*/
// jump
/*---------------------------------*/
function jump() {
    // if (Shared.playerState.isTouchingGround)
    Shared.playerState.jumpPressed = true;
}

/*---------------------------------*/
// computeNextPos
/*---------------------------------*/
function computeNextPos(characterState, deltaTime) {

    const kcc = characterState.kcc;
    const collider = characterState.collider;
    const movement = characterState.moveVector.clone().multiplyScalar(characterState.moveSpeed);
    let nextVerticalSpeed = 0
    if (!characterState.isInWater) {
        nextVerticalSpeed = Math.max(-Shared.maxFallSpeed, characterState.verticalSpeed - (Shared.gravity * deltaTime));
    } else {
        nextVerticalSpeed = (Math.abs(characterState.verticalSpeed) < 0.00001) ? 0 : (characterState.verticalSpeed * 0.93)
        // if (nextVerticalSpeed!=0)
        // console.log(nextVerticalSpeed);
    }
    movement.y += nextVerticalSpeed

    //add repulsion forces from hit
    movement.add(characterState.hitRepulsionForce);
    // console.log(characterState.name,characterState.hitRepulsionForce);

    //decorrelate from framerate
    movement.multiplyScalar(deltaTime);

    kcc.computeColliderMovement(
        collider,
        movement,
        null,
        characterState.collisionmask,
        null
    );
    let correctedMovement = kcc.computedMovement();
    let grounded = kcc.computedGrounded();

    //collision debug
    for (let i = 0; i < kcc.numComputedCollisions(); i++) {
        let collision = kcc.computedCollision(i);
        let othercollider = collision.collider;
        // console.log("colliding with "+othercollider.userData.name)
        updateHighlight(othercollider, i);
    }

    if (
        (grounded && (!characterState.isInWater)) ||
        (characterState.isAtSurface) //you can jump when (grounded and not in water) or at surface of water
    ) {
        if (characterState.jumpPressed) {
            characterState.verticalSpeed = Shared.jumpSpeed;
            // characterState.jumpPressed = false;
            console.log("jump");
        }
        // console.log("grounded"+characterState.verticalSpeed );
        // characterState.moveSpeed = Shared.moveSpeed; //TOFIX
    } else {
        // console.log("notgrounded"+characterState.verticalSpeed );
        characterState.verticalSpeed = nextVerticalSpeed;//accumulate vertical speed
        // characterState.moveSpeed = Shared.moveSpeed*0.5; //TOFIX
    }
    characterState.jumpPressed = false;

    characterState.newPos = characterState.curPos.clone().add(correctedMovement);
    characterState.curPos = characterState.newPos

}

/*---------------------------------*/
// interact
/*---------------------------------*/
function interact() {
    console.log("interact");
}

/*---------------------------------*/
// raycastActionnables
/*---------------------------------*/
let raycastChunkArray = [];
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)
let selectObject = null;

function raycastActionnables() {
    selectObject = null;
    const raycastTargets = [];

    //TODO: only call this function when clicked
    //TODO: optimize with octree or BVH tree
    Shared.actionnablesGroup.traverse((child) => {
        if (child.isMesh) raycastTargets.push(child);
    });
    Shared.staticGroup.traverse((child) => {
        if (child.isMesh) raycastTargets.push(child);
    });
    Shared.enemyGroup.traverse((child) => {
        if (child.isMesh) raycastTargets.push(child);
    });
    // const raycastTargets = raycastChunkArray;
    raycaster.setFromCamera(screenCenter, Shared.camera);
    let doesIntersect = false;
    const visibleTargets = raycastTargets.filter(obj => obj.visible);
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

        if (closestHit.object?.userData?.type == "actionnable" //||
            // closestHit.object?.userData?.type == "enemy"
        ) {
            selectObject = closestHit.object;
            // if (selectObject.userData.actionnableParent != null)
            // selectObject = selectObject.userData.actionnableParent
        }
    }

}

/*---------------------------------*/
// onMouseClick
/*---------------------------------*/
function onMouseClick(event) {
    if (!Shared.inventoryOpen) {
        if (selectObject) {
            selectObject?.userData?.actionnableData?.action(selectObject, Shared.playerState);
        }
        attack(Shared.playerState);
    } else {

    }
}

/*---------------------------------*/
// syncCameraTo
/*---------------------------------*/
// const camPlayerTweak = new THREE.Vector3(0,Shared.cameraHeightFromCapsuleCenter + 0.2,0);
const camPlayerTweak = new THREE.Vector3(0, Shared.cameraHeightFromCapsuleCenter, 0);
function syncCameraTo(characterState, tweak = null) {
    const t = characterState.newPos;
    Shared.yawObject.position.set(
        t.x + (tweak ? tweak.x : 0),
        t.y + (tweak ? tweak.y : 0),
        t.z + (tweak ? tweak.z : 0));
}

const psyncObjectTo = new THREE.Vector3();
const qsyncObjectTo = new THREE.Quaternion();
function syncObjectTo(characterState, targetObj) {
    const p = targetObj.getWorldPosition(psyncObjectTo);
    const q = targetObj.getWorldQuaternion(qsyncObjectTo);
    characterState.root.position.set(
        p.x, p.y, p.z
    )
    characterState.root.rotation.set(
        q.x, q.y, q.z, q.w
    )
}

/*---------------------------------*/
// syncPlayerMesh
/*---------------------------------*/
// function movePlayerMesh(characterState) {
//     const root = Shared.Shared.playerState.root;
//     const pos = characterState.newPos;
//     const rot = characterState.rotation;
//     root.quaternion.set(rot.x, rot.y, rot.z, rot.w);
//     root.rotation.y += Math.PI; // optional 180° turn if needed
//     const capsuleBottomY = pos.y - (Shared.halfHeight + Shared.playerRadius);
//     const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(root.quaternion); // compute forward vector in world space
//     root.position.set(
//         pos.x - forward.x * meshTweak.x,
//         capsuleBottomY,
//         pos.z - forward.z * meshTweak.z
//     );
// }

//move mesh to new position/rotation in movement state

/*---------------------------------*/
// syncEnemyToBodies
/*---------------------------------*/
function syncEnemyToBodies() {
    Shared.enemyGroup.children.forEach(enemy => {
        const enemyBody = enemy.userData.characterState.body;
        const t = enemyBody.translation();
        const q = enemyBody.rotation();
        enemy.position.set(t.x, t.y, t.z);
        enemy.quaternion.set(q.x, q.y, q.z, q.w)
    })
}

/*---------------------------------*/
// toggleHideCollider
/*---------------------------------*/
function toggleHideCollider() {
    Shared.colliderDebugGroup.visible = !Shared.colliderDebugGroup.visible;
}




/*---------------------------------*/
// updatePhysics
/*---------------------------------*/
function updatePhysics() {
    for (const update of Shared.pendingBodyUpdates) {
        update.body.setNextKinematicTranslation(update.pos);
        update.body.setNextKinematicRotation(update.quat);
    }
    Shared.pendingBodyUpdates.length = 0; // clear for next frame
}


/*-----------------------------------*/
// initHighlightPool               //
/*-----------------------------------*/

// outside update loop
const highlightCollidingMeshes = [];
const highlightColors = [0xCFFF00, 0xFFFF00, 0xFFA500, 0xFF0000]; // green, yellow, orange, red
const MAX_HIGHLIGHTS = 4; // slightly more than expected collisions

function initHighlightPool(scene) {
    for (let i = 0; i < MAX_HIGHLIGHTS; i++) {
        const color = highlightColors[i % highlightColors.length]; // cycle if more than 4
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
        });

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        mesh.name = "highlightCollidingMeshes_" + i;
        mesh.renderOrder = 999;   // always in front
        mesh.visible = false;
        highlightCollidingMeshes.push(mesh);
        Shared.colliderDebugGroup.add(mesh);
    }
}

/*---------------------------------*/
// updateHighlight
/*---------------------------------*/
// update per frame
// update a single highlight at a given index
function updateHighlight(collider, index, highlightBody = false) {
    if (!Shared.rapierDebug.isVisible()) return;
    if (!collider) return;
    if (index >= highlightCollidingMeshes.length) return;

    const mesh = highlightCollidingMeshes[index];
    mesh.visible = true;

    const rigidBody = collider.parent(); // optional: get parent rigid body
    const position = highlightBody ? rigidBody.translation() : collider.translation();
    const rotation = highlightBody ? rigidBody.rotation() : collider.rotation();

    mesh.position.set(position.x, position.y, position.z);
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    const shape = collider.shape;
    if (shape instanceof RAPIER.Cuboid) {
        const hx = shape.halfExtents.x;
        const hy = shape.halfExtents.y;
        const hz = shape.halfExtents.z;
        mesh.scale.set(hx * 2, hy * 2, hz * 2);
    } else if (shape instanceof RAPIER.Capsule) {
        const r = shape.radius;
        const hh = shape.halfHeight;
        mesh.scale.set(r * 2, hh * 2 + r * 2, r * 2);
    } else if (shape instanceof RAPIER.Ball) {
        const r = shape.radius;
        mesh.scale.set(r * 2, r * 2, r * 2);
    } else {
        mesh.scale.set(1, 1, 1);
    }
}

/*---------------------------------*/
// hideAllHighlights
/*---------------------------------*/
function hideAllHighlights() {
    highlightCollidingMeshes.forEach(m => m.visible = false);
}

/*----------------*/
/* animateLoop */
/*----------------*/

function animateLoop() {
    for (const mixer of Shared.activeMixers) {
        mixer.update(deltaTime);

        // fire update callbacks
        if (mixer.updateCallBacks) {
            for (const cb of mixer.updateCallBacks) cb(deltaTime);
        }

    }

    //temp: turn enemies head
    Shared.enemyGroup.children.forEach(enemy => {
        const ec = Shared.characterStateNameMap.get(enemy.userData.name);
        const isAlive = ec.health > 0;
        if (isAlive) {
            switch (ec.enemyState) {
                case Shared.ENEMY_STATES.PATROL:
                    makeRigLookAt(ec, ec.patrolPath[0]);
                    break;
                case Shared.ENEMY_STATES.CHASE:
                    makeRigLookAt(ec, Shared.yawObject);
                    break;
                case Shared.ENEMY_STATES.SEARCH:
                    makeRigLookAt(ec, ec.lastSeenPlayerPosition);
                    break;
            }
        }
    })

    requestAnimationFrame(animateLoop);
}


/*----------------*/
/* playClip */
/*----------------*/
function playClip(characterState, clipName, r = false, v = false) {
    // const clipInfo = Shared.clipActions.get(clipName);
    const nextAction = characterState.animationActions.get(clipName);
    const currentMixer = characterState.mixer;
    if (!nextAction || (nextAction === characterState.currentAction)) return;
    Shared.activateMixer(currentMixer);

    if (!r)
        nextAction.reset().play();//start next action before fading out previous one

    if (r) {
        //start at random point in the anim
        const clip = nextAction.getClip();
        const randomOffset = Math.random() * clip.duration;
        nextAction.reset();
        nextAction.time = randomOffset;   // <-- start at a random point
        nextAction.play();
    }

    if (characterState.currentAction && characterState.currentAction !== nextAction) {
        characterState.currentAction.crossFadeTo(nextAction, 0.3, true);
        // characterState.currentAction.crossFadeTo(nextAction, 0.9, true);
        if (v) console.log("FADEOUT TO ", clipName);
    } else {
        if (v) console.log("SETACTION TO ", clipName);
    }
    // nextAction.reset().play();
    characterState.currentAction = nextAction;
}


/*----------------*/
/* playClipOnce */
/*----------------*/
function playClipOnce(characterState, clipName, clamp = true, endAction = null) {
    // const clipInfo = Shared.clipActions.get(clipName);
    const nextAction = characterState.animationActions.get(clipName);
    if (nextAction === undefined) {
        console.warn(clipName + " is not a valid clip for character " + characterState.name);
        return;
    }
    const currentMixer = characterState.mixer;
    Shared.activateMixer(currentMixer, true);
    nextAction.reset();
    nextAction.setLoop(THREE.LoopOnce, 1);
    nextAction.clampWhenFinished = clamp;

    // Remove previous listener to prevent stacking
    currentMixer.removeEventListener('finished', currentMixer._onFinishListener);

    // Add new listener
    currentMixer._onFinishListener = (e) => {
        if (e.action === nextAction) {  // check which action finished
            console.log('Animation finished!');
            Shared.deactivateMixer(currentMixer, true);
            // if (!clamp) nextAction.stop();
            // if (!clamp) e.action.stop();
            // nextAction.stop();  
            if (endAction) endAction(characterState);
        }
    };
    currentMixer.addEventListener('finished', currentMixer._onFinishListener);

    nextAction.play();
}

/*----------------*/
/* stopClip */
/*----------------*/
function stopClip(characterState) {
    // return;
    if (!characterState.currentAction) return;
    characterState.currentAction.fadeOut(0.3); // fades over 0.3s
    characterState.currentAction = null;
    // OPTIONAL — if no action is running anymore
    setTimeout(() => {
        Shared.deactivateMixer(characterState.mixer);
    }, 300);
}


function stopAllActions(characterState, exceptAction = null) {
    characterState.animationActions.forEach((action) => {
        if (action !== exceptAction) {
            action.stop();
            // action.enabled = false;
            // action.setEffectiveWeight(0);
        }
    });
}


/*----------------*/
/* makePartialClip */
/*----------------*/
function makePartialClip(clip, boneNames) {
    const filteredTracks = clip.tracks.filter(track => {
        return boneNames.some(name => track.name.startsWith(name));
    });
    return new THREE.AnimationClip(clip.name + '_partial', clip.duration, filteredTracks);
}


/*----------------*/
/* attack */
/*----------------*/
let isAttacking = false;
function attack(characterState) {

    if (!characterState.isAttacking) {
        characterState.isAttacking = true;

        const clampAttackAnimation = characterState.isPlayer; //clamp attack last frame if player
        playClipOnce(characterState, Shared.ANIM_ATTACK_NAME, clampAttackAnimation, () => endAttack(characterState));
        characterState.attackLoopId = requestAnimationFrame(() => attackLoop(characterState));
        characterState.timeSinceStartAttack = 0;
    }

}

/*----------------*/
/* endAttack */
/*----------------*/
function endAttack(characterState) {
    console.log(characterState.name + "ENDATTACK");
    characterState.isAttacking = false;
    cancelAnimationFrame(characterState.attackLoopId);
}

function attackLoop(characterState) {

    characterState.timeSinceStartAttack += deltaTime;
    if (
        characterState.isAttacking &&
        characterState.timeSinceStartAttack >= characterState.attackDamageStart &&
        (characterState.attackDamageEnd ?
            (characterState.timeSinceStartAttack < characterState.attackDamageEnd) : true)
    ) {

        // console.log("attackloop")
        const weaponCollider = characterState.weaponCollider;
        const weaponBody = characterState.weaponBody;
        const weaponColliderDesc = characterState.colliderDesc;
        const pos = weaponBody.translation();
        const rot = weaponBody.rotation();

        // return;

        Shared.physWorld.intersectionsWithShape(
            pos, //shapePos: pos,
            rot, //shapeRot: rot,
            weaponColliderDesc.shape, //shape: weaponColliderDesc.shape,
            (otherCollider) => {
                const hitCharacter = otherCollider.userData?.characterState
                console.log("enemy hit something", otherCollider.userData?.name)
                // const hitCharacter = Shared.characterStateNameMap.get(otherCollider.name);
                if (hitCharacter) {
                    console.log("HIT", hitCharacter.name);
                    hitCollider(hitCharacter, characterState);
                }
            }
            , //callback: null, // callback: (collider: Collider) => boolean,
            null, //filterFlags?: QueryFilterFlags,
            null, //filterGroups?: InteractionGroups,
            // Shared.COL_MASKS.PLAYERWPN, //filterGroups?: InteractionGroups,
            weaponCollider, //filterExcludeCollider?: Collider,
            characterState.body,
            // weaponBody, //filterExcludeRigidBody?: RigidBody,
            null //filterPredicate?: (collider: Collider) => boolean,
        )
    }

    characterState.attackLoopId = requestAnimationFrame(() => attackLoop(characterState));
}

//make the enemy invincible for a few frames after being hit
const invincibleDuration = 1;//1s
const repulsionDuration = 0.3;//1s
const maxHitRepulsionForce = 5;//1s
const healthBarDuration = 3;//time showing health bar after hit
function hitCollider(hitCharacter, hitter) {

    if (hitCharacter.invincibility || hitCharacter.health <= 0) {
        // console.log("hitCollider skip")
        return;
    }

    hitCharacter.invincibility = true;
    console.log("hitCharacter ", hitCharacter.name)
    // hitCharacter.health -= 10;
    hitCharacter.health -= 50;
    if (hitCharacter.isPlayer) {
        GameHUD.updateHealthBar(hitCharacter.health, hitCharacter.maxHealth);
    } else {
        GameHUD.updateFloatingHealthBar(hitCharacter);
        hitCharacter.enemyState = Shared.ENEMY_STATES.CHASE;//hitting an enemy will cause it to chase player
    }
    // hitCharacter.health -= 2;
    // hitCharacter.health -= 100;
    const hitRepulsionForce = hitCharacter.root.position.clone().sub(hitter.root.position);
    hitRepulsionForce.y = 0;
    hitRepulsionForce.normalize().multiplyScalar(maxHitRepulsionForce);
    hitCharacter.hitRepulsionForce.copy(hitRepulsionForce);

    if (hitCharacter.health <= 0) {
        console.log("character dead");
        // stopClip(hitCharacter);
        if (hitCharacter.isPlayer) {
            Shared.setMode(Shared.MODEGAMEOVER);
        } else {
            stopAllActions(hitCharacter);
            playClipOnce(hitCharacter, "Die", true, die);
        }
    } else {
        hitCharacter.root.traverse((child) => {
            // if (child.isSkinnedMesh){
            if (child.isMesh &&
                (child.name !== "hp_bg") && (child.name !== "hp_fg")
            ) {
                child.material?.color?.set(0xff0000);
            }
        }
        )
        playClipOnce(hitCharacter, "Hurt", false);
        endAttack(hitCharacter); //character cancels his attack when hurt
        requestAnimationFrame(() => invincibleFrames(hitCharacter));
    }
    // invincibleFrames(hitCharacter);

}

function invincibleFrames(hitCharacter) {
    hitCharacter.timeSinceLastHit += deltaTime;
    if (hitCharacter.timeSinceLastHit > repulsionDuration) {
        hitCharacter.hitRepulsionForce.set(0, 0, 0);
        hitCharacter.root.traverse((child) => {
            // if (child.isSkinnedMesh){
            if (child.isMesh &&
                (child.name !== "hp_bg") && (child.name !== "hp_fg")) {
                child.material?.color?.set(0xffffff);
            }
        }
        )
    }
    if (hitCharacter.timeSinceLastHit > invincibleDuration) {
        hitCharacter.timeSinceLastHit = 0;
        hitCharacter.invincibility = false;

        // console.log("last invincibleFrames call",hitCharacter.timeSinceLastHit)
    } else {
        // hitRepulsionForce.
        // console.log("new invincibleFrames call",hitCharacter.timeSinceLastHit)
        // requestAnimationFrame(hitCollider);
        requestAnimationFrame(() => invincibleFrames(hitCharacter));
    }
}

function die(thisCharacter) {
    thisCharacter.body.setEnabled(false);
    thisCharacter.healthBar.visible = false;
    Shared.physWorld.removeCollider(thisCharacter.collider, true);
    Shared.physWorld.removeCollider(thisCharacter.weaponCollider, true);
    thisCharacter.enemyState = Shared.DEATH;
}



function makeRigLookAt(characterState, target) {
    const headBone = characterState.headBone;
    if (headBone) {


        // Get player position in bone parent space
        const targetPos = new THREE.Vector3();
        if (target.type === "Object3D")
            target.getWorldPosition(targetPos);
        else
            targetPos.copy(target);

        const parent = headBone.parent;
        const targetLocal = targetPos.clone();
        parent.worldToLocal(targetLocal);

        // Direction the head should look
        const dir = targetLocal.sub(headBone.position).normalize();

        // Create quaternion that turns +Z to face direction
        const targetQuat = new THREE.Quaternion()
            .setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

        // Smooth head motion
        // headBone.quaternion.slerp(targetQuat, 0);
        // headBone.quaternion.slerp(targetQuat, 0.1);
        headBone.quaternion.slerp(targetQuat, 0.8);
        // headBone.quaternion.copy(targetQuat);

        // If you don’t want Exorcist-like twists:
        let c = 0.7;
        headBone.rotation.x = THREE.MathUtils.clamp(headBone.rotation.x, -c, c);
        headBone.rotation.z = THREE.MathUtils.clamp(headBone.rotation.z, -c, c);

    }

}


// const playerLayer =  Shared.COL_LAYERS.PLAYER;
// const waterLayer = Shared.COL_LAYERS.WATER;
// We want our point (player) to test against water colliders only
// const watergroups = new RAPIER.InteractionGroups(playerLayer, waterLayer);

function checkIsInWater(point) {
    let isWater = false;

    Shared.physWorld.intersectionsWithPoint(
        point,
        (h) => {
            if (!isWater) {
                // const col = Shared.physWorld.getCollider(h);
                const col = h;
                // console.log(col?.userData?.name);
                if (col.userData?.isWater) isWater = true;
            }
        },
        undefined, // optional filterFlags
        Shared.COL_MASKS.WATER
        // watergroups        
    );

    return isWater;
}