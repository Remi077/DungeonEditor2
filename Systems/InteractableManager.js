// @ts-nocheck

export default class InteractableManager {
    constructor(game) {
        this.game = game;
    }

    doorInteract(doorEntity) {
        const anim = doorEntity.animator;
        const interact = doorEntity.interactable;
        if (!anim || !interact) return;

        interact.open = !interact.open;
        anim.desiredAnimation.set(null, // null: pick first action
        {
            play: true,
            reverse: !interact.open, //play reverse to close the door
            callback: () => {this.game.activeEntities.delete(doorEntity);} //called at end of animation
        })
        this.game.activeEntities.add(doorEntity);
    }

    switchInteract(switchEntity) {
        const interact = switchEntity.interactable;
        const root = switchEntity.visual?.root;
        const switchTarget = root.children[0];
        const switchTargetEntity = switchTarget?.userData?.entity;
        if (!interact || !switchTargetEntity) return;
        const anim = switchTargetEntity.animator;
        if (!interact || !animator) return;

        interact.open = !interact.open;
        anim.desiredAnimation.set(null, // null: pick first action
        {
            play: true,
            reverse: !interact.open, //play reverse to close the door
            callback: () => {this.game.activeEntities.delete(switchTargetEntity);} //called at end of animation
        })
        this.game.activeEntities.add(switchTargetEntity);
    }

    itemInteract(itemEntity, playerEntity) {
        const inventory = playerEntity.inventory?.inventory;
        const itemMesh = itemEntity.visual?.root;
        if (!inventory || !itemMesh) return;
        itemMesh.visible = false;
        const itemName = itemEntity.name.replace(/^Action_Item_/, '').replace(/\d+$/, '');
        inventory[itemName] = (inventory[itemName] ?? 0) + 1;
        playerEntity.inventory.needsUpdate = true;
        console.log(inventory)
    }    


}