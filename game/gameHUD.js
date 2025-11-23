import * as Shared from '../shared.js';
import * as THREE from 'three';
//OTHER IMPORTS FORBIDDEN! CIRCULAR DEPENDENCIES

// HUD variables
let messageScreen        = "";
let messageScale         = 0;
let messageTargetScale   = 1;
let messageScaleDuration = 0.8;                                        //in seconds
let messageScaleSpeed    = messageTargetScale / messageScaleDuration;

// Create a 2D canvas for overlay
export const hudCanvas = document.getElementById('hud-canvas');
hudCanvas.width = Shared.container.clientWidth;
hudCanvas.height = Shared.container.clientHeight;


const hudContext = hudCanvas.getContext('2d');

// Clear the canvas (transparent background)
hudContext.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

// Example: Draw a simple text overlay (debugging HUD)
hudContext.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white
hudContext.font = '20px Arial';

/*---------------------------------*/
// setMessageScreen
/*---------------------------------*/
export function setMessageScreen(s) {
    messageScreen=s;
}

/*---------------------------------*/
// drawHUD
/*---------------------------------*/
export function drawHUD(delta = 1) {
    // Clear the canvas for redrawing
    hudContext.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

    // Text box styles
    hudContext.font = '20px Arial';
    hudContext.textAlign = 'left';

    // Draw "Score" at the top-left corner with a surrounding rectangle
    const scoreText = ` `;
    const scoreMetrics = hudContext.measureText(scoreText);
    const scorePadding = 10; // Padding for the rectangle
    const scoreRectWidth = scoreMetrics.width + scorePadding * 2;
    const scoreRectHeight = 30; // Fixed height for simplicity
    hudContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    hudContext.fillStyle = 'White';
    hudContext.fillText(scoreText, 10, 25); // Text inside rectangle

    // Draw "Lives" at the top-right corner with a surrounding rectangle
    hudContext.textAlign = 'right';
    const livesText = ` `;
    const livesMetrics = hudContext.measureText(livesText);
    const livesRectWidth = livesMetrics.width + scorePadding * 2;
    const livesRectX = hudCanvas.width - livesRectWidth - 5; // Position from the right edge
    hudContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    hudContext.fillStyle = 'White';
    hudContext.fillText(livesText, hudCanvas.width - 10, 25); // Text inside rectangle

    // Scaling the "Game Over" message
    if (messageScale < messageTargetScale) {
        messageScale += messageScaleSpeed * delta; // Gradually increase the scale
        if (messageScale > messageTargetScale) {
            messageScale = messageTargetScale; // Clamp to the target scale
        }
    }

    hudContext.save(); // Save the current canvas state
    hudContext.translate(hudCanvas.width / 2, hudCanvas.height / 2); // Move to the center
    hudContext.scale(messageScale, messageScale); // Apply scaling

    // Draw the "Game Over" message
    hudContext.font = '60px Arial';
    hudContext.textAlign = 'center';
    hudContext.fillStyle = 'rgba(255, 0, 0, 0.9)';
    hudContext.fillText(messageScreen, 0, 20); // Text is now centered and scaled
    hudContext.restore(); // Restore the original canvas state

}

const healthBar = document.getElementById("health-bar")

// Update the health UI:
export function updateHealthBar(currentHealth, maxHealth) {
  const hpPercent = (currentHealth / maxHealth) * 100;
  document.getElementById("health-bar").style.width = hpPercent + "%";
}


export function createHealthBar(width = 1, height = 0.15, backgroundColor = 0x550000, foregroundColor = 0x00ff00) {
    const group = new THREE.Group();
    group.name="healthbar";

    // Background
    const bgGeom = new THREE.PlaneGeometry(width, height);
    const bgMat = new THREE.MeshBasicMaterial({ color: backgroundColor });
    const bg = new THREE.Mesh(bgGeom, bgMat);
    bg.name= "hp_bg";
    group.add(bg);

    // Foreground (actual health)
    const fgGeom = new THREE.PlaneGeometry(width, height);
    const fgMat = new THREE.MeshBasicMaterial({ color: foregroundColor });
    const fg = new THREE.Mesh(fgGeom, fgMat);
    fg.position.z = 0.001; // avoid z-fighting
    fg.name= "hp_fg";
    group.add(fg);

    // Store for later updates
    group.healthForeground = fg;
    group.fullWidth = width;

    group.visible = false;

    return group;
}

export function updateFloatingHealthBar(enemyCharacterState) {

    const percent = enemyCharacterState.health / enemyCharacterState.maxHealth;
    const fg = enemyCharacterState.healthBar.healthForeground;
    const bg = enemyCharacterState.healthBar.children[0];

    fg.scale.x = percent;
    fg.position.x = -(enemyCharacterState.healthBar.fullWidth * (1 - percent)) / 2;

    enemyCharacterState.healthBar.visible = true;
    enemyCharacterState.timeSinceHealthBarShowedUp = 0;

}