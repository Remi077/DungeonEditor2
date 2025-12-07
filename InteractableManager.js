// @ts-nocheck
import * as THREE from 'three';
import Entity from './Entities/Entity.js'; // optional, for NPCs


export default class InteractableManager {
    constructor() {
    }

    doorInteract(doorEntity) {
        const visual = doorEntity.get('Visual');
        const transform = doorEntity.get('Transform');
        const animator = doorEntity.get('Animator');
        if (!animator || !visual) return;

        const doorOpenAction = animator.animationActions.get('DoorOpen');
        const doorCloseAction = animator.animationActions.get('DoorClose');

        if (doorEntity.isOpen) {
            // Close the door
            if (doorCloseAction) {
                doorCloseAction.reset().play();
            }
            doorEntity.isOpen = false;
        } else {
            // Open the door
            if (doorOpenAction) {
                doorOpenAction.reset().play();
            }
            doorEntity.isOpen = true;
        }   
    }



}