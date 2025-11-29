// @ts-nocheck
import * as THREE from 'three';
import * as RAPIER from 'rapier';
import * as SkeletonUtils from 'SkeletonUtils';
import seedrandom from 'seedrandom';
//OTHER IMPORTS FORBIDDEN! CIRCULAR DEPENDENCIES

/*-------------------------*/
// GRID AND CELL DIMENSION //
/*-------------------------*/
export const gridSize = 100;
export const gridDivisions = 100;
export const cellSize = gridSize / gridDivisions; //TODO: when not 1 this will break (myfunction load atlas planes are 1,1)
if (cellSize != 1) {
    throw new Error("cellsize", cellSize, "different from 1, this is not supported currently");
}

/*-----------------------------------------------------*/
// PSEUDO RANDOMNESS
/*-----------------------------------------------------*/
// pseudoseed
export let rng = seedrandom(); // Create a seeded random generator

// Reset RNG with a new seed
export function setSeed(newSeed) {
    rng = seedrandom(newSeed);
}

// Function to generate a random float position between min and max using rng()
export function getRandom(min, max) {
    return rng() * (max - min) + min;
}

// Random int in [min, max] inclusive
export function getRandomInt(min, max) {
    return Math.floor(getRandom(min, max + 1));
}

export function branchChance(p) {
    return getRandomInt(0, 100) < p * 100;
}

/*------------------*/
// CANVAS VARIABLES //
/*------------------*/
export const canvas = document.getElementById('three-canvas');
export const container = document.getElementById('canvas-container');
export const uipanel = document.getElementById('ui-panel');

export const matpopup = document.getElementById("matpopup");
export const meshpopup = document.getElementById("meshpopup");
export const mazewallpopup = document.getElementById("mazewallpopup");
export const mazefloorpopup = document.getElementById("mazefloorpopup");

export const matpopupCanvas = document.getElementById("matpopupCanvas");
export const meshpopupCanvas = document.getElementById("meshpopupCanvas");
export const mazewallpopupCanvas = document.getElementById("mazewallpopupCanvas");
export const mazefloorpopupCanvas = document.getElementById("mazefloorpopupCanvas");

/*-------------------------*/
// SCENE, CAMERA, RENDERER //
/*-------------------------*/
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
    75,
    // 90,
    container.clientWidth / container.clientHeight,
    0.1, //near plane
    1000 //far plane
);
export const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
});

/*-------*/
// CLOCK //
/*-------*/
export const clock = new THREE.Clock();

/*-------------------------*/
// LIGHTS VARIABLES        //
/*-------------------------*/
// ambient light in editor and game mode
export const AMBIENTLIGHTEDITCOLOR = new THREE.Color(1, 1, 1).multiplyScalar(0.45);
// export const AMBIENTLIGHTGAMECOLOR = new THREE.Color(0.5, 0.5, 1).multiplyScalar(0.30);
export const AMBIENTLIGHTGAMECOLOR = new THREE.Color(0.5, 0.5, 1).multiplyScalar(1);
export let ambientLight = new THREE.AmbientLight(AMBIENTLIGHTEDITCOLOR); // Soft light;

/*------------------*/
// SHADOW VARIABLES //
/*------------------*/
export const shadowEnabled = false;
if (shadowEnabled) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // smoother shadows                            // important
}

/*---------------------------------*/
// NAVMESH VARIABLES
/*---------------------------------*/
export let navmesh = null;
export function setNavMesh(n){ navmesh = n; }
export let pathfinder = null;
export function setPathFinder(p){pathfinder = p;}
export const calculatePathPeriod = 1.5;


/*---------------------------------*/
// PHYSICS VARIABLES
/*---------------------------------*/
// speeds
export const moveSpeed = 5;
/*-----------------------------*/
// jump variables
//
// max height
// kinetic e = potential e
// (1/2)mv^2=mgh
// v=sqrt(2gh)
/*-----------------------------*/
export const gravity = 9.81;
export const maxJumpHeight = 1;
export const jumpSpeed = Math.sqrt(2 * gravity * maxJumpHeight);
export const maxFallSpeed = 50; // meters per second, adjust as needed
// max slope in degrees you want to treat as "floor"
export const maxSlopeDeg = 55;
export const maxSlopeRad = THREE.MathUtils.degToRad(maxSlopeDeg);
// vertical threshold = cosine of slope
export const verticalThreshold = Math.cos(maxSlopeRad);
export const contactThreshold = 0.05; //when capsule is closer than this distance to ground or ceiling we consider it a collision 
export const skin = 0.02; //after a collision we snap the capsule bottom/up to the ground/ceiling and we nudge outward by skin distance to avoid penetration
// Player physical and camera setup
export const playerHeight = 1.8; // total player height in meters
// export const cameraHeight = 1.3; // desired camera (eye) height above the floor
export const cameraHeight = 1.5; // desired camera (eye) height above the floor
export const playerRadius = 0.4; // radius of the capsule collider
// Distance from capsule center (which is halfway up the capsule) to the camera position.
// Needed because Rapier places the capsule's origin at its center, not at the feet.
export const cameraHeightFromCapsuleCenter = cameraHeight - playerHeight / 2;
// Half-height of the *cylindrical part* of the capsule.
// The capsule’s total height = 2 * halfHeight + 2 * radius = playerHeight
// halfHeight is a bit misleading because it’s not half of the total capsule height, it’s half of the cylindrical part only
export const halfHeight = (playerHeight / 2) - playerRadius;
// camera initial offset position
export const cameraOffsetX = 2;
export const cameraOffsetZ = 2;
// export const cameraOffsetY = 1.3 + 0.1; //see camera height in game.js
export const cameraOffsetY = cameraHeight+0.1; //see camera height in game.js

