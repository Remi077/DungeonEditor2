// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import * as SkeletonUtils from 'SkeletonUtils';

import * as RAPIER from 'rapier';

import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from '../game/gameHUD.js';

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
    if (Actions.saveLevel) saveLevel();
    if (Actions.loadLevel) loadLevel();
    if (Actions.loadTest) loadTest(Shared.scene);
    if (Actions.resetLevel) resetLevel();


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

/*---------------------------------*/
// resetLevel
/*---------------------------------*/
export function resetLevel() {
    Shared.editorState.renderOneFrame = true;//simply update once the Shared.canvas
}

///LOAD SAVE

/*---------------------------------*/
// loadLevel
/*---------------------------------*/
export async function loadLevel() {
    const file = await new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.onchange = (event) => {
            const file = event.target.files[0];
            resolve(file);  // pass file back to the promise
        };

        input.click(); // opens the file dialog
    });

    if (!file) return;

    const json = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });

    //we want to update progression bar at the same time as loading
    //so this function and the parent function needs to be asynchronous
    //so stuff can happen in parallel instead of blocking the main thread
    // await loadPlanesIntoScene(json);
}

export async function loadTest(scene) {
    try {
        const response = await fetch('./assets/glb/Level0.glb');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const gltf = await loadLevelGlb(arrayBuffer);

        const staticArray = [];
        const weaponArray = [];
        const actionnablesArray = [];
        const lightsArray = [];
        const enemyArray = [];
        const rigArray = [];

        gltf.scene.children.forEach((child) => {

            if (child.isLight) {
                lightsArray.push(child);
            }

            if (child.name.startsWith("Collider_")) {
                //Collider -> do nothing
            } else if (child.name.startsWith("Action_")) {
                //Actionnable
                let exitLoop = false;
                for (const name of Shared.actionnableNames) {
                    if (child.name.startsWith("Action_" + name)) {
                        actionnablesArray.push(child);
                        child.traverse((childofchild) => {
                            childofchild.userData.type = "actionnable";
                            if (child != childofchild)
                                childofchild.userData.actionnableParent = child;
                        }
                        );
                        exitLoop = true;
                        child.userData["actionnableData"] = Shared.actionnableUserData[name];
                        break; // exit the name loop
                    }
                }
                if (exitLoop) return; // exit current traverse iteration

            } else if (child.name.startsWith("Enemy")) {
                enemyArray.push(child);
                child.userData.type = "enemy";
                child.userData["actionnableData"] = Shared.actionnableUserData["enemy"];
            } else if (child.name.startsWith("Armature")) {

                let isPlayer=child.name.startsWith("Armature_Player"); 
                const movementState = isPlayer ? Shared.playerMovementState : Shared.EnemyTemplateMovementState;

                movementState.root = child;//TEMP

                child.traverse(obj => {
                    if (obj.isSkinnedMesh) {
                        movementState.skeleton = obj.skeleton;//TEMP
                        // movementState.weaponBone = obj.skeleton.getBoneByName(Shared.WEAPON_BONE_NAME);;//TEMP
                        movementState.weaponBone = getBoneByPrefix(obj.skeleton,Shared.WEAPON_BONE_NAME);;//TEMP
                        if (!movementState.weaponBone && isPlayer) throw new Error("weapon bone not defined");
                        if (obj.name.startsWith("weapon")) {
                            //do this only for sword, body can be frustrum culled
                            obj.frustumCulled = false; //this prevents sword in first person view to be culled when camera tilts and get too close
                            weaponArray.push(obj);
                        }
                    }
                });
                if (!movementState.weaponBone && isPlayer) throw new Error("weapon bone not defined");

                //create mixer on the armature root
                const mixer = new THREE.AnimationMixer(child)
                movementState.mixer = mixer;
                rigArray.push(child);

                // extract animations
                gltf.animations.forEach(clip => {
                    if (clip.name.startsWith(child.name)) {
                        const match = clip.name.match(new RegExp(`${child.name}_(.*)$`));
                        const newClipName = match ? match[1] : null;
                        movementState.actionClips.set(newClipName,mixer.clipAction(clip));
                        if (newClipName === Shared.ANIM_WALK_NAME) {
                            const walkLowerClip = Shared.makePartialClip(clip, Shared.lowerBodyBones);
                            movementState.actionClips.set(Shared.ANIM_WALK_NAME_L,mixer.clipAction(walkLowerClip));
                        }
                    }
                });

            } else {
                staticArray.push(child);
            }

        });

        // Now safely add to your scene
        actionnablesArray.forEach(mesh => Shared.actionnablesGroup.add(mesh));
        staticArray.forEach(mesh => Shared.staticGroup.add(mesh));
        lightsArray.forEach(light => Shared.lightGroup.add(light));
        enemyArray.forEach(ene => Shared.enemyGroup.add(ene));
        rigArray.forEach(rig => Shared.rigGroup.add(rig));
        scene.add(Shared.staticGroup);
        scene.add(Shared.actionnablesGroup);
        scene.add(Shared.lightGroup);
        scene.add(Shared.enemyGroup);
        scene.add(Shared.rigGroup);


        //enable shadows
        if (Shared.shadowEnabled) {
            scene.traverse((obj) => {
                if (obj.isLight) {
                    if (obj.isDirectionalLight || obj.isSpotLight || obj.isPointLight) {
                        obj.castShadow = true; // enable shadow casting
                        obj.shadow.bias = -0.0001;
                        obj.shadow.mapSize.width = 2048;
                        obj.shadow.mapSize.height = 2048;
                    }
                }

                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
        }

        // Now process colliders
        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;

            if (child.name.startsWith("Collider_")) {

                //local transforms of the object as exported from Blender, relative to its parent (or the world if it has no parent).
                const childquaternion = child.quaternion.clone();
                const childposition = child.position.clone();
                const childscale = child.scale.clone();

                // Compute bounding box and scale
                child.geometry.computeBoundingBox();
                const bbox = child.geometry.boundingBox.clone();
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const center = new THREE.Vector3(); //center of the mesh boundind box in object space
                bbox.getCenter(center);
                size.multiply(childscale);

                // Half extents for cuboid
                const halfExtents = {
                    x: size.x * 0.5,
                    y: size.y * 0.5,
                    z: size.z * 0.5,
                };

                const colliderDesc = RAPIER.ColliderDesc.cuboid(
                    halfExtents.x,
                    halfExtents.y,
                    halfExtents.z
                )

                //at this point its just a cuboid computed from object BB in local space
                //with 0 rotation and offset

                //rotate bbox center with the object rotation
                const rotatedCenter = center.clone().applyQuaternion(childquaternion.clone());
                const newCenterPosition = rotatedCenter.clone();
                newCenterPosition.x += childposition.x;
                newCenterPosition.y += childposition.y;
                newCenterPosition.z += childposition.z;

                let bodyHandle = null; // null is default for static collider

                //kinematic collider
                if (child.name.startsWith("Collider_Kine_")) {

                    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
                        .setTranslation(newCenterPosition.x, newCenterPosition.y, newCenterPosition.z)
                        .setRotation(childquaternion); // must be a RAPIER.Quaternion
                    bodyHandle = Shared.physWorld.createRigidBody(bodyDesc);
                    bodyHandle.userData = { name: "Body_" + child.name };

                    //add corresponding mesh offset
                    // const relatedName = child.name.substring(child.name.lastIndexOf("_") + 1);
                    const [, relatedName] = child.name.match(/Collider_Kine_(.*)$/);
                    const relatedMesh = Shared.scene.getObjectByName(relatedName)
                    const p = relatedMesh.getWorldPosition(new THREE.Vector3());
                    const q = relatedMesh.getWorldQuaternion(new THREE.Quaternion());
                    // const offsetRootToBody = newCenterPosition.clone().sub(relatedMesh.position)
                    const offsetRootToBody = newCenterPosition.clone().sub(p)
                    bodyHandle.userData = { 
                        name: (child.name+"_body"),
                        offsetRootToBody: offsetRootToBody,
                        colliderDesc:colliderDesc,
                    };


                    //static collider
                } else {

                    // Create Rapier cuboid collider (static if no body)
                    colliderDesc
                        .setTranslation(newCenterPosition.x, newCenterPosition.y, newCenterPosition.z)
                        .setRotation(childquaternion)

                }

                //collision groups
                if (child.name.startsWith("Collider_Kine_weapon")) {
                    colliderDesc.setCollisionGroups(Shared.COL_MASKS.PLAYERWPN)
                } else {
                    colliderDesc.setCollisionGroups(Shared.COL_MASKS.SCENERY)
                }

                const colliderHandle = Shared.physWorld.createCollider(colliderDesc, bodyHandle);

                colliderHandle.userData = { name: child.name };
                Shared.colliderNameMap.set(child.name, colliderHandle);
                Shared.BodyNameMap.set(child.name, bodyHandle);

            }
        });

    } catch (err) {
        console.error("Failed to load GLB:", err);
    }
}

