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

    dialogInteract(dialogEntity) {
        const dialog = dialogEntity.dialog;
        if (!dialog) return;

        // Activate the entity - DialogManager will pick it up in its update loop
        this.world.setActive(dialogEntity, true);
    }


}