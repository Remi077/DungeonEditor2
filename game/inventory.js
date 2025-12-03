// @ts-nocheck
import * as Shared from '../Shared.js';

/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
const Inventory = document.getElementById('inventory');

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
                case Shared.MODEINVENTORY:
                    //display the menu
                    Inventory.classList.remove("hidden");
                    break;
                default:
                    //hide the menu
                    Inventory.classList.add("hidden");
                    break;
            }
            break;
        default:
            break;
    }
});
