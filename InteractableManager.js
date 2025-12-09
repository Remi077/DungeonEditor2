// @ts-nocheck
import * as THREE from 'three';
import { ENTITY_COMPONENT_TAGS } from './Entities/Entity.js';


export default class InteractableManager {
    constructor(game) {
        this.game = game;
        this.animatorManager = game.systems.animatorManager;
    }

    doorInteract(doorEntity) {
        const animator = doorEntity.get(ENTITY_COMPONENT_TAGS.ANIMATOR);
        const interact = doorEntity.get(ENTITY_COMPONENT_TAGS.INTERACTABLE);
        if (!animator || !interact) return;

        if (interact.open) {
            // Close the door
            this.animatorManager.play(doorEntity, null, true); // play backwards
            interact.open = false;
        } else {
            // Open the door
            this.animatorManager.play(doorEntity, null); // play forwards
            interact.open = true;
        }
    }


    switchInteract(switchEntity) {
        const interact = switchEntity.get(ENTITY_COMPONENT_TAGS.INTERACTABLE);
        const root = switchEntity.get(ENTITY_COMPONENT_TAGS.VISUAL)?.root;
        const switchTarget = root.children[0];
        const switchTargetEntity = switchTarget?.userData?.entity;
        if (!interact || !switchTargetEntity) return;
        const animator = switchTargetEntity.get(ENTITY_COMPONENT_TAGS.ANIMATOR);
        if (!interact || !animator) return;
        if (interact.open) {
            // Turn off the switch
            this.animatorManager.play(switchTargetEntity, null, true); // play backwards
            interact.open = false;
        } else {
            // Turn on the switch
            this.animatorManager.play(switchTargetEntity, null); // play forwards
            interact.open = true;
        }
    }

    itemInteract(itemEntity, playerEntity) {
        const inventory = playerEntity.get(ENTITY_COMPONENT_TAGS.GAMEPLAY)?.inventory;
        const itemMesh = itemEntity.get(ENTITY_COMPONENT_TAGS.VISUAL)?.root;
        if (!inventory || !itemMesh) return;
        itemMesh.visible = false;
        const itemName = itemEntity.name.replace(/^Action_Item_/, '').replace(/\d+$/, '');
        inventory[itemName] = (inventory[itemName] ?? 0) + 1;
        console.log(inventory)
    }    


}