// @ts-nocheck
/*-----------------------------------------------------*/
// IMPORTS //
/*-----------------------------------------------------*/
import * as THREE from 'three';
import MenuState from './GameStates/Menu.js';
import GameState from './GameStates/Game.js';
import EditorState from './GameStates/Editor.js';
import GameOverState from './GameStates/GameOver.js';

import * as Constants from '../Constants.js';
import GameStateManager, { GAMESTATES } from './Systems/GameStateManager.js';
import InputManager from './Systems/InputManager.js';
import CollisionManager from './Systems/CollisionManager.js';
import MovementManager from './Systems/MovementManager.js';
import LevelManager from './Systems/LevelManager.js';
import CharacterManager from './Systems/CharacterManager.js';
import AnimatorManager from './Systems/AnimatorManager.js';
import InteractableManager from './Systems/InteractableManager.js';
import PathFindingManager from './Systems/PathFindingManager.js';
import AIManager from './Systems/AIManager.js';
import UIManager from './Systems/UIManager.js';
import HealthManager from './Systems/HealthManager.js';

/*-----------------------------------------------------*/
// REVISION NUMBER
/*-----------------------------------------------------*/

// revision hash
const revision = "0.8"; // Replace with actual Git hash

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
//  |
//  ├── assets/
//  |
//  ├── Systems/
//  │     ├── AIManager.js
//  │     ├── AnimatorManager.js
//  │     ├── CharacterManager.js //tomove in factories
//  │     ├── CollisionManager.js
//  │     ├── GameStateManager.js //tomove in infrastructure
//  │     ├── HealthManager.js
//  │     ├── InputManager.js //tomove in infrastructure
//  │     ├── InteractableManager.js
//  │     ├── LevelManager.js //tomove in factories
//  │     ├── PathFindingManager.js
//  │     ├── MovementManager.js
//  │     └── UIManager.js
//  │
//  ├── Entities/
//  │     ├── Entity.js
//  │     ├── World.js
//  │     ├── Components/
//  │     │     ├── AIComponent.js
//  │     │     ├── AnimatorComponent.js
//  │     │     ├── GameplayComponent.js
//  │     │     ├── InteractableComponent.js
//  │     │     ├── InventoryComponent.js
//  │     │     ├── PathFindingComponent.js
//  │     │     ├── CollisionsBodyComponent.js
//  │     │     ├── PlayerControlComponent.js
//  │     │     ├── TransformComponent.js
//  │     │     ├── VisualComponent.js
//  │     │     └── WeaponComponent.js
//  │
//  └── GameStates/
//        ├── Editor.js
//        ├── Game.js
//        ├── Menu.js
//        └── GameOver.js


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
    // entities: new Set(),
    // activeEntities: new Set(),
    // playerEntity : null,
    stateManager: stateManager
}

game.systems.aiManager = new AIManager(game);
game.systems.animatorManager = new AnimatorManager(game);
game.systems.characterManager = new CharacterManager(game);
game.systems.collisionManager = new CollisionManager(game);
game.systems.healthManager = new HealthManager(game);
game.systems.interactableManager = new InteractableManager(game);
game.systems.levelManager = new LevelManager(game);
game.systems.pathFindingManager = new PathFindingManager(game);
game.systems.movementManager = new MovementManager(game);
game.systems.uiManager = new UIManager(game);
await game.systems.uiManager.loadItems(); // ensure atlas is loaded before using it

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
