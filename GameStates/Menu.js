import { GAMESTATES } from "../Infra/GameStateManager.js";
import { configManager } from "../Infra/ConfigManager.js";

export default class MenuState {
    constructor(game) {
        this.game = game;
        this.menuOverlay = null;
        this.startButton = null;
        this.loadButton = null;
        this.editorButton = null;
        this.optionsButton = null;
        this.titleElement = null;
        this.styleTag = null; //track dynamic styles
        this.useNewMenu = false;
    }

    onEnter() {
        // Check which menu style to use
        const menuConfig = configManager.get('menu');
        this.useNewMenu = menuConfig?.useNewMenu ?? false;

        if (this.useNewMenu) {
            this.createNewMenu();
        } else {
            this.createOldMenu();
        }
    }

    createOldMenu() {
        // ---  Add dynamic CSS for old menu ---
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

                @media screen and (orientation: landscape) and (max-height: 500px) {
                    #menu-overlay h1 {
                        font-size: 2em;
                        margin-bottom: 16px;
                    }
                    #menu-overlay button {
                        padding: 8px 28px;
                        font-size: 1em;
                        margin: 5px;
                    }
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

    createNewMenu() {
        const menuConfig = configManager.get('menu');
        const assets = menuConfig?.assets || {};
        const animation = menuConfig?.animation || {};

        // ---  Add dynamic CSS for new menu ---
        if (!this.styleTag) {
            this.styleTag = document.createElement('style');
            this.styleTag.textContent = `
                #menu-overlay-new {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    z-index: 1000;
                }

                #menu-title {
                    margin-top: 50px;
                    max-width: 80%;
                    animation: slideInFromTop ${animation.titleSlideInDuration || '1s'} ease-out ${animation.titleSlideInDelay || '0.3s'} both;
                }

                #menu-title img {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                @keyframes slideInFromTop {
                    from {
                        transform: translateY(-200%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                #menu-buttons {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    margin-top: 80px;
                }

                .menu-button-img {
                    cursor: pointer;
                    transition: transform 0.2s, filter 0.2s;
                    max-width: 300px;
                    width: 100%;
                    height: auto;
                }

                .menu-button-img:hover {
                    transform: scale(1.1);
                    filter: brightness(1.2);
                }

                .menu-button-img:active {
                    transform: scale(0.95);
                }

                @media screen and (orientation: landscape) and (max-height: 500px) {
                    #menu-overlay-new {
                        flex-direction: row;
                        align-items: center;
                        justify-content: center;
                        gap: 40px;
                    }
                    #menu-title {
                        margin-top: 0;
                        max-width: 35%;
                    }
                    #menu-buttons {
                        margin-top: 0;
                        gap: 10px;
                    }
                    .menu-button-img {
                        max-width: 180px;
                    }
                }
            `;
            document.head.appendChild(this.styleTag);
        }

        // --- Create overlay with background ---
        this.menuOverlay = document.createElement('div');
        this.menuOverlay.id = 'menu-overlay-new';
        if (assets.background) {
            this.menuOverlay.style.backgroundImage = `url('${assets.background}')`;
        }

        // --- Create title ---
        if (assets.title) {
            this.titleElement = document.createElement('div');
            this.titleElement.id = 'menu-title';
            const titleImg = document.createElement('img');
            titleImg.src = assets.title;
            titleImg.alt = 'Title';
            this.titleElement.appendChild(titleImg);
            this.menuOverlay.appendChild(this.titleElement);
        }

        // --- Create buttons container ---
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'menu-buttons';

        // --- Create image buttons ---
        if (assets.startButton) {
            this.startButton = this.createImageButton(assets.startButton, 'Start', () => this.onStartGame());
            buttonsContainer.appendChild(this.startButton);
        }

        if (assets.loadButton) {
            this.loadButton = this.createImageButton(assets.loadButton, 'Load', () => console.log("Load clicked"));
            buttonsContainer.appendChild(this.loadButton);
        }

        if (assets.editorButton) {
            this.editorButton = this.createImageButton(assets.editorButton, 'Editor', () => this.game.stateManager.setState(GAMESTATES.EDITOR));
            buttonsContainer.appendChild(this.editorButton);
        }

        if (assets.optionsButton) {
            this.optionsButton = this.createImageButton(assets.optionsButton, 'Options', () => console.log("Options clicked"));
            buttonsContainer.appendChild(this.optionsButton);
        }

        this.menuOverlay.appendChild(buttonsContainer);
        document.body.appendChild(this.menuOverlay);
    }

    createButton(label, onClick) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        return btn;
    }

    createImageButton(imageSrc, altText, onClick) {
        const img = document.createElement('img');
        img.src = imageSrc;
        img.alt = altText;
        img.className = 'menu-button-img';
        img.addEventListener('click', onClick);
        return img;
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
        if (this.optionsButton) this.optionsButton.remove();
        if (this.titleElement) this.titleElement.remove();
        if (this.menuOverlay) this.menuOverlay.remove();

        // --- Remove dynamic CSS ---
        if (this.styleTag) {
            this.styleTag.remove();
            this.styleTag = null; // clear reference to avoid duplicates
        }
    }
}