// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import * as SkeletonUtils from 'SkeletonUtils';

import * as RAPIER from 'rapier';

import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from '../game/gameHUD.js';
import * as loadSave from './loadSave.js';

/*-----------------------------------------------------*/
// EDITOR CONSTANTS
/*-----------------------------------------------------*/

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/

let editorId = null;
export let Actions = {};

/*-----------------------------------------------------*/
// EDITOR ACTIONS TO KEY MAPPING AND REVERSE
/*-----------------------------------------------------*/
export let ActionToKeyMap = {
    moveCamUp: { key: 'ShiftLeft' },
    moveCamDown: { key: 'Space' },
    moveCamRight: { key: 'KeyD' },
    moveCamLeft: { key: 'KeyA' },
    moveCamFront: { key: 'KeyW' },
    moveCamBack: { key: 'KeyS' },
    rotLeft: { key: 'KeyQ', OnPress: true },
    rotRight: { key: 'KeyE', OnPress: true },
    saveLevel: { key: 'Ctrl+KeyS', OnPress: true },
    loadLevel: { key: 'Ctrl+KeyL', OnPress: true },
    resetLevel: { key: 'Ctrl+KeyR', OnPress: true },
    loadTest: { key: 'KeyM', OnPress: true },
    startGame: { key: 'KeyG', OnPress: true },
    hideCol: { key: 'KeyH', OnPress: true },
};

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
let grid;
// let gridtwo;
let axes;

//raycaster
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)

// Mini scene for axis helper
const axesScene = new THREE.Scene();
axesScene.background = new THREE.Color(0x000000);
const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
const axesHelper = new THREE.AxesHelper(2);

// camera holder: FPS-style rotation system
// pitch
Shared.pitchObject.name = "pitchObject";
Shared.pitchObject.add(Shared.camera);

// yaw
Shared.yawObject.name = "yawObject";
Shared.yawObject.add(Shared.pitchObject);
const pointLight = new THREE.PointLight(new THREE.Vector3(0, 0, 0), 1, 100);
Shared.yawObject.add(pointLight);
Shared.scene.add(Shared.yawObject);

Shared.resetCamera();

// renderer
Shared.renderer.setClearColor(0x000000, 0); // transparent background
Shared.scene.background = new THREE.Color(0x000000);
Shared.renderer.setSize(Shared.container.clientWidth, Shared.container.clientHeight);

Shared.renderer.shadowMap.enabled = true;
Shared.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // smoother shadows                            // important

/*---------------------------------*/
// setupEditor
/*---------------------------------*/
let scene;
export function setupEditor() {

    //setup local references to be able to watch them
    //in debugger
    scene = Shared.scene;

    /*-----------------------------*/
    // In Three.js, the coordinate system is a right-handed Cartesian system, and the axes are organized like this:
    //       Y+ (up) (green)
    //        |
    //        |
    //        |_____ X+ (right) (red)
    //       /
    //      /
    //    Z+ (toward you) (blue)
    /*-----------------------------*/

    // create the scene
    createScene();

    //initialize scene
    initializeScene();

    // Reset the clock to start from 0
    Shared.clock.start();

}

/*---------------------------------*/
// startEditorLoop
/*---------------------------------*/
export function startEditorLoop() {
    Shared.editorState.editorRunning = true;
    editorId = requestAnimationFrame(editorLoop);

    //grid
    grid.visible = true;
    axes.visible = true;

    //lights
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTEDITCOLOR);

    document.addEventListener("mousedown", onMouseClick, false);
    document.addEventListener("mouseup", onMouseUp, false);
    // document.addEventListener("wheel", onMouseWheel, { passive: false });
}

