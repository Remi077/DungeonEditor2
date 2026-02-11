import { ECT } from '../Entity.js';

// Holds dialog-related data for entities that can display dialog
export default class DialogComponent {
    constructor(dialogId) {
        this.type = ECT.DIALOG;

        // Reference to dialog data in dialogs.json
        this.dialogId = dialogId;

        // Current line index in the dialog sequence
        this.currentLineIndex = 0;

        // Track if dialog has been read (for one-time dialogs)
        this.hasBeenRead = false;

        // Whether this dialog should loop back to start
        this.loops = true;

        // Reference to source DialogComponent (for singleton pattern)
        // When singleton dialog is used, this stores the original NPC's DialogComponent
        // so state can be copied back after dialog closes
        this.sourceDialog = null;

        console.log("created dialog for dialogId ", dialogId);
    }

    reset() {
        this.currentLineIndex = 0;
    }
}

