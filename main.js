import * as THREE from 'three';

import MenuState from './GameStates/Menu.js';
import LoadingScreenState from './GameStates/LoadingScreen.js';
import GameState from './GameStates/Game.js';
import EditorState from './GameStates/Editor.js';
import GameOverState from './GameStates/GameOver.js';

import LevelFactory from './Factories/LevelFactory.js';
import CharacterFactory from './Factories/CharacterFactory.js';

import GameStateManager, { GAMESTATES } from './Infra/GameStateManager.js';
import InputManager from './Infra/InputManager.js';

import World from './Entities/World.js';

import AIManager from './Systems/AIManager.js';
import AnimatorManager from './Systems/AnimatorManager.js';
import CameraManager from './Systems/CameraManager.js';
import CollisionManager from './Systems/CollisionManager.js';
import DialogManager from './Systems/DialogManager.js';
import HealthManager from './Systems/HealthManager.js';
import InteractableManager from './Systems/InteractableManager.js';
import LightManager from './Systems/LightManager.js';
import MaterialManager from './Systems/MaterialManager.js';
import MovementManager from './Systems/MovementManager.js';
import PathFindingManager from './Systems/PathFindingManager.js';
import PlayerControlManager from './Systems/PlayerControlManager.js';
import UIManager from './Systems/UIManager.js';
import UVAnimManager from './Systems/UVAnimManager.js';

/*-----------------------------------------------------*/
// REVISION NUMBER
/*-----------------------------------------------------*/

// revision hash
const revision = "0.9"; // Replace with actual Git hash

// Add it to the div
document.getElementById('revision-info').innerText = `Version: ${revision}`;

/*-----------------------------------------------------*/
// PLATFORM MANAGEMENT
/*-----------------------------------------------------*/

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
// Usage
if (isMobile()) {
    console.log("You're on a mobile device! revision:", revision);
} else {
    console.log("You're on a desktop! revision:", revision);
}


//structure
// Game/
//  ├── Constants.js
//  ├── Debug.js
//  ├── index.html
//  ├── main.js
//  │
//  ├── assets/
//  │     ├── blender/
//  │     ├── glb/
//  │     ├── metadata/
//  │     │     ├── dialogs.json
//  │     │     ├── Level1_metadata.json
//  │     │     └── Level2_metadata.json
//  │     ├── mixamo/
//  │     └── textures/
//  │
//  ├── Infra/
//  │     ├── GameStateManager.js
//  │     └── InputManager.js
//  │
//  ├── Factories/
//  │     ├── CharacterFactory.js
//  │     └── LevelFactory.js
//  │
//  ├── Systems/
//  │     ├── AIManager.js
//  │     ├── AnimatorManager.js
//  │     ├── CameraManager.js
//  │     ├── CollisionManager.js
//  │     ├── DialogManager.js
//  │     ├── HealthManager.js
//  │     ├── InteractableManager.js
//  │     ├── LightManager.js
//  │     ├── MaterialManager.js
//  │     ├── MovementManager.js
//  │     ├── PathFindingManager.js
//  │     ├── PlayerControlManager.js
//  │     ├── UIManager.js
//  │     └── UVAnimManager.js
//  │
//  ├── Entities/
//  │     ├── Entity.js
//  │     ├── World.js
//  │     └── Components/
//  │           ├── AIComponent.js
//  │           ├── AnimatorComponent.js
//  │           ├── AnimColliderComponent.js
//  │           ├── AttackComponent.js
//  │           ├── CapsuleColliderComponent.js
//  │           ├── DialogComponent.js
//  │           ├── GameplayComponent.js
//  │           ├── HealthComponent.js
//  │           ├── InteractableComponent.js
//  │           ├── InventoryComponent.js
//  │           ├── LightComponent.js
//  │           ├── MovementComponent.js
//  │           ├── PathFindingComponent.js
//  │           ├── PlayerControlComponent.js
//  │           ├── TransformComponent.js
//  │           ├── UVAnimComponent.js
//  │           └── VisualComponent.js
//  │
//  └── GameStates/
//        ├── Editor.js
//        ├── Game.js
//        ├── GameOver.js
//        ├── LoadingScreen.js
//        └── Menu.js


// --- Create the state manager ---
const stateManager = new GameStateManager();

// --- Create game services shared between states ---
const canvasContainer = document.getElementById('canvas-container');
const canvas = document.getElementById('three-canvas');
const game = {
    canvas: canvas,
    canvasContainer: canvasContainer,
    mainContainer: document.getElementById('main-container'),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(
        75,
        canvasContainer.clientWidth / canvasContainer.clientHeight,
        0.1, //near plane
        1000 //far plane
    ),
    renderer: new THREE.WebGLRenderer({
        canvas: canvas, //dont forget this
        alpha: true
    }),
    input: new InputManager(),
    raycaster: new THREE.Raycaster(),
    screenCenter: new THREE.Vector2(0, 0),// Center of screen in NDC (Normalized Device Coordinates)
    yawObject: new THREE.Object3D(),
    pitchObject: new THREE.Object3D(),
    systems: {},
    stateManager: stateManager,
    world: new World(),
}

game.systems.aiManager = new AIManager(game);
game.systems.animatorManager = new AnimatorManager(game);
game.systems.cameraManager = new CameraManager(game);
game.systems.characterFactory = new CharacterFactory(game);
game.systems.collisionManager = new CollisionManager(game);
game.systems.dialogManager = new DialogManager(game);
game.systems.healthManager = new HealthManager(game);
game.systems.interactableManager = new InteractableManager(game);
game.systems.levelFactory = new LevelFactory(game);
game.systems.pathFindingManager = new PathFindingManager(game);
game.systems.playerCtrlManager = new PlayerControlManager(game);
game.systems.lightManager = new LightManager(game);
game.systems.materialManager = new MaterialManager(game);
game.systems.movementManager = new MovementManager(game);
game.systems.uiManager = new UIManager(game);
game.systems.uvAnimManager = new UVAnimManager(game);
await game.systems.uiManager.loadItems(); // ensure atlas is loaded before using it
await game.systems.dialogManager.loadDialogData('./assets/metadata/dialogs.json'); // load dialog data

//tweaks
//tweak global renderer
game.renderer.setClearColor(0x000000, 0); // transparent background
game.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
if (0) {//to enable shadows
    game.renderer.shadowMap.enabled = true;
    game.renderer.shadowMap.type = THREE.PCFSoftShadowMap; //smoother shadows
}
//tweak global scene
game.scene.background = new THREE.Color(0x000000);

//initialize systems
game.systems.collisionManager.init(game.scene);

// --- Register states ---
stateManager.add(GAMESTATES.MENU, new MenuState(game));
stateManager.add(GAMESTATES.LOADINGSCREEN, new LoadingScreenState(game));
stateManager.add(GAMESTATES.GAME, new GameState(game));
stateManager.add(GAMESTATES.EDITOR, new EditorState(game));
stateManager.add(GAMESTATES.GAMEOVER, new GameOverState(game));

// --- Set initial state ---
stateManager.setState(GAMESTATES.MENU);

// --- Start main loop ---
let lastTime = 0;
function mainLoop(time) {
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    //it is possible to switch state between update and render
    //but it is fine
    stateManager.update(dt);
    stateManager.render(dt);

    requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);
