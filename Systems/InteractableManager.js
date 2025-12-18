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
            callback: () => {this.world.setActive(doorEntity, false);} //called at end of animation
        })
        this.world.setActive(doorEntity, true);
    }

    switchInteract(switchEntity) {
        const it = switchEntity.interactable;
        const root = switchEntity.visual?.root;
        const switchTarget = root.children[0];
        const switchTargetEntity = switchTarget?.userData?.entity;
        if (!it || !switchTargetEntity) return;
        const anim = switchTargetEntity.animator;
        if (!it || !animator) return;

        it.open = !it.open;
        anim.desiredAnimation.set(null, // null: pick first action
        {
            play: true,
            reverse: !it.open, //play reverse to close the door
            callback: () => {this.world.setActive(switchTargetEntity, false);} //called at end of animation
        })
        this.world.setActive(switchTargetEntity, true);
    }

    itemInteract(itemEntity) {
        const playerEntity = this.world.player;
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