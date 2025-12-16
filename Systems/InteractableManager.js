// @ts-nocheck
import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from '../Entities/Entity.js';


export default class InteractableManager {
    constructor(game) {
        this.game = game;
        this.animatorManager = game.systems.animatorManager;
    }

    doorInteract(doorEntity) {
        const animator = doorEntity.animator;
        const interact = doorEntity.interactable;
        if (!animator || !interact) return;

        if (interact.open) {
            // Close the door
            this.animatorManager.play(
                doorEntity, 
                null, // pick first action
                false,
                false,
                true, // play backwards
                () => {this.game.activeEntities.delete(doorEntity);} //called at end of animation
            ); 
            interact.open = false;
        } else {
            // Open the door
            this.animatorManager.play(
                doorEntity, 
                null, // pick first action
                false,
                false,
                false, // play forwards
                () => {this.game.activeEntities.delete(doorEntity);} //called at end of animation
            ); 
            interact.open = true;
        }
        this.game.activeEntities.add(doorEntity);
    }


    switchInteract(switchEntity) {
        const interact = switchEntity.interactable;
        const root = switchEntity.visual?.root;
        const switchTarget = root.children[0];
        const switchTargetEntity = switchTarget?.userData?.entity;
        if (!interact || !switchTargetEntity) return;
        const animator = switchTargetEntity.animator;
        if (!interact || !animator) return;
        if (interact.open) {
            // Turn off the switch
            this.animatorManager.play(
                switchTargetEntity, 
                null, 
                false,
                false,
                true,
                () => {this.game.activeEntities.delete(switchTargetEntity);} //called at end of animation
            ); // play backwards
            interact.open = false;
        } else {
            // Turn on the switch
            this.animatorManager.play(
                switchTargetEntity,
                null,
                false,
                false,
                false,
                () => {this.game.activeEntities.delete(switchTargetEntity);} //called at end of animation
                ); // play forwards
            interact.open = true;
        }
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