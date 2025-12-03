import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';

import TransformComponent from './Entities/Components/TransformComponent';
import PhysicsBodyComponent from './Entities/Components/PhysicsBodyComponent';
import AnimatorComponent from './Entities/Components/AnimatorComponent';
import PlayerControllerComponent from './Entities/Components/PlayerControllerComponent';
import GameplayComponent from './Entities/Components/GameplayComponent';
import WeaponComponent from './Entities/Components/WeaponComponent';
import AIComponent from './Entities/Components/AIComponent'; // optional, for NPCs


class CharacterPrefab {
    constructor() {
        this.name = "";
        this.root = null;        // template armature hierarchy
        this.weaponBoneName = "";
        this.weaponName = "";

        this.animationClips = new Map();  // parsed once
        this.lowerBodyClip = null;

        this.capsuleRadius = 0;
        this.capsuleHeight = 0;
        this.colliderOffset = new THREE.Vector3();

        this.isLoaded = false;
    }
}


export default class CharacterManager {
    constructor(game) {
        this.game = game;
        this.loader = new GLTFLoader();

        this.charaPrefabMap = new Map(); // multiple character types

        this.entities = [];
    }

    async loadCharacter(path, characterType) {
        if (this.charaPrefabMap.has(characterType)) return; // load character gltf only once;
        const arrayBuffer = await (await fetch(path)).arrayBuffer();
        const gltf = await this.loadGlb(arrayBuffer);

        this.prefab = new CharacterPrefab();
        this.prefab.name = characterType;

        const isPlayerPrefab = characterType === "player";

        // 1. Parse armature / weapon / skeleton
        this.processHierarchy(gltf.scene, this.prefab, isPlayerPrefab);

        // 2. Extract animations
        this.processAnimations(gltf.animations, this.prefab);

        // 3. Compute collision data once
        this.computeColliderFromMesh(this.prefab);        

        // 4. store the raw prefab for instancing
        this.charaPrefabMap.set(characterType, gltf);
    }

    async loadGlb(arrayBuffer) {
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

    processHierarchy(scene, prefab, isPlayerPrefab) {
        scene.children.forEach((child) => {
            scene.traverse(child => {
                if (child.name.startsWith("Armature")) prefab.root = child;
                if (child.isSkinnedMesh) {child.frustumCulled = !isPlayerPrefab;};
                if (child.name.startsWith("weapon")) {
                    child.frustumCulled = !isPlayerPrefab;
                    prefab.weaponName = prefab.weapon?.name;
                    prefab.weaponBoneName = prefab.weapon?.parent?.name;
                }
            });
        });
    }

    processAnimations(animations, prefab) {
        animations.forEach(clip => {
            prefab.animationClips.set(clip.name, clip);
        });
    }

    spawnPlayer(characterType, spawnPosition) {

        const prefab = this.charaPrefabMap.get(characterType);
        if (!prefab) throw new Error(`player prefab '${characterType}' not loaded`);

        const player = this.instantiateCharacter(prefab, {
            isPlayer: true,
            position: spawnPosition
        });

        return player;
    }

    spawnCharacter(characterType, spawnPosition) {

        const prefab = this.charaPrefabMap.get(characterType);
        if (!prefab) throw new Error(`character prefab '${characterType}' not loaded`);

        return this.instantiateCharacter(prefab, {
            isPlayer: false,
            position: spawnPosition
        });
    }

    instantiateCharacter(prefab, options) {
        const root = prefab.scene.clone(true);

        // Prepare animations
        const mixer = new THREE.AnimationMixer(root);
        const clips = prefab.animations;

        const entity = new Entity();

        //components
        entity.addComponent(new TransformComponent());
        //entity.addComponent(new PhysicsBodyComponent(playerBody, playerCollider));
        //entity.addComponent(new AnimatorComponent(skeleton, mixer));
        //entity.addComponent(new PlayerControllerComponent(inputManager));
        //entity.addComponent(new GameplayComponent());
        //entity.addComponent(new WeaponComponent());
        //entity.addComponent(new AIComponent()); // optional, for NPCs

        //add extra options
        if (options?.isPlayer) {
            entity.addComponent(new PlayerControllerComponent(this.game.systems.input));
            entity.
        } else {
            entity.addComponent(new AIComponent());
        }

        // Add to scene
        this.game.services.scene.add(root);

        this.entities.push(entity);

        return entity;
    }
}
