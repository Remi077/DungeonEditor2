export default class GameOverState {
    constructor(game) {
        this.game = game;

        this.overlay = null;
        this.styleTag = null;
    }

    onEnter() {
        // ---------------------------
        // Inject CSS 
        // ---------------------------  
        this.styleTag = document.createElement('style');
        this.styleTag.textContent = `
            .gameover-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.85);
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: sans-serif;
                z-index: 1000;
            }

            .gameover-overlay h1 {
                font-size: 4em;
                margin-bottom: 50px;
            }

            .hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(this.styleTag);

        // ---------------------
        // build overlay DOM
        // ---------------------
        this.overlay = document.createElement('div');
        this.overlay.className = 'gameover-overlay';

        const title = document.createElement('h1');
        title.textContent = "GAME OVER";
        this.overlay.appendChild(title);

        // (Optional future buttons)
        // const restart = document.createElement('button');
        // restart.textContent = 'Restart';
        // restart.onclick = () => this.game.stateManager.setState(GAMESTATES.EDITOR);
        // this.overlay.appendChild(restart);

        document.body.appendChild(this.overlay);

    }

    onExit() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        if (this.styleTag) {
            this.styleTag.remove();
            this.styleTag = null;
        }
    }

}


