import { ECT } from '../Entities/Entity.js';

export default class DialogManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.dialogData = null;
        this.activeEntity = null;
        
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
        // Query entities with DIALOG component that are active
        // Using world.query automatically filters for active entities
        for (const entity of this.world.query(ECT.DIALOG)) {
            if (!this.activeEntity) {
                // New dialog activated
                this.activeEntity = entity;
                this.showDialog(entity);
            }
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
        const line = dialogContent.lines[dialog.currentLineIndex];
        
        // Update UI
        this.dialogBox.style.display = 'flex';
        this.speakerName.textContent = line.speaker;
        this.dialogText.textContent = line.text;
        
        // Mark as read
        dialog.hasBeenRead = true;
        
        // Tell UIManager dialog is active (for input blocking)
        this.game.systems.uiManager.uiState.isDialogActive = true;
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

        // Reset dialog state
        if (dialog.loops) {
            dialog.currentLineIndex = 0;
        } else {
            dialog.currentLineIndex = 0;
        }

        // Deactivate the entity using world.setActive pattern
        this.world.setActive(this.activeEntity, false);

        // Hide UI
        if (this.dialogBox) {
            this.dialogBox.style.display = 'none';
        }

        // Tell UIManager dialog is no longer active
        this.game.systems.uiManager.uiState.isDialogActive = false;

        this.activeEntity = null;
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
        this.continuePrompt.textContent = 'Press E to continue...';
        this.dialogBox.appendChild(this.continuePrompt);
        
        document.body.appendChild(this.dialogBox);
    }
}