/*----------------------*/
// ANIMATIONS VARIABLES //
/*----------------------*/
export const upperBodyBones = [
    'mixamorigSpine',
    'mixamorigSpine1',
    'mixamorigSpine2',
    'mixamorigNeck',
    'mixamorigHead',
    // 'mixamorigRightArm', 
    'mixamorigLeftArm'];
export const lowerBodyBones = [//define bone whitelist for an animation
    'mixamorigHips',
    'mixamorigRightUpLeg',
    'mixamorigRightLeg',
    'mixamorigRightFoot',
    'mixamorigLeftUpLeg',
    'mixamorigLeftLeg',
    'mixamorigLeftFoot',
    'mixamorigRightArm',  //for walk cycle, weapon is in left hand so leave right arm go with walk
];
export const ANIM_ATTACK_NAME = "Attack";
export const ANIM_WALK_NAME = "Walk";
export const ANIM_WALK_NAME_L = "Walk_Lower";
export const WEAPON_BONE_NAME = "mixamorigLeftHand";
export const SWORD_NAME = "weapon_sword";
export function makePartialClip(clip, boneNames) {
    const filteredTracks = clip.tracks.filter(track => {
        return boneNames.some(name => track.name.startsWith(name));
    });
    return new THREE.AnimationClip(clip.name + '_partial', clip.duration, filteredTracks);
}
export const clipActions = new Map();

// MIXERS
export const activeMixers = new Set();
export const inactiveMixers = new Set();
export function activateMixer(mixer, single=false) {
    if (!single) mixer._isActive = true;
    else mixer._isSingleActive = true;
    inactiveMixers.delete(mixer);
    activeMixers.add(mixer);
}

export function deactivateMixer(mixer, single=false) {
    if (!single) mixer._isActive = false;
    else mixer._isSingleActive = false;
    if (mixer._isActive || mixer._isSingleActive) return;
    activeMixers.delete(mixer);
    inactiveMixers.add(mixer);
}


//name->characterState
export const characterStateNameMap = new Map();

export function registerCharacter(name,copy){
    if (characterStateNameMap.has(name)) throw new Error(name + " has duplicate characterState");
    characterStateNameMap.set(name,copy);
}


const characterStateProto = {
    clone(
        name,
        spawnPos = null, 
        spawnRot = null,
    ) {
        const copy = newcharacterState(name);
        //name        
        copy.name = name || this.name;
        //main mesh/armature root
        copy.root = SkeletonUtils.clone(this.root); // Clone skinned mesh + skeleton

        //uniquify material here?
        copy.root.traverse(
            (obj)=>{
                if (obj.isSkinnedMesh){
                    const materialClone = obj.material.clone();
                    obj.material = materialClone;
                }
            }
        )

        copy.root.userData.name = name || this.name;
        // copy.root.userData.characterState = copy;//circular dependency if we try to stringify this
        //position+rotation
        if (spawnPos) {
            copy.root.position.set(spawnPos.x,spawnPos.y,spawnPos.z);
            copy.curPos = spawnPos.clone();
            copy.newPos = spawnPos.clone();
        } else {
            copy.curPos = this.curPos;
            copy.newPos = this.newPos;
        }
        if (spawnRot) {
            copy.rotation.copy(spawnRot);
        } else {
            copy.rotation.copy(this.rotation);
        }
        //rapier collision
        copy.bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        if (spawnPos) copy.bodyDesc.setTranslation(spawnPos.x, spawnPos.y, spawnPos.z);
        if (spawnRot) copy.bodyDesc.setRotation(spawnRot);

        copy.capsuleTotalHeight = this.capsuleTotalHeight;
        copy.capsuleRadius = this.capsuleRadius;
        copy.capsuleCylinderhalfHeight = this.capsuleCylinderhalfHeight;
        copy.body = createRigidBodyCustom(copy.bodyDesc,name);
        copy.colliderDesc = this.colliderDesc; //can be safely shared
        copy.collider = createColliderCustom(copy.colliderDesc, copy.body,name);
        copy.collider.userData.characterState = copy;
        copy.collisionmask = this.collisionmask;
        copy.kcc = cloneKCC(this.kcc, physWorld, skin);
        copy.offsetRootToBody = this.offsetRootToBody;
        //physics
        copy.verticalSpeed = this.verticalSpeed;
        copy.jumpPressed = this.jumpPressed;
        copy.isTouchingGround = this.isTouchingGround;
        copy.isTouchingCeiling = this.isTouchingCeiling;
        copy.moveVector.copy(this.moveVector);
        copy.moveSpeed = this.moveSpeed;
        //animation
        copy.skeleton = copy.root.skeleton;
        copy.weaponBone = copy.root.getObjectByName(this.weaponBone.name);
        copy.headBone = copy.root.getObjectByName("mixamorigHead");//TODO: use variable instead of hardcoding this here
        copy.mixer = new THREE.AnimationMixer(copy.root); // one new mixer per character
        for (const [k, v] of this.animationClips) {
            copy.animationClips.set(k, v);
            copy.animationActions.set(k, copy.mixer.clipAction(v));
        } // shallow copy of clips (clips are immutable)
        copy.currentAction = this.currentAction;
        //navmesh
        // copy timeSinceLastCalculatedPath = 0;
        //weapon
        copy.weapon = getObjectByPrefix(copy.root,"weapon");
        copy.weaponBodyDesc = structuredClone(this.weaponBodyDesc);
        // const t = this.weaponBodyDesc.translation();
        // const q = this.weaponBodyDesc.rotation();
        // copy.weaponBodyDesc.setTranslation(t.x+spawnPos.x,t.y+spawnPos.y,t.z+spawnPos.z);
        copy.weaponBody = createRigidBodyCustom(copy.weaponBodyDesc,copy.weapon.name);
        copy.weaponColliderDesc = this.weaponColliderDesc //can be safely shared
        copy.weaponCollider = createColliderCustom(copy.weaponColliderDesc, copy.weaponBody,copy.weapon.name);
        copy.weaponOffsetRootToBody = this.weaponOffsetRootToBody;
        copy.weaponCollider.userData.characterState = copy;
        //gameplay
        copy.health = this.health;
        copy.maxHealth = this.maxHealth;
        copy.inventory = { ...this.inventory };
        // copy.healthBar = this.healthBar.clone();
        copy.healthBar = copy.root.getObjectByName("healthbar");
        copy.healthBar.healthForeground = copy.healthBar.children[1];
        copy.healthBar.fullWidth = this.healthBar.fullWidth;
        //attack
        copy.attackDamageStart = this.attackDamageStart;
        copy.attackDamageEnd   = this.attackDamageEnd;
        //misc
        copy.tweakRot = this.tweakRot;
        copy.tweakPos = this.tweakPos;

        return copy;
    }
};

