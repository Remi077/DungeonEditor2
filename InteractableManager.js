// @ts-nocheck
import * as THREE from 'three';
import Entity, { ENTITY_COMPONENT_TAGS } from './Entities/Entity.js'; // optional, for NPCs


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



}