function getBoneByPrefix(skeleton, prefix) {
  return skeleton.bones.find(bone => bone.name.startsWith(prefix)) || null;
}


/*---------------------------------*/
// updateLoadProgression
/*---------------------------------*/
function updateLoadProgression(ratio) {
    const percent = Math.floor(ratio * 100);
    Shared.LoadBtnTxt.textContent = `Loading... ${percent}%`;

    Shared.LoadBtnProgress.style.width = (ratio * 100) + '%';

    if (ratio >= 1) {
        // Wait 1 second then reset button
        setTimeout(() => {
            Shared.LoadBtnProgress.style.width = '0%';
            Shared.LoadBtnTxt.textContent = 'Load Planes (L)';
        }, 1000); // 1000ms = 1 second

    }
}

/*---------------------------------*/
// saveLevel
/*---------------------------------*/
export function saveLevel() {
    const mergedData = {};
    let json = JSON.stringify(mergedData, null, 2);

    console.log(json);
    downloadJson(json, "grouped_planes.json");
}

/*---------------------------------*/
// saveFile helper
/*---------------------------------*/
async function saveFile(blob, suggestedName, mimeType) {
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: mimeType,
                        accept: { [mimeType]: [`.${suggestedName.split('.').pop()}`] }
                    }
                ]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            console.warn("Save cancelled or failed:", err);
            return; // don’t fallback if the user cancels
        }
    }

    // Fallback for browsers without FS API
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = suggestedName;
    link.click();
    URL.revokeObjectURL(url);
}

/*---------------------------------*/
// downloadJson (refactored)
/*---------------------------------*/
async function downloadJson(data, filename = "data.json") {
    const blob = new Blob([data], { type: "application/json" });
    await saveFile(blob, filename, "application/json");
}

function toggleGameMode() {
    Shared.toggleGameMode();
}

function toggleHideCollider() {
    Shared.colliderDebugGroup.visible = !Shared.colliderDebugGroup.visible;
}

/*---------------------------------*/
// loadLevelGlb
/*---------------------------------*/
async function loadLevelGlb(arrayBuffer) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.parse(arrayBuffer, '', (gltf) => {
            // gltf.scene is your loaded model
            console.log('GLB loaded:', gltf.scene);
            resolve(gltf);
        }, (error) => {
            reject(error);
        });
    });
}