function getObjectByPrefix(root, prefix) {
    let result = null;
    root.traverse(obj => {
        if (!result && typeof obj.name === "string" && obj.name.startsWith(prefix)) {
            result = obj;
        }
    });
    return result;
}

function cloneKCC(templateKCC, physWorld, skin) {
    // 1️⃣ Create a new KCC instance
    const kcc = physWorld.createCharacterController(skin);

    // 2️⃣ Copy configuration from the template
    kcc.setMaxSlopeClimbAngle(templateKCC.maxSlopeClimbAngle());
    kcc.setMinSlopeSlideAngle(templateKCC.minSlopeSlideAngle());

    // 3️⃣ Copy autostep settings
    // const autostep = templateKCC.getAutostepSettings(); // pseudo-method
    kcc.enableAutostep(
        templateKCC.autostepMaxHeight(),
        templateKCC.autostepMinWidth(),
        templateKCC.autostepIncludesDynamicBodies());

    // 4️⃣ Copy snap-to-ground settings
    // const snap = templateKCC.getSnapSettings(); // pseudo-method
    kcc.enableSnapToGround(templateKCC.snapToGroundDistance());

    return kcc;
}

// COLLISION GROUPS
export const ENEMY_STATES = {
    IDLE: 1,
    PATROL: 2,
    CHASE: 3,
    SEARCH: 4,
    DEATH: 5
};

//THEBIGCLASS
export function newcharacterState(name) {
    const newObj = Object.create(characterStateProto);

    Object.assign(newObj, {
        //name
        name,
        isPlayer: false,
        //main mesh/armature root
        root: null,
        //position+rotation
        curPos: new THREE.Vector3(),
        newPos: new THREE.Vector3(),
        rotation: new THREE.Quaternion(),        
        //rapier collision
        capsuleTotalHeight: null,
        capsuleRadius: null,
        capsuleCylinderhalfHeight: null,
        bodyDesc: null,
        body: null,
        colliderDesc: null,
        collider: null,        
        collisionmask: null,
        kcc: null,
        offsetRootToBody: null,
        //physics
        verticalSpeed: 0,
        jumpPressed: false,
        isTouchingGround: false,
        isTouchingCeiling: false,
        moveVector: new THREE.Vector3(),
        moveSpeed: moveSpeed,
        isInWater: false,
        isAtSurface: false,
        //animation
        skeleton: null,
        weaponBone: null,
        headBone: null,
        mixer: null,
        animationClips: new Map(),
        animationActions: new Map(), //tied to mixer
        currentAction: null,
        //navmesh/AI
        //all agents start with a different offset so they dont recompute path at same time (spread the load/avoid cpu spikes)
        timeSinceLastCalculatedPath: Math.random() * calculatePathPeriod, 
        pathbuffer: null,
        lastKnownPlayerPosition: null,//store last frame player position, used to recalculate navigation path if changed
        lastSeenPlayerPosition: null,//store last seen player position by the enemy, used for AI
        //weapon
        weapon: null, 
        weaponBodyDesc: null,
        weaponBody: null,
        weaponColliderDesc: null,
        weaponCollider: null,
        weaponOffsetRootToBody: null,
        //gameplay
        health: 100,
        maxHealth: 100,
        inventory: {},
        invincibility: false,
        timeSinceLastHit: 0,
        hitRepulsionForce: new THREE.Vector3(),
        healthBar: null,
        timeSinceHealthBarShowedUp: 0,
        enemyState: ENEMY_STATES.IDLE,
        timeSinceChangedState: 0,
        patrolPath: [],
        timeSinceLastSightCheck: 0,
        playerSeen: false,
        timeSinceLastSeen: 0,
        // sightTarget: null,
        //attack
        isAttacking: false,
        attackLoopId: null,
        timeSinceStartAttack: null,
        attackDamageStart: 0,
        attackDamageEnd: null,//end of animation if null
        //misc
        tweakRot: null,
        tweakPos: null,
    });

    // console.log("NEW ENEMY timeSinceLastCalculatedPath",newObj.timeSinceLastCalculatedPath);

    // Seal AFTER prototype + properties exist
    Object.seal(newObj);

    registerCharacter(name,newObj);

    return newObj;
}

