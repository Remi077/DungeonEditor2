// @ts-nocheck
/*-----------------------------------------------------*/
// IMPORTS //
/*-----------------------------------------------------*/
// import * as Shared from './shared.js';
// import * as Editor from './editor/Editor.js';
// import * as EditorUI from './editor/EditorUI.js';
// import * as MenuUI from './menu/Menu.js';
// import * as Game from './game/Game.js';
// import * as GameOver from './game/GameOver.js';
// import * as Inventory from './game/inventory.js';

import * as THREE from 'three';
import GameStateManager, { GAMESTATES } from './GameStateManager.js';
// import GameStateManager from './GameStateManager.js';
import MenuState from './menu/Menu.js';
import GameState from './game/Game.js';
import EditorState from './editor/Editor.js';
import GameOverState from './game/GameOver.js';

import InputManager from './InputManager.js';
import PhysicsManager from './PhysicsManager.js';
import LevelManager from './LevelManager.js';
import CharacterManager from './CharacterManager.js';
import AnimatorManager from './AnimatorManager.js';
import InteractableManager from './InteractableManager.js';
import PathFindingManager from './PathFindingManager.js';
import AIManager from './AIManager.js';
// import * as Stats from '../GameStats.js';

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


//DEPENDENCIES DIAGRAM

/*

main
 ├── editor ───────┐
 │    ├── stats ───┼──> shared
 │    ├── shared   │
 │    └── gameHUD──┘
 ├── game ─────────┐
 │    ├── stats ───┼──> shared
 │    ├── shared   │
 │    └── gameHUD──┘
 ├── editorUI
 │    ├──> editor
 │    ├──> stats ─────> shared
 │    ├──> shared
 │    └──> gameHUD
 ├── menuUI ──────────> shared
 └── gameOver ────────> shared
*/

//main->editor
//main->game
//main->shared
//main->editorUI
//main->menuUI

//editorUI->editor
//editorUI->shared
//editorUI->gameHUD

//editor->stats
//editor->shared
//editor->gameHUD

//menuUI->shared

//gameOver->shared

//game->stats
//game->shared
//game->gameHUD

//gameHUD->shared

//stats->shared


/*-----------------------------------------------------*/
// SETUP AND START GAME
/*-----------------------------------------------------*/

// async function setupAndStart() {
//     try {

//         //init Rapier
//         await Shared.initRapier();

//         //setup editor scene
//         Editor.setupEditor();
//         EditorUI.setupEditorUI();

//         //wire the callbacks here to avoid circular dependencies
//         Shared.setStartEditorLoop(Editor.startEditorLoop);
//         Shared.setStopEditorLoop(Editor.stopEditorLoop);
//         Shared.setStartGameLoop(Game.startGameLoop);
//         Shared.setStopGameLoop(Game.stopGameLoop);
//         Shared.setEditorActions(Editor.Actions);
//         Shared.setGameActions(Game.Actions);
//         Shared.setEditorActionsMap(Editor.ActionToKeyMap);
//         Shared.setGameActionsMap(Game.ActionToKeyMap);
        
//         // Start editor loop
//         Shared.setMode(Shared.MODEEDITOR);
//         // Shared.setMode(Shared.MODEMENU);

//     } catch (error) {
//         console.error("Error: ", error);
//     }
// }

// //start here
// setupAndStart();
  
//recommended structure
// Game/
//  ├── Systems/
//  │     ├── PhysicsManager
//  │     ├── LevelManager
//  │     ├── CharacterManager
//  │     └── AnimationSystem
//  │
//  ├── Entities/
//  │     ├── Entity.js
//  │     ├── Components/
//  │     │     ├── TransformComponent.js
//  │     │     ├── PhysicsBodyComponent.js
//  │     │     ├── AnimatorComponent.js
//  │     │     ├── PlayerControllerComponent.js
//  │     │     ├── AIComponent.js
//  │     │     └── HealthComponent.js
//  │
//  └── States/
//        ├── EditorState
//        ├── GameState
//        ├── MenuState
//        └── GameOverState


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
    entities: new Set(),
    activeEntities: new Set(),
    playerEntity : null,
    stateManager: stateManager
}

game.systems.physicsManager = new PhysicsManager();
game.systems.levelManager = new LevelManager(game);
game.systems.characterManager = new CharacterManager(game);
game.systems.animatorManager = new AnimatorManager(game);
game.systems.interactableManager = new InteractableManager(game);
game.systems.pathFindingManager = new PathFindingManager(game);
game.systems.aiManager = new AIManager(game);

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
game.systems.physicsManager.init(game.scene);

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
