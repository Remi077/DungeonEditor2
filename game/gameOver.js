// @ts-nocheck
import * as Shared from '../shared.js';

/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
const GameOver = document.getElementById('gameOver');
// const StartBtn = document.getElementById('gameOver-start');
// const LoadBtn  = document.getElementById('gameOver-load');
// const EditBtn  = document.getElementById('gameOver-editor');

/*-----------------------------------------------------*/
// BUTTON LISTENERS
/*-----------------------------------------------------*/
// StartBtn.addEventListener('click', () => { console.log("StartBtn");  Shared.setMode(Shared.MODEGAME); });
// LoadBtn.addEventListener('click', () => { console.log("LoadBtn"); });
// EditBtn.addEventListener('click', () => { console.log("EditBtn"); Shared.setMode(Shared.MODEEDITOR); });

/*-----------------------------------------------------*/
// CUSTOM EVENT
/*-----------------------------------------------------*/
document.addEventListener("UIChange", (e) => {
    const { field, value } = e.detail;
    switch (field) {
        case "gameModeChange":
            switch (value) {
                case Shared.MODEGAMEOVER:
                    //display the menu
                    GameOver.classList.remove("hidden");
                    break;
                default:
                    //hide the menu
                    GameOver.classList.add("hidden");
                    break;
            }
            break;
        default:
            break;
    }
});