export const playerState = newcharacterState("playerState")
export const EnemyTemplateState = newcharacterState("EnemyTemplateState")

/*------------------------*/
// ACTIONNABLE VARIABLES //
/*------------------------*/
export const actionnableNames = ["Door", "Item", "Chest", "sword", "Herse", "Switch"];
export const actionnableUserData = {
    "Door": {
        action: openGenericDoor,
        isOpen: false
    },
    "Item": {
        action: takeItem,
    },
    "Chest": {
        action: openGenericDoor,
        isOpen: false
    },
    "Herse" : {
        action: openGenericDoor,
        isOpen: false        
    },
    "Switch": {
        action: useSwitch,
        isOpen: false
    }
}

/*------------------*/
// PRIMITIVE GROUPS //
/*------------------*/
export const staticGroup = new THREE.Group();
staticGroup.name = "staticGroup";
export const actionnablesGroup = new THREE.Group();
actionnablesGroup.name = "actionnablesGroup";
export const lightGroup = new THREE.Group();
lightGroup.name = "lightGroup";
export const enemySpawnGroup = new THREE.Group();
enemySpawnGroup.name = "enemySpawnGroup";
export const enemyGroup = new THREE.Group();
enemyGroup.name = "enemyGroup";
export const rigGroup = new THREE.Group();
rigGroup.name = "rigGroup";
export const colliderDebugGroup = new THREE.Group(); // collider debug group
colliderDebugGroup.name = "colliderDebugGroup";

/*------------------------------------------*/
// FPS VIEW CONTROL VARIABLE                //
// camera holder: FPS-style rotation system //
/*------------------------------------------*/
export const pitchObject = new THREE.Object3D(); // Up/down rotation (X axis)
export const yawObject = new THREE.Object3D();   // Left/right rotation (Y axis)

/*---------------------------------*/
// resetCamera
/*---------------------------------*/
export function resetCamera() {
    pitchObject.rotation.set(0, 0, 0);
    yawObject.position.set(cameraOffsetX, cameraOffsetY, cameraOffsetZ);
    yawObject.rotation.set(0, 0, 0);
}

/*------*/
// MISC //
/*------*/
//load progress, written by editor so cannot be in editorUI (dependent of editor)
export const LoadBtnTxt = document.getElementById('LoadBtnText'); //TOMOVE
export const LoadBtnProgress = document.getElementById('LoadBtnProgress'); //TOMOVE


/*-----------------------------------------------------*/
// MODE CONSTANTS
/*-----------------------------------------------------*/
// modes
export const MODEMENU = 0;
export const MODEEDITOR = 1;
export const MODEGAME = 2;
export const MODEGAMEOVER = 3;

// editor variables
export const editorState = {
    mode: MODEEDITOR,
    editorRunning: false,        //TODO: maybe make it one running variable only
    gameRunning: false,
    pause: true,
    renderOneFrame: true,
    hasClicked: false,
    mouseIsDown: false
};

/*---------------------------------------------------------*/
// proxies to editor/game loop
// set through setters by main.js to avoid circular dependencies
/*---------------------------------------------------------*/
let stopEditorLoop = null;
let startEditorLoop = null;
let startGameLoop = null;
let stopGameLoop = null;

export function setStartEditorLoop(startEditorLoopv) {
    startEditorLoop = startEditorLoopv;
}
export function setStopEditorLoop(stopEditorLoopv) {
    stopEditorLoop = stopEditorLoopv;
}
export function setStartGameLoop(startGameLoopv) {
    startGameLoop = startGameLoopv;
}
export function setStopGameLoop(EdistopGameLoopv) {
    stopGameLoop = EdistopGameLoopv;
}

export function setEditorActions(Actionsv) {
    EditorActions = Actionsv;
    EditorActions["name"] = "EditorActions";
}
export function setGameActions(Actionsv) {
    GameActions = Actionsv;
    GameActions["name"] = "GameActions";
}

export function setEditorActionsMap(ActionsMap) {
    editorActionToKeyMap = ActionsMap;
}
export function setGameActionsMap(ActionsMap) {
    gameActionToKeyMap = ActionsMap;
}

/*---------------------------------------------------------*/
// toggleGameMode
/*---------------------------------------------------------*/
export function toggleGameMode() {
    if (editorState.editorRunning) {
        setMode(MODEGAME);
    } else {
        setMode(MODEEDITOR);
    }
}

