import { GAMESTATES } from "../Infra/GameStateManager.js";

export default class MenuState {
    constructor(game) {
        this.game = game;
        this.menuOverlay = null;
        this.startButton = null;
        this.loadButton = null;
        this.editorButton = null;
        this.styleTag = null; //track dynamic styles
    }

    onEnter() {
        // ---  Add dynamic CSS ---
        if (!this.styleTag) { // ensure only one tag
            this.styleTag = document.createElement('style');
            this.styleTag.textContent = `
                #menu-overlay {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(0,0,0,0.85);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-family: sans-serif;
                    z-index: 1000;
                }

                #menu-overlay h1 {
                    font-size: 4em;
                    margin-bottom: 50px;
                }

                #menu-overlay button {
                    margin: 10px;
                    padding: 15px 40px;
                    font-size: 1.5em;
                    background-color: #444;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }

                #menu-overlay button:hover {
                    background-color: #555;
                }

                #menu-overlay button.green {
                    background-color: green;
                }
            `;
            document.head.appendChild(this.styleTag);
        }

        // --- Create overlay ---
        this.menuOverlay = document.createElement('div');
        this.menuOverlay.id = 'menu-overlay';

        const title = document.createElement('h1');
        title.textContent = 'Application Not Found';
        this.menuOverlay.appendChild(title);

        // --- Create buttons ---
        this.startButton = this.createButton('Start Game', () => this.onStartGame());
        this.loadButton = this.createButton('Load', () => console.log("Load clicked"));
        this.editorButton = this.createButton('Editor', () => this.game.stateManager.setState(GAMESTATES.EDITOR));
        // this.editorButton = this.createButton('Editor', () => this.game.stateManager.setState(GAMESTATES.GAMEOVER));

        this.menuOverlay.appendChild(this.startButton);
        this.menuOverlay.appendChild(this.loadButton);
        this.menuOverlay.appendChild(this.editorButton);

        document.body.appendChild(this.menuOverlay);

    }

    createButton(label, onClick) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        return btn;
    }

    onStartGame() {
        // Transition to loading screen which will handle asset loading
        this.game.stateManager.setState(GAMESTATES.LOADINGSCREEN);
    }

    onExit() {
        // --- Remove buttons and overlay ---
        if (this.startButton) this.startButton.remove();
        if (this.loadButton) this.loadButton.remove();
        if (this.editorButton) this.editorButton.remove();
        if (this.menuOverlay) this.menuOverlay.remove();

        // --- Remove dynamic CSS ---
        if (this.styleTag) {
            this.styleTag.remove();
            this.styleTag = null; // clear reference to avoid duplicates
        }
    }
}