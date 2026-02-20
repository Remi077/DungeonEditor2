import { GAMESTATES } from "../Infra/GameStateManager.js";
import { CHARACTER_TYPES } from '../Constants.js';

export default class LoadingScreenState {
    constructor(game) {
        this.game = game;
        this.loadingOverlay = null;
        this.loadingBar = null;
        this.loadingText = null;
        this.styleTag = null;
        this.progress = 0;
    }

    onEnter() {
        // --- Add dynamic CSS ---
        if (!this.styleTag) {
            this.styleTag = document.createElement('style');
            this.styleTag.textContent = `
                #loading-overlay {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.95);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-family: sans-serif;
                    z-index: 1000;
                }

                #loading-overlay h1 {
                    font-size: 3em;
                    margin-bottom: 30px;
                }

                #loading-bar-container {
                    width: 60%;
                    max-width: 600px;
                    height: 30px;
                    background-color: #333;
                    border: 2px solid #666;
                    border-radius: 15px;
                    overflow: hidden;
                    margin-bottom: 20px;
                }

                #loading-bar {
                    height: 100%;
                    width: 0%;
                    background: linear-gradient(90deg, #4CAF50, #8BC34A);
                    transition: width 0.3s ease;
                }

                #loading-text {
                    font-size: 1.2em;
                    color: #aaa;
                }
            `;
            document.head.appendChild(this.styleTag);
        }

        // --- Create overlay ---
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loading-overlay';

        const title = document.createElement('h1');
        title.textContent = 'Loading...';
        this.loadingOverlay.appendChild(title);

        // --- Create loading bar container ---
        const barContainer = document.createElement('div');
        barContainer.id = 'loading-bar-container';

        this.loadingBar = document.createElement('div');
        this.loadingBar.id = 'loading-bar';
        barContainer.appendChild(this.loadingBar);

        this.loadingOverlay.appendChild(barContainer);

        // --- Create loading text ---
        this.loadingText = document.createElement('div');
        this.loadingText.id = 'loading-text';
        this.loadingText.textContent = 'Initializing...';
        this.loadingOverlay.appendChild(this.loadingText);

        document.body.appendChild(this.loadingOverlay);

        // Start loading assets
        this.loadAssets();
    }

    // Shared loading function that can be called from Editor or LoadingScreen
    static async loadGameAssets(game) {
        const levelFactory = game.systems.levelFactory;
        const pathFindingManager = game.systems.pathFindingManager;
        const characterFactory = game.systems.characterFactory;

        // Load level
        // await levelFactory.loadLevel('./assets/glb/Level2.glb', './assets/metadata/Level2_metadata.json');
        await levelFactory.loadLevel('./assets/glb/Level1.glb', './assets/metadata/Level1_metadata.json');
        levelFactory.addToScene();

        // Load navmesh
        await pathFindingManager.loadNavMesh('./assets/glb/navmesh.glb');

        // Load player character
        await characterFactory.loadCharacter('./assets/glb/player.glb', CHARACTER_TYPES.PLAYER);

        // Load zombie character
        await characterFactory.loadCharacter('./assets/glb/zombie.glb', CHARACTER_TYPES.ZOMBIE);
    }

    async loadAssets() {
        try {
            this.updateProgress(0, 'Loading assets...');

            // Call the shared loading function
            await LoadingScreenState.loadGameAssets(this.game);

            this.updateProgress(100, 'Complete!');

            // Wait a moment to show completion, then transition to game
            await this.delay(500);
            this.game.stateManager.setState(GAMESTATES.GAME);

        } catch (error) {
            console.error('Error loading assets:', error);
            this.loadingText.textContent = 'Error loading assets. Please refresh.';
            this.loadingText.style.color = '#f44336';
        }
    }

    updateProgress(percent, text) {
        this.progress = percent;
        this.loadingBar.style.width = `${percent}%`;
        this.loadingText.textContent = text;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    onExit() {
        // --- Remove overlay ---
        if (this.loadingOverlay) this.loadingOverlay.remove();

        // --- Remove dynamic CSS ---
        if (this.styleTag) {
            this.styleTag.remove();
            this.styleTag = null;
        }
    }
}