/*---------------------------------*/
// setMode
/*---------------------------------*/
export function setMode(mode) {
    switch (mode) {
        case MODEMENU:
            break;
        case MODEGAME:
            StartBtn.textContent = "Stop Game";
            stopEditorLoop();
            stopEditorUI();
            ActionToKeyMap = gameActionToKeyMap;
            Actions = GameActions;
            generateKeyToActionMaps();
            startGameLoop();
            startGameLoopUI();
            break;
        case MODEGAMEOVER:
            stopGameLoop();
            stopGameLoopUI();
            // ActionToKeyMap = {};
            // Actions = null;
            clearKeyToActionMaps();
            // startGameOverLoop();
            // startGameOverLoopUI();
            break;
        case MODEEDITOR:
            StartBtn.textContent = "Start Game (G)";
            stopGameLoop();
            stopGameLoopUI();
            ActionToKeyMap = editorActionToKeyMap;
            Actions = EditorActions;
            generateKeyToActionMaps();
            startEditorLoop();
            startEditorUI();
            editorState.renderOneFrame = true;
            break;
    }

    //update the UI
    const cevent = new CustomEvent("UIChange", {
        detail: { field: "gameModeChange", value: mode },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(cevent);
}

/*---------------------------------*/
// setMode
/*---------------------------------*/
let onMouseDown, onMouseUp;
function startEditorUI() {
    console.log("startEditorUI");

    // Lock on right mouse button down
    onMouseDown = (e) => {
        if (e.button === 2 && document.pointerLockElement !== canvas) {
            canvas.requestPointerLock();
            setRightMouseDown(true);
        }
    };
    canvas.addEventListener("mousedown", onMouseDown);

    // Unlock on right mouse button up
    onMouseUp = (e) => {
        if (e.button === 2 && document.pointerLockElement === canvas) {
            document.exitPointerLock();
            setRightMouseDown(false);
        }
    };
    document.addEventListener("mouseup", onMouseUp);

    document.addEventListener("mousemove", onMouseMoveEditor, false);

}

/*---------------------------------*/
// stopEditorUI
/*---------------------------------*/
function stopEditorUI() {
    if (onMouseDown) canvas.removeEventListener("mousedown", onMouseDown);
    if (onMouseUp) document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mousemove", onMouseMoveEditor, false);
}

/*---------------------------------*/
// startGameLoopUI
/*---------------------------------*/
function startGameLoopUI() {
    canvas.requestPointerLock();
    document.addEventListener("mousemove", onMouseMoveGame, false);
    canvas.addEventListener("mousedown", onMouseDown);
}

/*---------------------------------*/
// stopGameLoopUI
/*---------------------------------*/
function stopGameLoopUI() {
    document.exitPointerLock();
    document.removeEventListener("mousemove", onMouseMoveGame, false);
}

/*---------------------------------*/
// doPause
/*---------------------------------*/
export function doPause() {
    setPause(!editorState.pause);
}

/*---------------------------------*/
// setPause
/*---------------------------------*/
export function setPause(value) {
    console.log("Pause", value);
    editorState.pause = value;
}

/*---------------------------------*/
// ACTION VARIABLES
/*---------------------------------*/
const keys = {};
let Actions = null;
let EditorActions = null;
let GameActions = null;
let editorActionToKeyMap = null;//wired in main
let gameActionToKeyMap = null;//wired in main
let keyPressToActionMap = {};
let keyPressOnceToActionMap = {};
let keyReleaseToActionMap = {};
let ActionToKeyMap = null;//wired in main

/*---------------------------------*/
// generateKeyToActionMaps
// Reverse the mapping to get the action from the key (press or release)
/*---------------------------------*/
export function generateKeyToActionMaps() {
    keyPressToActionMap = {};
    keyPressOnceToActionMap = {};
    keyReleaseToActionMap = {};
    for (let Action in ActionToKeyMap) {
        let mapping = ActionToKeyMap[Action]
        if (mapping.OnRelease) {
            keyReleaseToActionMap[mapping.key] = Action;
        } else if (mapping.OnPress) {
            keyPressOnceToActionMap[mapping.key] = Action;
        } else {
            keyPressToActionMap[mapping.key] = Action;
        }
    }
}

/*---------------------------------*/
// clearKeyToActionMaps
/*---------------------------------*/
export function clearKeyToActionMaps(){
    keyPressToActionMap = {};
    keyPressOnceToActionMap = {};
    keyReleaseToActionMap = {};
}

/*---------------------------------*/
// onKeyDownEvent
/*---------------------------------*/
export function onKeyDownEvent(event) {

    let eventcode = event.code
    // Only prepend "Ctrl+" if the pressed key is NOT a modifier
    if ((event.ctrlKey || event.metaKey) &&
        event.code !== "ControlLeft" && event.code !== "ControlRight") {
        eventcode = "Ctrl+" + eventcode;
    }

    if (keyPressToActionMap[eventcode])   //if mapping exists
        Actions[keyPressToActionMap[eventcode]] = true;
    else if (keyPressOnceToActionMap[eventcode])
        Actions[keyPressOnceToActionMap[eventcode]] = !keys[eventcode];

    if (eventcode === "Tab"
        || eventcode === "Ctrl+KeyS"
        || eventcode === "Ctrl+KeyL"
        || eventcode === "Ctrl+KeyR"
        || eventcode === "Ctrl+KeyA"
    ) {
        event.preventDefault(); // stop browser from changing focus
    }

    keys[eventcode] = true;//true all the time when key is pressed
}

/*---------------------------------*/
// onKeyUpEvent
/*---------------------------------*/
export function onKeyUpEvent(event) {
    // if key up is control set the ctrl+ keys to false
    if (event.code === "ControlLeft" || event.code === "ControlRight") {
        for (const key in keys) if (key.startsWith("Ctrl+")) keys[key] = false;
    } else {
        if (keys["Ctrl+" + event.code]) keys["Ctrl+" + event.code] = false;
    }

    keys[event.code] = false;
    if (keyPressToActionMap[event.code])  //if mapping exists
        Actions[keyPressToActionMap[event.code]] = false;
    else if (keyPressOnceToActionMap[event.code])
        Actions[keyPressOnceToActionMap[event.code]] = false;
    else if (keyReleaseToActionMap[event.code]) //if mapping exists
        Actions[keyReleaseToActionMap[event.code]] = true;
}

/*---------------------------------*/
// releaseSingleEventActions
/*---------------------------------*/
export function releaseSingleEventActions() {
    for (const [action, actionValue] of Object.entries(Actions)) {
        if (actionValue) {
            let mapping = ActionToKeyMap[action];
            if (mapping)
                if (mapping.OnPress || mapping.OnRelease) {
                    Actions[action] = false
                }
        }
    }
}

/*---------------------------------*/
// resetAllActions
/*---------------------------------*/
export function resetAllActions() {
    for (const [action,] of Object.entries(Actions)) {
        Actions[action] = false
    }
}

/*---------------------------------*/
// onMouseMoveEditor
/*---------------------------------*/
export let isMouseOverCanvas = false;
export function setIsMouseOverCanvas(val) { isMouseOverCanvas = val; }
export function getIsMouseOverCanvas() { return isMouseOverCanvas; }
export const mouse = new THREE.Vector2();
export function getMouse() { return mouse; }
export let rightMouseDown = false;
export function setRightMouseDown(val) { rightMouseDown = val; }

export function onMouseMoveEditor(event) {

    // console.log("onMouseMove");  

    if (!isMouseOverCanvas) return;
    if (rightMouseDown) {
        const dx = event.movementX;
        const dy = event.movementY;

        const sensitivity = 0.002;

        yawObject.rotation.y -= event.movementX * sensitivity;  // Y-axis (left/right)
        pitchObject.rotation.x -= event.movementY * sensitivity; // X-axis (up/down)

        // Clamp pitch to prevent flipping
        const maxPitch = Math.PI / 2;
        pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, pitchObject.rotation.x));

    } else {

        //store mouse coordinates on screen
        const rect = canvas.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
}

export function onMouseMoveGame(event) {
    const dx = event.movementX;
    const dy = event.movementY;

    const sensitivity = 0.002;

    yawObject.rotation.y -= event.movementX * sensitivity;  // Y-axis (left/right)
    pitchObject.rotation.x -= event.movementY * sensitivity; // X-axis (up/down)

    // Clamp pitch to prevent flipping
    const maxPitch = Math.PI / 2;
    pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, pitchObject.rotation.x));
}

