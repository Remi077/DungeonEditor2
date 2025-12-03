// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';

export default class LevelManager {
    constructor(scene, physicsManager) {
        this.scene = scene;
        this.physics = physicsManager;

        this.staticGroup = new THREE.Group();
        this.actionnablesGroup = new THREE.Group();
        this.lightGroup = new THREE.Group();
        this.enemySpawnGroup = new THREE.Group();
        this.rigGroup = new THREE.Group();
        this.colliderGroup = new THREE.Group();
        this.triggerGroup = new THREE.Group();

        this.loaded = false;
    }

    async loadLevel(path) {
        const arrayBuffer = await (await fetch(path)).arrayBuffer();
        const gltf = await this.loadLevelGlb(arrayBuffer);

        Array.from(gltf.scene.children).forEach(child => {
            if (child.isLight) this.lightGroup.add(child);
            else if (child.name.startsWith("Collider_")) this.colliderGroup.add(child);
            else if (child.name.startsWith("Trigger_")) this.triggerGroup.add(child);
            else if (child.name.startsWith("Action_")) this.actionnablesGroup.add(child);
            else if (child.name.startsWith("Enemy_")) this.enemySpawnGroup.add(child);
            else this.staticGroup.add(child);
        });

        // Create physics for colliders/triggers
        this.processColliders();

        this.loaded = true;
    }

    async loadLevelGlb(arrayBuffer) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.parse(arrayBuffer, '', (gltf) => {
                // gltf.scene is your loaded model
                console.log('GLB loaded:', gltf.scene);
                resolve(gltf);
            }, (error) => {
                reject(error);
            });
        });
    }

    addToScene() {
        if (!this.loaded) return;
        this.scene.add(this.staticGroup);
        this.scene.add(this.actionnablesGroup);
        this.scene.add(this.lightGroup);
        this.scene.add(this.rigGroup);
    }

    removeFromScene() {
        this.scene.remove(this.staticGroup);
        this.scene.remove(this.actionnablesGroup);
        this.scene.remove(this.lightGroup);
        this.scene.remove(this.enemySpawnGroup);
        this.scene.remove(this.rigGroup);
    }

    processColliders() {
        const physics = this.physics; // reference to your PhysicsManager

        Array.from(this.colliderGroup.children).forEach(child => {
            if (child.name.startsWith("Collider_Kine")) {
                this.physics.createKinematicColliderFromMesh(child);
            } else {
                this.physics.createStaticColliderFromMesh(child);
            }
        });

        Array.from(this.triggerGroup.children).forEach(child => {
           this.physics.createStaticColliderFromMesh(child)
           .setSensor(true); 
        });

    }

}