/*---------------------------------*/
// stopEditorLoop
/*---------------------------------*/
export function stopEditorLoop() {
    Shared.editorState.editorRunning = false;

    cancelAnimationFrame(editorId);

    //grid
    grid.visible = false;
    axes.visible = false;

    document.removeEventListener("mousedown", onMouseClick, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    // document.removeEventListener("wheel", onMouseWheel, { passive: false });

    Stats.stats.end();
}

/*---------------------------------*/
// onMouseClick
/*---------------------------------*/
function onMouseClick(event) {

    if (!Shared.editorState.editorRunning || !Shared.getIsMouseOverCanvas()) return;

    if (event.button == 0) {

        Shared.editorState.hasClicked  = true;
        Shared.editorState.mouseIsDown = true;

     }

    //right click
    // if (event.button == 2){
    // }

}

/*---------------------------------*/
// onMouseUp
/*---------------------------------*/
function onMouseUp(event) {

    if (!Shared.editorState.editorRunning || !Shared.getIsMouseOverCanvas()) return;

    if (event.button == 0) {

        Shared.editorState.mouseIsDown = false;

    }

}

/*---------------------------------*/
// executeUnpausableActions
/*---------------------------------*/
function executeUnpausableActions(delta) {
    // Create a local movement vector based on input
    // console.log("executeUnpausableActions",Actions.moveCamUp);
    const moveVector = new THREE.Vector3();
    const moveCam = Shared.moveSpeed * delta;
    if (Actions.moveCamUp) moveVector.y += 1;
    if (Actions.moveCamDown) moveVector.y -= 1;
    if (Actions.moveCamLeft) moveVector.x -= 1;
    if (Actions.moveCamRight) moveVector.x += 1;
    if (Actions.moveCamFront) moveVector.z -= 1;
    if (Actions.moveCamBack) moveVector.z += 1;
    if (Actions.hideCol) toggleHideCollider();
    if (Actions.saveLevel) loadSave.saveLevel();
    if (Actions.loadLevel) loadSave.loadLevel();
    if (Actions.loadTest) loadSave.loadTest(Shared.scene);
    if (Actions.resetLevel) loadSave.resetLevel();


    // camera.lookAt(chara);

    moveVector.normalize();
    moveVector.applyEuler(new THREE.Euler(0, Shared.yawObject.rotation.y, 0));
    Shared.yawObject.position.addScaledVector(moveVector, moveCam);

    if (Actions.pause) Shared.doPause();
}

function executeLastActionsBeforeLoop() {
    if (Actions.startGame) toggleGameMode();
}

/*---------------------------------*/
// editorLoop
/*---------------------------------*/

function editorLoop(now) {

    if (!Shared.editorState.editorRunning) return;

    //fps counter
    Stats.stats.begin();

    const deltaTime = Shared.clock.getDelta(); // Time elapsed since last frame
    GameHUD.drawHUD();

    if (Shared.getIsMouseOverCanvas()) {

        executeUnpausableActions(deltaTime);

        //clear that flag
        Shared.editorState.renderOneFrame = false;

        //RENDER GIZMO HELPER in BOTTOM LEFT CORNER
        //TODO: main renderer is in there too
        //move before the end of loop?
        render_gizmo();

        // Simulate heavy computation
        if (0) Stats.simulateBlockingWait(200); // 200ms delay
        Stats.updateTextStatsThrottled();
        Stats.stats.end();

        // Step Rapier physics
        if (Shared.physWorld) {

            Shared.physWorld.step();
            Shared.rapierDebug.update();

        }

    }

    executeLastActionsBeforeLoop();

    //clear the onpress/onrelease actions now that they have been sampled 
    //in that loop to avoid resampling
    Shared.releaseSingleEventActions();

    editorId = requestAnimationFrame(editorLoop); //call animate recursively on next frame 

}


function render_gizmo() {
    if (1) {
        // 1. Render main scene
        Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);
        Shared.renderer.clear();
        Shared.renderer.render(Shared.scene, Shared.camera);
        // console.log("draw calls main scene", renderer.info.render.calls);
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;

        // 2. Render mini viewport (e.g., bottom-left corner)
        const vpSize = 100;
        Shared.renderer.setViewport(10, 10, vpSize, vpSize);
        Shared.renderer.setScissor(10, 10, vpSize, vpSize);
        Shared.renderer.setScissorTest(true);
        Shared.renderer.clearDepth();
        Shared.renderer.render(axesScene, axesCamera);
        // console.log("draw calls mini viewport", renderer.info.render.calls);
        Stats.renderStats.drawcalls += Shared.renderer.info.render.calls;

        // 3. Reset to full Shared.canvas
        Shared.renderer.setScissorTest(false);

        //To sync the mini gizmo with your main camera orientation:
        const worldQuat = new THREE.Quaternion();
        Shared.camera.getWorldQuaternion(worldQuat);
        axesHelper.quaternion.copy(worldQuat).invert();

    } else {
        Shared.renderer.render(Shared.scene, Shared.camera);
        // console.log("draw calls main scene", renderer.info.render.calls);
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
        Shared.renderer.info.reset(); //it auto resets normally
    }
}

/*---------------------------------*/
// createScene
/*---------------------------------*/
function createScene() {

    //miniscene
    axesCamera.up = Shared.camera.up;
    axesCamera.position.set(0, 0, 5);
    axesScene.add(axesHelper);

    //helper grid
    grid = new THREE.GridHelper(Shared.gridSize, Shared.gridDivisions);
    grid.name = "GridHelper";
    Shared.scene.add(grid);

    //helper gizmo
    axes = new THREE.AxesHelper(3); // size
    axes.name = "AxesHelper";
    Shared.scene.add(axes);

    Shared.scene.add(Shared.ambientLight);
}

/*---------------------------------*/
// initializeScene
/*---------------------------------*/
function initializeScene() {

    //reset pause
    // Shared.editorState.pause = true;
    Shared.setPause(true);

    //clear all game actions
    Actions = {};

    //reset message
    GameHUD.setMessageScreen("");
}

function toggleGameMode() {
    Shared.toggleGameMode();
}

function toggleHideCollider() {
    Shared.colliderDebugGroup.visible = !Shared.colliderDebugGroup.visible;
}