/*----------------------------*/
// GAME ACTIONNABLE FUNCTIONS //
/*----------------------------*/
export function doSomething(self) {
    console.log("do something");
}

/*----------------------------*/
// takeItem
/*----------------------------*/
export function takeItem(self, playerState) {
    self.visible = false;

    const key = self.name;
    if (!playerState.inventory[key]) {
        playerState.inventory[key] = 0;
    }

    playerState.inventory[key]++;
}

/*----------------------------*/
// openGenericDoor
/*----------------------------*/
export function openGenericDoor(self, playerState) {
    console.log("openGenericDoor");
    if (!self?.userData) return;

    // //if player has key open door
    // const haskey = playerState.inventory["Action_Item_key001"]
    // if (!haskey) {
    //     console.log("NOKEY");
    //     // return;
    // }

    // Toggle the door state
    self.userData.isOpen = !self.userData.isOpen;

    if (self.animations.length === 0 || !self.mixer) return;
    const animationAction = self.animations[0];
    const mixer = self.mixer

    if (self.userData.isOpen) playForward(animationAction);
    else playBackward(animationAction);

    activateMixer(mixer,true);

    mixer.removeEventListener('finished', mixer._onFinishListener);
    console.log("Door Generic animation started");
    mixer._onFinishListener = (e) => {
        if (e.action === animationAction) {
            console.log("Door Generic animation finished");
            deactivateMixer(mixer,true);
        }
    };
    mixer.addEventListener("finished", mixer._onFinishListener);

    const body = self.userData?.body;
    const offset = self.userData?.offsetRootToBody;
    function updateCallBack() {
        if (body)
            scheduleSyncBodyToMesh(self, body, offset);
        // Manual backward finish detection
        if (animationAction.timeScale < 0 && animationAction.time <= 0) {
            console.log("Door animation finished (reverse)");
            deactivateMixer(mixer, true);
        }
    }
    mixer.updateCallBacks = [];
    mixer.updateCallBacks.push(updateCallBack);

}

function playForward(action) {
    action.reset();
    action.timeScale = 1;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
}

function playBackward(action) {
    action.time = action.getClip().duration; // start at the end
    action.paused = false;
    action.timeScale = -1;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
}

/*----------------------------*/
// openDoor
/*----------------------------*/
export function openDoor(self, playerState) {
    console.log("openDoor");
    if (!self?.userData) return;

    //if player has key open door
    const haskey = playerState.inventory["Action_Item_key001"]
    if (!haskey) {
        console.log("NOKEY");
        // return;
    }

    // Toggle the door state
    self.userData.isOpen = !self.userData.isOpen;

    // Define 90 degrees in radians
    const dir = self.userData.isOpen ? 1 : -1;
    const ninetyDeg = Math.PI / 2;

    // const doorPivot = self.children[0];
    const doorPivot = self;

    rotatePivot(doorPivot, new THREE.Vector3(0, 1, 0), dir * ninetyDeg, 0.6, true); //local rotation axis
}

