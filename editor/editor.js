// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import * as SkeletonUtils from 'SkeletonUtils';

import * as RAPIER from 'rapier';

// import * as Shared from '../shared.js';
// import * as Stats from '../Stats.js';
// import * as GameHUD from '../game/gameHUD.js';
// import * as loadSave from './loadSave.js';
import * as Shared from '../shared.js';
import * as GameHUD from '../game/gameHUD.js';
import * as loadSave from './loadSave.js';
import Stats from "stats.js";


export default class EditorState {
    constructor(game) {
        this.game = game;

        this.uiPanel = null;
        this.loadButton = null;
        this.saveButton = null;
        this.resetButton = null;
        this.startButton = null;
        this.crosshair = null;

        this.styleTag = null;

        //Optional: stats spans
        this.fpsSpan = null;
        this.meshCountSpan = null;

        this.KeyToActionMap = {
            "ShiftLeft": "moveCamUp",
            "Space": "moveCamDown",
            "KeyD": "moveCamRight",
            "KeyA": "moveCamLeft",
            "KeyW": "moveCamFront",
            "KeyS": "moveCamBack",
        };

        this.KeyToActionOnceMap = {
            "Ctrl+KeyS": "saveLevel",
            "Ctrl+KeyL": "loadLevel",
            "Ctrl+KeyR": "resetLevel",
            "KeyM": "loadTest",
            "KeyG": "startGame",
            "KeyH": "hideCol",
        };

        //used in update loop
        this.moveVector = new THREE.Vector3();
        this._tmpEuler = new THREE.Euler();
        this.worldQuat = new THREE.Quaternion();

        //stats
        this.fpsPanel = new Stats();//extra fps panel
        this.fpsPanel.showPanel(0);//fps
        this.frameCount = 0;
        this.drawCalls = 0;
        this.lastFrameTime = 0;

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
                display: none;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
        `;
        document.head.appendChild(this.styleTag);

        // --- Create UI panel ---
        this.uiPanel = document.createElement('div');
        this.uiPanel.id = 'ui-panel';

        // --- Tab header ---
        const tabHeader = document.createElement('div');
        tabHeader.className = 'tab-header';
        tabHeader.textContent = 'Game Controls';
        this.uiPanel.appendChild(tabHeader);

        // --- Utilities buttons container ---
        const utilities = document.createElement('div');
        utilities.id = 'utilities';
        Object.assign(utilities.style, {
            padding: '10px',
            gap: '10px',
            display: 'flex',
            flexDirection: 'column'
        });
        
        // --- Buttons ---
        this.loadButton = this.createButton('Load (Ctrl+L)', () => this.onLoad());
        this.saveButton = this.createButton('Save (Ctrl+S)', () => this.onSave());
        this.resetButton = this.createButton('Reset (Ctrl+R)', () => this.onReset());
        this.startButton = this.createButton('Start Game (G)', () => this.onStart());

        utilities.appendChild(this.loadButton);
        utilities.appendChild(this.saveButton);
        utilities.appendChild(this.resetButton);
        utilities.appendChild(this.startButton);
        this.uiPanel.appendChild(utilities);

        // --- Stats Panel ---
        const stats = document.createElement('div');
        stats.id = 'text-stats';
        Object.assign(stats.style, {
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.5em',
        });

        this.fpsSpan = this.createStatLine(stats, "FPS");
        this.meshCountSpan = this.createStatLine(stats, "Meshes");
        this.visibleMeshCountSpan = this.createStatLine(stats, "Visible Meshes");
        this.lightCountSpan = this.createStatLine(stats, "Lights");
        this.materialCountSpan = this.createStatLine(stats, "Materials");
        this.geometryCountSpan = this.createStatLine(stats, "Geometries");
        this.textureCountSpan = this.createStatLine(stats, "Textures");
        this.drawCallsSpan = this.createStatLine(stats, "Draw Calls");
        this.colliderCountSpan = this.createStatLine(stats, "Colliders");
        this.rigidBodiesCountSpan = this.createStatLine(stats, "RigidBodies");
        this.uiPanel.appendChild(stats);

        // --- extra FPS Panel ---
        const fpsPanel = this.fpsPanel;
        Object.assign(fpsPanel.dom.style, {
            position: 'relative',
            top: 'auto',
            left: 'auto',
            right: '0px',
            marginTop: '10px',
            transform: 'scale(2)',
            transformOrigin: 'top left'
        });
        this.uiPanel.appendChild(fpsPanel.dom);

        this.game.mainContainer.appendChild(this.uiPanel);

        // --- crosshair ---
        const canvasContainer = this.game.canvasContainer;
        this.crosshair = document.createElement('div');
        this.crosshair.id = 'crosshair';
        this.crosshair.textContent = '+';
        canvasContainer.appendChild(this.crosshair);

        //clear
        this.Actions = {};
        this.ActionsOnce = {};

        //input management
        const input = this.game.input;
        input.clearAllListeners();

        input.on('keydown', (e) => { this.keydown(e) });
        input.on('keyup', (e) => { this.keyup(e) });
        input.on('keypressonce', (e) => { this.keypressonce(e) });
        input.on('mousedown', (e) => { this.mousedown(e) });
        input.on('mouseup', (e) => { this.mouseup(e) });
        input.on('mousemove', (e) => { this.mousemove(e) });
        input.on('resize', (e) => { this.resize(e) });

        //editor scene
        const scene = this.game.scene;

        //ambient light
        this.ambientLight = new THREE.AmbientLight(
            new THREE.Color(1,1,1).multiplyScalar(0.45)
        ); // Soft light
        scene.add(this.ambientLight);

        //Mini scene for axis helper
        this.axesScene = new THREE.Scene();
        this.axesScene.background = new THREE.Color(0x000000);
        this.axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
        this.axesHelper = new THREE.AxesHelper(2);
        this.axesCamera.up = this.game.camera.up;
        this.axesCamera.position.set(0,0,5);
        this.axesScene.add(this.axesHelper);

        //helper grid
        const gridSize = 100;
        const gridDivisions = 100;
        this.grid = new THREE.GridHelper(gridSize, gridDivisions);
        this.grid.name = "GridHelper";
        scene.add(this.grid);

        //helper gizmo
        this.axes = new THREE.AxesHelper(3); //size
        this.axes.name = "AxesHelper";
        scene.add(this.axes);

        //initialize and place camera holder if not in scene
        const yawObject = this.game.yawObject;
        const pitchObject = this.game.pitchObject;
        if (yawObject.parent !== scene)
        {
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

    }

    createButton(label, onClick) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        return btn;
    }

    createStatLine(container, label) {
        const div = document.createElement('div');
        div.innerHTML = `${label}: <span>0</span>`;
        container.appendChild(div);
        return div.querySelector('span');
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
        const canvas = this.game.canvas;
        if (e.button === 2 &&
            document.pointerLockElement !== canvas) {
                canvas.requestPointerLock();
                this.crosshair.style.display = "block";
        }
    }

    mouseup(e) {
        const canvas = this.game.canvas;
        if (e.button === 2 &&
            document.pointerLockElement === canvas) {
                document.exitPointerLock();
                this.crosshair.style.display = "none";
        }
    }

    mousemove(e) {
        if (
            !(this.game.input.isMouseDown(2)) //||
            // !(this.game.input.isMouseOver(this.game.canvas))
        ) return; //right click

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
        // Remove all UI
        if (this.uiPanel) this.uiPanel.remove();
        if (this.crosshair) this.crosshair.remove();

        if (this.styleTag) {
            this.styleTag.remove();
            this.styleTag = null;
        }

        // clear scene
        this.game.scene.remove(this.ambientLight);
        this.ambientLight.dispose?.(); // optional, safe

        // --- Remove editor-only helpers from main scene ---
        if (this.grid) {
            this.game.scene.remove(this.grid);
            if (this.grid.geometry) this.grid.geometry.dispose();
            if (this.grid.material) this.grid.material.dispose();
            this.grid = null;
        }

        if (this.axes) {
            this.game.scene.remove(this.axes);
            if (this.axes.geometry) this.axes.geometry.dispose();
            if (this.axes.material) this.axes.material.dispose();
            this.axes = null;
        }

        // --- Remove mini axes scene (if you use a separate render target) ---
        if (this.axesScene) {
            if (this.axesHelper) {
                this.axesScene.remove(this.axesHelper);
                if (this.axesHelper.geometry) this.axesHelper.geometry.dispose();
                if (this.axesHelper.material) this.axesHelper.material.dispose();     
                this.axesHelper = null;
            }
            this.axesScene = null;
            this.axesCamera = null;
        }

    }

    // --- Button callbacks ---
    onLoad() { console.log('Load pressed'); loadSave.saveLevel();}
    onSave() { console.log('Save pressed'); loadSave.loadLevel();}
    onReset() { console.log('Reset pressed'); loadSave.resetLevel();}
    onStart() { this.game.stateManager.setState('game'); }

    updateStats(){
        const now = performance.now();
        this.frameCount++;
        if (now - this.lastFrameTime >= 1000) {
            const fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;
            this.fpsSpan.textContent = fps;
        }
        this.drawCallsSpan.textContent = this.drawCalls;

        const world = this.game.systems.physicsManager;
        if (world){
            this.colliderCountSpan.textContent = world.getNumColliders();
            this.rigidBodiesCountSpan.textContent = world.getNumBodies();
        }

        //traverse scene geometry+material every 1s
        if (now - this.lastStatsUpdate < 1000) return;
        this.lastStatsUpdate = now;

        //Mesh count
        const materials = new Set();
        let meshCount = 0;
        let visibleMeshCount = 0;
        let lightCount = 0;

        this.game.scene.traverse(obj => {
            if (obj.isMesh) {
                meshCount++;
                const visible = Array.isArray(obj.material)
                    ? obj.material.some(m => m.visible !== false)
                    : obj.material?.visible !== false;
                if (visible) visibleMeshCount++;

                if (Array.isArray(obj.material)) obj.material.forEach(m => materials.add(m));
                else if (obj.material) materials.add(obj.material);
            }
            if (obj.isLight) lightCount++;
        });

        this.meshCountSpan.textContent = meshCount;
        this.visibleMeshCountSpan.textContent = visibleMeshCount;
        this.lightCountSpan.textContent = lightCount;
        this.materialCountSpan.textContent = materials.size;

        //GPU memory info
        const mem = this.game.renderer.info.memory;
        this.geometryCountSpan.textContent = mem.geometries;
        this.textureCountSpan.textContent = mem.textures;
    }

    update(dt) {

        //fps counter
        this.fpsPanel.begin(); // start measuring frame
        
        const Actions = this.Actions;
        const ActionsOnce = this.ActionsOnce;
        const moveVector = this.moveVector;

        //movement
        moveVector.set(0,0,0);
        if (Actions.moveCamUp) moveVector.y += 1;
        if (Actions.moveCamDown) moveVector.y -= 1;
        if (Actions.moveCamLeft) moveVector.x -= 1;
        if (Actions.moveCamRight) moveVector.x += 1;
        if (Actions.moveCamFront) moveVector.z -= 1;
        if (Actions.moveCamBack) moveVector.z += 1;
        moveVector.normalize();
        this._tmpEuler.set(0, this.game.yawObject.rotation.y, 0);
        moveVector.applyEuler(this._tmpEuler);
        const moveCam = Shared.moveSpeed * dt;
        this.game.yawObject.position.add(moveVector.multiplyScalar(moveCam));

        // if (ActionsOnce.pause) Shared.doPause();
        if (ActionsOnce.hideCol) {this.game.systems.physicsManager.toggle();}
        if (ActionsOnce.saveLevel) this.onSave();
        if (ActionsOnce.loadLevel) this.onLoad();
        if (ActionsOnce.loadTest){
            this.game.systems.levelManager.loadLevel('./assets/glb/Level1.glb')
            .then(() => this.game.systems.levelManager.addToScene());
        }    
        if (ActionsOnce.resetLevel) this.onReset();
        if (ActionsOnce.startGame) this.onStart();

        //clear the onpress/onrelease actions now that they have been sampled
        //in that loop to avoid resampling
        for (let key in this.ActionsOnce) this.ActionsOnce[key] = false;

        //To sync the mini gizmo with main camera orientation:
        this.game.camera.getWorldQuaternion(this.worldQuat);
        this.axesHelper.quaternion.copy(this.worldQuat).invert();

        //step physics world
        const world = this.game.systems.physicsManager;
        if (world){
            world.step(dt);
        }

    }

    render(dt) {

        const renderer = this.game.renderer;
        const canvasContainer = this.game.canvasContainer;
        const scene = this.game.scene;
        const camera = this.game.camera;

        // 1. Render main scene
        renderer.setViewport(0, 0, canvasContainer.clientWidth, canvasContainer.clientHeight);
        renderer.clear();

        renderer.render(scene, camera);
        //console.log("draw calls main scene", renderer.info.render.calls);
        this.drawCalls = renderer.info.render.calls;

        // 2. Render mini viewport (e.g., bottom-left corner)
        const vpSize = 100;
        renderer.setViewport(10, 10, vpSize, vpSize);
        renderer.setScissor(10, 10, vpSize, vpSize);
        renderer.setScissorTest(true);
        renderer.clearDepth();
        renderer.render(this.axesScene, this.axesCamera);
        //console.log("draw calls mini viewport", renderer.info.render.calls);
        this.drawCalls += renderer.info.render.calls;

        // 3. Reset to full Shared.canvas
        renderer.setScissorTest(false);

        // Simulate heavy computation
        if (0) {
            const start = performance.now();
            while (performance.now() - start < 200) {// 200ms delay
                // Busy-wait loop (blocks the main thread)
            }
        }

        this.updateStats(); //update stats on ui panel

        this.fpsPanel.end(); //end measuring frame

    }

}





























/*-----------------------------------------------------*/
// EDITOR CONSTANTS
/*-----------------------------------------------------*/

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/

// let editorId = null;
// export let Actions = {};

/*-----------------------------------------------------*/
// EDITOR ACTIONS TO KEY MAPPING AND REVERSE
/*-----------------------------------------------------*/
// export let ActionToKeyMap = {
//     moveCamUp: { key: 'ShiftLeft' },
//     moveCamDown: { key: 'Space' },
//     moveCamRight: { key: 'KeyD' },
//     moveCamLeft: { key: 'KeyA' },
//     moveCamFront: { key: 'KeyW' },
//     moveCamBack: { key: 'KeyS' },
//     rotLeft: { key: 'KeyQ', OnPress: true },
//     rotRight: { key: 'KeyE', OnPress: true },
//     saveLevel: { key: 'Ctrl+KeyS', OnPress: true },
//     loadLevel: { key: 'Ctrl+KeyL', OnPress: true },
//     resetLevel: { key: 'Ctrl+KeyR', OnPress: true },
//     loadTest: { key: 'KeyM', OnPress: true },
//     startGame: { key: 'KeyG', OnPress: true },
//     hideCol: { key: 'KeyH', OnPress: true },
// };

/*-----------------------------------------------------*/
// PRELIMINARIES
// create scene, camera and renderer
// grid + axes helpers
// floor object for raycast
// mini scene for axis helper
// camera holder
// HUB overlay
// clock and input listeners
/*-----------------------------------------------------*/

// grid and axes helpers
// let grid;
// let gridtwo;
// let axes;

//raycaster
// const raycaster = new THREE.Raycaster();
// const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)

// Mini scene for axis helper
// const axesScene = new THREE.Scene();
// axesScene.background = new THREE.Color(0x000000);
// const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
// const axesHelper = new THREE.AxesHelper(2);

// camera holder: FPS-style rotation system
// pitch
// Shared.pitchObject.name = "pitchObject";
// Shared.pitchObject.add(Shared.camera);

// // yaw
// Shared.yawObject.name = "yawObject";
// Shared.yawObject.add(Shared.pitchObject);
// const pointLight = new THREE.PointLight(new THREE.Vector3(0, 0, 0), 1, 100);
// Shared.yawObject.add(pointLight);
// Shared.scene.add(Shared.yawObject);

// Shared.resetCamera();

// // renderer
// Shared.renderer.setClearColor(0x000000, 0); // transparent background
// Shared.scene.background = new THREE.Color(0x000000);
// Shared.renderer.setSize(Shared.container.clientWidth, Shared.container.clientHeight);

// Shared.renderer.shadowMap.enabled = true;
// Shared.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // smoother shadows                            // important

/*---------------------------------*/
// setupEditor
/*---------------------------------*/
// let scene;
// export function setupEditor() {

//     //setup local references to be able to watch them
//     //in debugger
//     scene = Shared.scene;

//     /*-----------------------------*/
//     // In Three.js, the coordinate system is a right-handed Cartesian system, and the axes are organized like this:
//     //       Y+ (up) (green)
//     //        |
//     //        |
//     //        |_____ X+ (right) (red)
//     //       /
//     //      /
//     //    Z+ (toward you) (blue)
//     /*-----------------------------*/

//     // create the scene
//     createScene();

//     //initialize scene
//     initializeScene();

//     // Reset the clock to start from 0
//     Shared.clock.start();

// }

// /*---------------------------------*/
// // startEditorLoop
// /*---------------------------------*/
// export function startEditorLoop() {
//     Shared.editorState.editorRunning = true;
//     editorId = requestAnimationFrame(editorLoop);

//     //grid
//     grid.visible = true;
//     axes.visible = true;

//     //lights
//     Shared.ambientLight.color.set(Shared.AMBIENTLIGHTEDITCOLOR);

//     document.addEventListener("mousedown", onMouseClick, false);
//     document.addEventListener("mouseup", onMouseUp, false);
//     // document.addEventListener("wheel", onMouseWheel, { passive: false });
// }

// /*---------------------------------*/
// // stopEditorLoop
// /*---------------------------------*/
// export function stopEditorLoop() {
//     Shared.editorState.editorRunning = false;

//     cancelAnimationFrame(editorId);

//     //grid
//     grid.visible = false;
//     axes.visible = false;

//     document.removeEventListener("mousedown", onMouseClick, false);
//     document.removeEventListener("mouseup", onMouseUp, false);
//     // document.removeEventListener("wheel", onMouseWheel, { passive: false });

//     Stats.stats.end();
// }

// /*---------------------------------*/
// // onMouseClick
// /*---------------------------------*/
// function onMouseClick(event) {

//     if (!Shared.editorState.editorRunning || !Shared.getIsMouseOverCanvas()) return;

//     if (event.button == 0) {

//         Shared.editorState.hasClicked  = true;
//         Shared.editorState.mouseIsDown = true;

//      }

//     //right click
//     // if (event.button == 2){
//     // }

// }

// /*---------------------------------*/
// // onMouseUp
// /*---------------------------------*/
// function onMouseUp(event) {

//     if (!Shared.editorState.editorRunning || !Shared.getIsMouseOverCanvas()) return;

//     if (event.button == 0) {

//         Shared.editorState.mouseIsDown = false;

//     }

// }

// /*---------------------------------*/
// // executeUnpausableActions
// /*---------------------------------*/
// function executeUnpausableActions(delta) {
//     // Create a local movement vector based on input
//     // console.log("executeUnpausableActions",Actions.moveCamUp);
//     const moveVector = new THREE.Vector3();
//     const moveCam = Shared.moveSpeed * delta;
//     if (Actions.moveCamUp) moveVector.y += 1;
//     if (Actions.moveCamDown) moveVector.y -= 1;
//     if (Actions.moveCamLeft) moveVector.x -= 1;
//     if (Actions.moveCamRight) moveVector.x += 1;
//     if (Actions.moveCamFront) moveVector.z -= 1;
//     if (Actions.moveCamBack) moveVector.z += 1;
//     if (Actions.hideCol) toggleHideCollider();
//     if (Actions.saveLevel) loadSave.saveLevel();
//     if (Actions.loadLevel) loadSave.loadLevel();
//     if (Actions.loadTest) loadSave.loadTest(Shared.scene);
//     if (Actions.resetLevel) loadSave.resetLevel();


//     // camera.lookAt(chara);

//     moveVector.normalize();
//     moveVector.applyEuler(new THREE.Euler(0, Shared.yawObject.rotation.y, 0));
//     Shared.yawObject.position.addScaledVector(moveVector, moveCam);

//     if (Actions.pause) Shared.doPause();
// }

// function executeLastActionsBeforeLoop() {
//     if (Actions.startGame) toggleGameMode();
// }

// /*---------------------------------*/
// // editorLoop
// /*---------------------------------*/

// function editorLoop(now) {

//     if (!Shared.editorState.editorRunning) return;

//     //fps counter
//     Stats.stats.begin();

//     const deltaTime = Shared.clock.getDelta(); // Time elapsed since last frame
//     GameHUD.drawHUD();

//     if (Shared.getIsMouseOverCanvas()) {

//         executeUnpausableActions(deltaTime);

//         //clear that flag
//         Shared.editorState.renderOneFrame = false;

//         //RENDER GIZMO HELPER in BOTTOM LEFT CORNER
//         //TODO: main renderer is in there too
//         //move before the end of loop?
//         render_gizmo();

//         // Simulate heavy computation
//         if (0) Stats.simulateBlockingWait(200); // 200ms delay
//         Stats.updateTextStatsThrottled();
//         Stats.stats.end();

//         // Step Rapier physics
//         if (Shared.physWorld) {

//             Shared.physWorld.step();
//             Shared.rapierDebug.update();

//         }

//     }

//     executeLastActionsBeforeLoop();

//     //clear the onpress/onrelease actions now that they have been sampled 
//     //in that loop to avoid resampling
//     Shared.releaseSingleEventActions();

//     editorId = requestAnimationFrame(editorLoop); //call animate recursively on next frame 

// }


// function render_gizmo() {
//     if (1) {
//         // 1. Render main scene
//         Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);
//         Shared.renderer.clear();
//         Shared.renderer.render(Shared.scene, Shared.camera);
//         // console.log("draw calls main scene", renderer.info.render.calls);
//         Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;

//         // 2. Render mini viewport (e.g., bottom-left corner)
//         const vpSize = 100;
//         Shared.renderer.setViewport(10, 10, vpSize, vpSize);
//         Shared.renderer.setScissor(10, 10, vpSize, vpSize);
//         Shared.renderer.setScissorTest(true);
//         Shared.renderer.clearDepth();
//         Shared.renderer.render(axesScene, axesCamera);
//         // console.log("draw calls mini viewport", renderer.info.render.calls);
//         Stats.renderStats.drawcalls += Shared.renderer.info.render.calls;

//         // 3. Reset to full Shared.canvas
//         Shared.renderer.setScissorTest(false);

//         //To sync the mini gizmo with your main camera orientation:
//         const worldQuat = new THREE.Quaternion();
//         Shared.camera.getWorldQuaternion(worldQuat);
//         axesHelper.quaternion.copy(worldQuat).invert();

//     } else {
//         Shared.renderer.render(Shared.scene, Shared.camera);
//         // console.log("draw calls main scene", renderer.info.render.calls);
//         Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
//         Shared.renderer.info.reset(); //it auto resets normally
//     }
// }

// /*---------------------------------*/
// // createScene
// /*---------------------------------*/
// function createScene() {

//     //miniscene
//     axesCamera.up = Shared.camera.up;
//     axesCamera.position.set(0, 0, 5);
//     axesScene.add(axesHelper);

//     //helper grid
//     grid = new THREE.GridHelper(Shared.gridSize, Shared.gridDivisions);
//     grid.name = "GridHelper";
//     Shared.scene.add(grid);

//     //helper gizmo
//     axes = new THREE.AxesHelper(3); // size
//     axes.name = "AxesHelper";
//     Shared.scene.add(axes);

//     Shared.scene.add(Shared.ambientLight);
// }

// /*---------------------------------*/
// // initializeScene
// /*---------------------------------*/
// function initializeScene() {

//     //reset pause
//     // Shared.editorState.pause = true;
//     Shared.setPause(true);

//     //clear all game actions
//     Actions = {};

//     //reset message
//     GameHUD.setMessageScreen("");
// }

// function toggleGameMode() {
//     Shared.toggleGameMode();
// }

// function toggleHideCollider() {
//     Shared.colliderDebugGroup.visible = !Shared.colliderDebugGroup.visible;
// }
