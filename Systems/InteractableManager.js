import { GLB_PREFIX, USER_DATA_FIELDS } from "../Constants.js";

export default class InteractableManager {
    constructor(game) {
        this.game = game;
        this.world = game.world;
    }

    doorInteract(doorEntity) {
        const anim = doorEntity.animator;
        const it = doorEntity.interactable;
        if (!anim || !it) return;

        // Check if door is locked
        if (it.locked) {
            // Load singleton dialog entity with locked message
            const dialogEntity = this.world.dialogSingletonEntity;
            const dialogId = doorEntity.name.startsWith(GLB_PREFIX.ACTION_DOOR)
                ? 'door_locked'
                : 'chest_locked';

            dialogEntity.dialog.dialogId = dialogId;
            dialogEntity.dialog.currentLineIndex = 0;
            dialogEntity.dialog.sourceDialog = null; // No source (stateless)
            this.world.setActive(dialogEntity, true);
            return;
        }

        it.open = !it.open;
        anim.desiredAnimation.set(null, // null: pick first action
        {
            play: true,
            reverse: !it.open, //play reverse to close the door
            clampWhenFinished: true,
            callback: () => {this.world.setActive(doorEntity, false);} //called at end of animation
        })
        this.world.setActive(doorEntity, true);
    }

    switchInteract(switchEntity) {
        const it = switchEntity.interactable;
        const root = switchEntity.visual?.root;
        const switchTarget = root.children[0];
        const switchTargetEntity = switchTarget?.userData?.[USER_DATA_FIELDS.INTERACT_ENTITY];
        if (!it || !switchTargetEntity) return;
        const anim = switchTargetEntity.animator;
        if (!it || !anim) return;

        it.open = !it.open;
        anim.desiredAnimation.set(null, // null: pick first action
        {
            play: true,
            reverse: !it.open, //play reverse to close the door
            clampWhenFinished: true,
            callback: () => {this.world.setActive(switchTargetEntity, false);} //called at end of animation
        })
        this.world.setActive(switchTargetEntity, true);
    }

    itemInteract(itemEntity) {
        const playerEntity = this.world.player;
        // const inventory = playerEntity.inventory?.inventory;
        const inventory = playerEntity.inventory;
        const itemMesh = itemEntity.visual?.root;
        if (!inventory || !itemMesh) return;
        itemMesh.visible = false;

        const itemId = itemEntity.name
            .replace(new RegExp(`^${GLB_PREFIX.ACTION_ITEM}_?`), '')
            .replace(/\d+$/, '');

        inventory.addItem(itemId, 1);
        // inventory[itemName] = (inventory[itemName] ?? 0) + 1;
        // playerEntity.inventory.needsUpdate = true;
        // console.log(inventory)
    }

    dialogInteract(npcEntity) {
        const npcDialog = npcEntity.dialog;
        if (!npcDialog) return;

        // Copy NPC dialog state to singleton dialog entity
        const dialogEntity = this.world.dialogSingletonEntity;
        const singletonDialog = dialogEntity.dialog;

        singletonDialog.dialogId = npcDialog.dialogId;
        singletonDialog.currentLineIndex = npcDialog.currentLineIndex;
        singletonDialog.hasBeenRead = npcDialog.hasBeenRead;
        singletonDialog.loops = npcDialog.loops;
        singletonDialog.sourceDialog = npcDialog; // Store component reference for state copy-back

        // Activate the singleton dialog entity
        this.world.setActive(dialogEntity, true);
    }


}