/*----------------------------*/
// rotatePivot
/*----------------------------*/
function rotatePivot(pivot, axis, targetAngle, duration = 1, updateBody = false) {
    const startTime = performance.now();
    let accumulatedAngle = 0;

    function animate(time) {
        const elapsed = (time - startTime) / 1000; // seconds
        const t = Math.min(elapsed / duration, 1); // normalized [0,1]
        const angleToApply = (targetAngle * t) - accumulatedAngle;

        // Rotate the door by the small delta around the pivot
        pivot.rotateOnAxis(axis, angleToApply);
        accumulatedAngle += angleToApply;

        if (updateBody)
            scheduleSyncBodyToMesh(pivot, pivot.userData.body, pivot.userData.offsetRootToBody); //have the body follow the mesh (pivot)

        if (t < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

/*----------------------------*/
// openChest
/*----------------------------*/
export function openChest(self, playerState) {
    console.log("openChest");
    if (!self?.userData) return;

    //if player has key open door
    // const haskey = playerState.inventory["ITEM_KEY"]
    // if (!haskey){
    //     console.log("NOKEY");
    //     // return;
    // }
    // let target = self.actionnableParent || self;
    let target = self;

    // Toggle the door state
    target.userData.isOpen = !target.userData.isOpen;


    // Define 90 degrees in radians
    const dir = target.userData.isOpen ? -1 : 1;
    const ninetyDeg = Math.PI / 2;


    const doorPivot = target.children[0];
    // rotatePivot(doorPivot, new THREE.Vector3(0, 1, 0),dir * ninetyDeg, 0.6);
    rotatePivot(doorPivot, new THREE.Vector3(1, 0, 0), dir * ninetyDeg, 0.6); //local rotation axis
}

export function useSwitch(self,playerState){
    console.log("useSwitch");

    self.children.forEach(element => {
        openGenericDoor(element, playerState);
    })
}

/*------------------*/
/*------------------*/
// RAPIER VARIABLES //
/*------------------*/
/*------------------*/

export let physWorld = null;
export let rapierDebug = null;
export const pendingBodyUpdates = [];
export const usekcc = true;

//name->body
// export const bodyNameMap = new Map();
//name->collider
// export const colliderNameMap = new Map();

export function createRigidBodyCustom(rigidbodydesc, name){
    if (!name) throw new Error("name not defined")
    // if (bodyNameMap.has(name)) throw new Error(name+" has duplicate bodies")
    const r = physWorld.createRigidBody(rigidbodydesc);
    r.userData={name:name};
    // bodyNameMap.set(name, r);
    return r;
}

export function createColliderCustom(colliderDesc, body, name){
    if (!name) throw new Error("name not defined")
    // if (colliderNameMap.has(name)) throw new Error(name+" has duplicate colliders")
    const c = physWorld.createCollider(colliderDesc, body);
    c.userData={name:name};
    // colliderNameMap.set(name, c);
    return c;
}



//update mesh rot/pos from movement state
export function updateMeshRotPos(characterState, lerpRot = false) {
    const root = characterState.root;
    const rot = characterState.rotation;
    if (lerpRot)
        root.quaternion.slerp(rot, 0.1);
    else
        root.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    if (characterState.tweakRot) root.rotation.y += characterState.tweakRot; // optional 180° turn if needed
    
    const newRootPos = characterState.newPos.clone();
    if (characterState.offsetRootToBody)
        newRootPos.sub(characterState.offsetRootToBody);
    if (characterState.tweakPos){
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(root.quaternion); // compute forward vector in world space
        newRootPos.sub(forward.multiply(characterState.tweakPos));}
    root.position.set(newRootPos.x,newRootPos.y,newRootPos.z);    
}


//schedule the body physics change
//so this is executed in main loop before world.step (avoid race conditions)
export function scheduleSyncBodyToMesh(mesh, body, off){
    const p = mesh.getWorldPosition(new THREE.Vector3());
    const q = mesh.getWorldQuaternion(new THREE.Quaternion());
    const offrot = off.clone().applyQuaternion(q)
    const finalp = p.add(offrot);
    pendingBodyUpdates.push({
        body: body,
        pos: finalp,
        quat: q
    });
}

export function scheduleSyncBodyFromcharacterState(characterState){
    // scheduleSyncBodyToMesh(characterState.root, characterState.body)
    const p = characterState.newPos;
    const q = characterState.rotation;
    const body = characterState.body;
    pendingBodyUpdates.push({
        body: body,
        pos: p,
        quat: q
    });    
}


/*-----------------------------------------------------*/
// initRapier
/*-----------------------------------------------------*/
export async function initRapier() {
    await RAPIER.init();
    physWorld = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
    console.log('Rapier initialized', physWorld);

    rapierDebug = addRapierDebug(physWorld);

    //add collider debug group to scene
    scene.add(colliderDebugGroup);
}

// COLLISION GROUPS
export const COL_LAYERS = {
    PLAYER: 1 << 0,  // 000001
    PLAYERWPN: 1 << 1,  // 000010
    ENEMY: 1 << 2,  // 000100
    ENEMYWPN: 1 << 3,  // 001000
    SCENERY: 1 << 4,  // 010000
    WATER: 1 << 5,  // 100000
};

// --- Helper to make masks ---
export const makeMask = (layer, collidesWith) =>
    (layer << 16) | collidesWith;

// --- Define who collides with who ---
export const COL_MASKS = {
    PLAYER: makeMask(
        COL_LAYERS.PLAYER,
        COL_LAYERS.ENEMY | COL_LAYERS.SCENERY //| COL_LAYERS.ENEMYWPN
    ),

    PLAYERWPN: makeMask(
        COL_LAYERS.PLAYERWPN,
        COL_LAYERS.ENEMY | COL_LAYERS.SCENERY
    ),

    ENEMY: makeMask(
        COL_LAYERS.ENEMY,
        COL_LAYERS.PLAYER | COL_LAYERS.SCENERY | COL_LAYERS.ENEMY //| COL_LAYERS.PLAYERWPN | 
    ),

    ENEMYWPN: makeMask(
        COL_LAYERS.ENEMYWPN,
        COL_LAYERS.PLAYER | COL_LAYERS.SCENERY
    ),

    SCENERY: makeMask(
        COL_LAYERS.SCENERY,
        COL_LAYERS.PLAYER | COL_LAYERS.ENEMY | COL_LAYERS.PLAYERWPN | COL_LAYERS.ENEMYWPN
    ),

    WATER: makeMask(
        COL_LAYERS.WATER,
        COL_LAYERS.WATER
    ),    
};

export function addRapierDebugExp() {
    rapierDebug = addRapierDebug(physWorld);
}

// call after Rapier.init() and after you have a world
function addRapierDebug(world) {
    // geometry & material for line segments
    const debugGeo = new THREE.BufferGeometry();
    // start empty; we'll allocate when we get data

    const debugMat = new THREE.LineBasicMaterial({
        color: 0xffffff,      // white lines
        linewidth: 2,         // ⚠️ only affects some renderers (not WebGL1)
        vertexColors: false,  // ignore Rapier's internal colors
    });


    const debugLines = new THREE.LineSegments(debugGeo, debugMat);
    debugLines.frustumCulled = false;
    colliderDebugGroup.add(debugLines);

    // helper to update per-frame
    function updateDebug() {
        // IMPORTANT: call after world.step() so Rapier buffers are fresh
        const debug = world.debugRender(); // returns vertex buffer and color buffer
        const vertices = debug.vertices || [];
        const colors = debug.colors || [];

        // early exit if no vertices
        if (!vertices.length) {
            debugGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            debugGeo.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
            return;
        }

        // Ensure vertices contain valid numbers
        const validVertices = vertices.every(v => Number.isFinite(v));
        if (!validVertices) {
            console.warn("Debug vertices contain invalid values; skipping update.");
            return;
        }

        // Recreate attributes if size differs
        if (!debugGeo.attributes.position || debugGeo.attributes.position.count !== vertices.length / 3) {
            debugGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

            let colorAttr;
            if (colors.length === vertices.length) {
                colorAttr = new THREE.Float32BufferAttribute(colors, 3);
            } else if (colors.length === (vertices.length / 3) * 4) {
                const conv = new Float32Array((colors.length / 4) * 3);
                for (let i = 0, j = 0; i < colors.length; i += 4, j += 3) {
                    conv[j + 0] = colors[i + 0] / 255;
                    conv[j + 1] = colors[i + 1] / 255;
                    conv[j + 2] = colors[i + 2] / 255;
                }
                colorAttr = new THREE.Float32BufferAttribute(conv, 3);
            } else {
                // fallback to white
                colorAttr = new THREE.Float32BufferAttribute(new Float32Array(vertices.length).fill(1), 3);
            }
            debugGeo.setAttribute('color', colorAttr);
        } else {
            // update existing attributes
            debugGeo.attributes.position.array.set(vertices);
            debugGeo.attributes.position.needsUpdate = true;

            if (colors.length > 0) {
                const attr = debugGeo.attributes.color;
                if (colors.length === vertices.length) {
                    attr.array.set(colors);
                } else if (colors.length === (vertices.length / 3) * 4) {
                    for (let i = 0, ai = 0; i < colors.length; i += 4, ai += 3) {
                        attr.array[ai + 0] = colors[i + 0] / 255;
                        attr.array[ai + 1] = colors[i + 1] / 255;
                        attr.array[ai + 2] = colors[i + 2] / 255;
                    }
                }
                attr.needsUpdate = true;
            }
        }

        // Only compute bounding sphere if positions are valid
        if (debugGeo.attributes.position && debugGeo.attributes.position.count > 0) {
            debugGeo.computeBoundingSphere();
        }
    }

    // visibility helpers
    function hide() {
        debugLines.visible = false;
    }

    function show() {
        debugLines.visible = true;
    }

    function toggle() {
        debugLines.visible = !debugLines.visible;
    }

    function isVisible() {
        return debugLines.visible;
    }

    return {
        debugLines,
        update: updateDebug,
        hide,
        show,
        toggle,
        isVisible,
        dispose() {
            colliderDebugGroup.remove(debugLines);
            debugGeo.dispose();
            debugMat.dispose();
        }
    };
}

function printQuat(pivot) {
    const quat = pivot.getWorldQuaternion(new THREE.Quaternion());

    // Convert to Euler (THREE uses radians by default)
    const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

    // Convert to degrees
    const deg = {
        x: THREE.MathUtils.radToDeg(euler.x),
        y: THREE.MathUtils.radToDeg(euler.y),
        z: THREE.MathUtils.radToDeg(euler.z)
    };

    console.log('World rotation:', deg);
}

