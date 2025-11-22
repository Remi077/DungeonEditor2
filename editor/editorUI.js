
import * as Shared from '../shared.js';
import * as Editor from './editor.js';
import * as GameHUD from '../game/gameHUD.js';
import * as Stats from '../Stats.js';


/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
const LoadBtn = document.getElementById('LoadBtn');
const SaveBtn = document.getElementById('SaveBtn');
const ResetBtn = document.getElementById('ResetBtn');
const StartBtn = document.getElementById('StartBtn');

/*-----------------------------------------------------*/
// BUTTON LISTENERS
/*-----------------------------------------------------*/
LoadBtn.addEventListener('click', () => { Editor.loadLevel(); });
SaveBtn.addEventListener('click', () => { Editor.saveLevel(); });
// BakeBtn.addEventListener('click', () => { Editor.bakeLevel(); });
ResetBtn.addEventListener('click', () => { Editor.resetLevel(); });
StartBtn.addEventListener('click', () => { Shared.toggleGameMode(); });

/*-----------------------------------------------------*/
// DOCUMENT/Shared.canvas EVENT LISTENERS
/*-----------------------------------------------------*/
//prevent right click context menu everywhere in document
document.addEventListener("contextmenu", (e) => e.preventDefault()); // prevent browser menu

const crosshair = document.getElementById("crosshair");
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === Shared.canvas) {

        // --- Locked mode: fixed at center ---
        crosshair.style.display = "block";
        crosshair.style.position = "absolute";
        crosshair.style.top = "50%";
        crosshair.style.left = "50%";
        crosshair.style.transform = "translate(-50%, -50%)";

    } else {
        // console.log("Pointer unlocked");
        Shared.resetAllActions();
        crosshair.style.display = "none";
    }
});

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/
// Prevent default right-click menu
Shared.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

/*---------------------------------*/
// Track hover state
/*---------------------------------*/
Shared.canvas.addEventListener("mouseenter", () => {
    Shared.setIsMouseOverCanvas(true);
});

Shared.canvas.addEventListener("mouseleave", () => {
    Shared.setIsMouseOverCanvas(false);
});

/*-----------------------------------------------------*/
// WINDOW RESIZE
/*-----------------------------------------------------*/
window.addEventListener('resize', () => {
    resizeRenderer();
});

function resizeRenderer() {
    // Resize the 3D Shared.canvas
    Shared.renderer.setSize(Shared.container.clientWidth, Shared.container.clientHeight);
    Shared.camera.aspect = Shared.container.clientWidth / Shared.container.clientHeight;
    Shared.camera.updateProjectionMatrix();

    // Resize the HUD canvas
    GameHUD.hudCanvas.width = Shared.container.clientWidth;
    GameHUD.hudCanvas.height = Shared.container.clientHeight;
}

/*-----------------------------------------------------*/
// KEYBOARD INPUTS
/*-----------------------------------------------------*/
document.addEventListener('keydown', (event) => {
    Shared.onKeyDownEvent(event);
});
document.addEventListener('keyup', (event) => {
    Shared.onKeyUpEvent(event);
});

/*-----------------------------------------------------*/
// CUSTOM EVENT
/*-----------------------------------------------------*/
document.addEventListener("UIChange", (e) => {
    const { field, value } = e.detail;
    switch (field) {
        case "gameModeChange":
            switch (value) {
                case Shared.MODEMENU || Shared.MODEGAMEOVER:
                    //hide the uipanel in game mode and resize renderer
                    Shared.uipanel.classList.add("hidden");
                    break;
                case Shared.MODEEDITOR:
                    //re-add the uipanel in editor mode and resize renderer
                    Shared.uipanel.classList.remove("hidden");
                    Stats.dockStats(true);
                    break;
                case Shared.MODEGAME:
                    //hide the uipanel in game mode and resize renderer
                    Shared.uipanel.classList.add("hidden");
                    Stats.dockStats(false);
                    break;
                default:
                    console.warn("game mode unsupported:", value);
                    break;
            }
            resizeRenderer();
            break;
        case "modeChange":
            document.querySelectorAll("#ui-panel .tab-header").forEach(
                h => {
                    const mode = h.dataset.mode;
                    if (mode == value) {
                        console.log("match mode found");
                        expandHeader(h);
                    }
                }
            );
            break;
        default:
            break;
    }
});

/*-----------------------------------------------------*/
// TAB EVENTS
/*-----------------------------------------------------*/
document.querySelectorAll("#ui-panel .tab-header").forEach(header =>
    header.addEventListener("click", () => expandHeader(header))
);

function expandHeader(header) {
    {
        const tab = header.parentElement;
        const isActive = tab.classList.contains("active");

        // Collapse all tabs
        document.querySelectorAll("#ui-panel .tab").forEach(
            t => {
                t.classList.remove("active");
            });
        document.querySelectorAll("#ui-panel .tab-header").forEach(
            h => {
                h.classList.remove("green")
            });

        // Expand if it wasn't already open
        if (!isActive) {
            tab.classList.add("active");
            header.classList.add("green");

            // Call setAddMode if the header has a mode
            const mode = parseInt(header.dataset.mode, 10);
            Editor.setAddMode(mode);

        }
    }
}

/*-----------------------------------------------------*/
// setupEditorUI
/*-----------------------------------------------------*/
export function setupEditorUI() {

}
