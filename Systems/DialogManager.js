import Entity from '../Entities/Entity.js';
import DialogComponent from '../Entities/Components/DialogComponent.js';

export default class DialogManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.dialogData = null;
        this.activeEntity = null;
        this.dialogJustOpened = false; // Frame skip hack to prevent first line skip

        // Create singleton dialog entity
        this.dialogEntity = new Entity("DialogUI");
        this.dialogEntity.addComponent(new DialogComponent(null)); // dialogId set dynamically
        this.world.addEntity(this.dialogEntity); // Add to world but keep inactive

        // Store convenient reference in world (like world.player)
        this.world.dialogSingletonEntity = this.dialogEntity;

        // UI elements
        this.dialogBox = null;
        this.speakerName = null;
        this.dialogText = null;
        this.continuePrompt = null;
        this.styleTag = null;
    }
    
    async loadDialogData(path) {
        try {
            const response = await fetch(path);
            this.dialogData = await response.json();
            console.log('Dialog data loaded:', Object.keys(this.dialogData).length, 'dialogs');
        } catch (error) {
            console.error('Error loading dialog data:', error);
        }
    }
    
    update(dt, actions) {
        // Check if our singleton dialog entity is active
        if (this.world.isActive(this.dialogEntity) && !this.activeEntity) {
            // New dialog activated - set frame skip flag
            this.activeEntity = this.dialogEntity;
            this.dialogJustOpened = true;
            this.showDialog(this.dialogEntity);
            return; // Skip this frame's interact action
        }

        // Frame skip hack: if dialog just opened, skip this frame's interact action
        if (this.dialogJustOpened) {
            this.dialogJustOpened = false;
            return;
        }

        // Handle dialog progression
        if (this.activeEntity && actions.interact) {
            this.nextLine();
        }
    }
    
    showDialog(entity) {
        const dialog = entity.dialog;
        const dialogId = dialog.dialogId;

        if (!this.dialogData || !this.dialogData[dialogId]) {
            console.error('Dialog not found:', dialogId);
            return;
        }

        // Create UI if it doesn't exist
        if (!this.dialogBox) {
            this.createDialogUI();
        }

        // Get current line
        const dialogContent = this.dialogData[dialogId];

        // Guard: if currentLineIndex is out of bounds, reset to 0
        if (dialog.currentLineIndex >= dialogContent.lines.length) {
            dialog.currentLineIndex = 0;
        }

        const line = dialogContent.lines[dialog.currentLineIndex];

        // Update UI
        this.dialogBox.style.display = 'flex';
        this.speakerName.textContent = line.speaker;
        this.dialogText.textContent = line.text;

        // Mark as read
        dialog.hasBeenRead = true;

        // Tell UIManager dialog is active (for input blocking)
        this.game.systems.uiManager.uiState.isDialogActive = true;

        // console.log("SHOWDIALOG")
    }
    
    nextLine() {
        if (!this.activeEntity) return;
        
        const dialog = this.activeEntity.dialog;
        const dialogId = dialog.dialogId;
        const dialogContent = this.dialogData[dialogId];
        
        // Move to next line
        dialog.currentLineIndex++;
        
        // Check if we've reached the end
        if (dialog.currentLineIndex >= dialogContent.lines.length) {
            this.hideDialog();
        } else {
            // Show next line
            const line = dialogContent.lines[dialog.currentLineIndex];
            this.speakerName.textContent = line.speaker;
            this.dialogText.textContent = line.text;
        }
    }
    
    hideDialog() {
        if (!this.activeEntity) return;

        const dialog = this.activeEntity.dialog;

        // If this was an NPC dialog, copy state back to the source component
        if (dialog.sourceDialog) {
            dialog.sourceDialog.hasBeenRead = dialog.hasBeenRead;
            dialog.sourceDialog.currentLineIndex = dialog.loops ? 0 : dialog.currentLineIndex;
        }

        // Reset singleton dialog state
        dialog.currentLineIndex = 0;
        dialog.dialogId = null;
        dialog.sourceDialog = null;

        // Deactivate the singleton dialog entity
        this.world.setActive(this.activeEntity, false);

        // Hide UI
        if (this.dialogBox) {
            this.dialogBox.style.display = 'none';
        }

        // Tell UIManager dialog is no longer active
        this.game.systems.uiManager.uiState.isDialogActive = false;

        this.activeEntity = null;
        // console.log("HIDEDIALOG")

    }
    
    createDialogUI() {
        // Add dynamic CSS
        if (!this.styleTag) {
            this.styleTag = document.createElement('style');
            this.styleTag.textContent = `
                #dialog-box {
                    position: absolute;
                    bottom: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 80%;
                    max-width: 800px;
                    background: rgba(0, 0, 0, 0.9);
                    border: 3px solid #666;
                    border-radius: 10px;
                    padding: 20px;
                    color: white;
                    font-family: sans-serif;
                    display: none;
                    flex-direction: column;
                    z-index: 1000;
                }
                
                #dialog-speaker {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #4CAF50;
                    margin-bottom: 10px;
                }
                
                #dialog-text {
                    font-size: 1em;
                    line-height: 1.5;
                    margin-bottom: 10px;
                }
                
                #dialog-continue {
                    font-size: 0.9em;
                    color: #aaa;
                    text-align: right;
                    font-style: italic;
                }
            `;
            document.head.appendChild(this.styleTag);
        }
        
        // Create dialog box
        this.dialogBox = document.createElement('div');
        this.dialogBox.id = 'dialog-box';
        
        this.speakerName = document.createElement('div');
        this.speakerName.id = 'dialog-speaker';
        this.dialogBox.appendChild(this.speakerName);
        
        this.dialogText = document.createElement('div');
        this.dialogText.id = 'dialog-text';
        this.dialogBox.appendChild(this.dialogText);
        
        this.continuePrompt = document.createElement('div');
        this.continuePrompt.id = 'dialog-continue';
        this.continuePrompt.textContent = navigator.maxTouchPoints > 0 ? 'Tap to continue...' : 'Press E to continue...';
        this.dialogBox.appendChild(this.continuePrompt);

        // Mobile: tap dialog box to advance
        this.dialogBox.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.activeEntity && !this.dialogJustOpened) {
                this.nextLine();
            }
        }, { passive: false });

        document.body.appendChild(this.dialogBox);
    }
}

