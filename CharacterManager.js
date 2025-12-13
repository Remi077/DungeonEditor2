import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import * as Shared from '../Shared.js';
import * as SkeletonUtils from 'SkeletonUtils';

import Entity, { ENTITY_TYPES } from './Entities/Entity.js'; // optional, for NPCs
import TransformComponent from './Entities/Components/TransformComponent.js';
import VisualComponent from './Entities/Components/VisualComponent.js';
import PhysicsBodyComponent from './Entities/Components/PhysicsBodyComponent.js';
import AnimatorComponent from './Entities/Components/AnimatorComponent.js';
import PlayerControllerComponent from './Entities/Components/PlayerControllerComponent.js';
import GameplayComponent from './Entities/Components/GameplayComponent.js';
import WeaponComponent from './Entities/Components/WeaponComponent.js';
import AIComponent from './Entities/Components/AIComponent.js'; // optional, for NPCs
import PathFindingComponent from './Entities/Components/PathFindingComponent.js'; // optional, for NPCs


class CharacterPrefab {
    constructor() {
        this.name = "";
        this.root = null;        // template armature hierarchy
        this.weaponBoneName = "";
        this.weaponMeshName = "";

        //Animations
        this.animationClips = new Map();  // parsed once

        //Collider + Physics
        this.weaponColliderMesh = null;
        this.weaponBodyDesc = null;
        this.weaponColliderDesc = null;
        this.weaponCollisionGroups = null;
        this.weaponOffsetRootToBody = new THREE.Vector3();
        this.attackDamageStart = 0;
        this.attackDamageEnd = 0;

        //Physics template
        this.capsuleRadius = Shared.playerRadius; //temp should be calculated from mesh BB or dedicated mesh
        this.capsuleHeight = Shared.playerHeight; // temp see above
        this.offsetRootToBody = new THREE.Vector3(0, this.capsuleHeight * 0.5, 0);
        this.collisionGroup = null;

        this.isLoaded = false;
    }
}


export default class CharacterManager {
    constructor(game) {
        this.game = game;
        this.loader = new GLTFLoader();

        this.charaPrefabMap = new Map(); // multiple character types

        // this.entities = [];
    }

    async loadCharacter(path, characterType) {
        if (this.charaPrefabMap.has(characterType)) return; // load character gltf only once;
        const arrayBuffer = await (await fetch(path)).arrayBuffer();
        const gltf = await this.loadGlb(arrayBuffer);

        this.prefab = new CharacterPrefab();
        this.prefab.name = characterType;

        const isPlayerPrefab = characterType === ENTITY_TYPES.PLAYER;

        // 1. Parse armature / weapon / skeleton
        this.processHierarchy(gltf.scene, this.prefab, isPlayerPrefab);

        // 2. Extract animations
        this.processAnimations(gltf.animations, this.prefab);

        // 3. Compute collision data once
        this.computeColliderFromMesh(gltf.scene, this.prefab, isPlayerPrefab);        

        // 4. store the raw prefab for instancing
        this.charaPrefabMap.set(characterType, this.prefab);
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
        scene.traverse(child => {
            if (child.name.startsWith("Armature")) prefab.root = child;
            if (child.isSkinnedMesh) {child.frustumCulled = !isPlayerPrefab;};
            if (child.name.startsWith("weapon")) {
                child.frustumCulled = !isPlayerPrefab;
                prefab.weaponBoneName = prefab.weapon?.parent?.name;
                prefab.weaponMeshName = prefab.weapon?.name;
            }
            if (child.name.startsWith("Collider_Kine")) prefab.weaponColliderMesh = child;
        });
    }

    processAnimations(animations, prefab) {
        animations.forEach(clip => {
            prefab.animationClips.set(clip.name, clip);
            if (clip.name === Shared.ANIM_WALK_NAME) {
                const walkLowerClip = this.makePartialClip(clip, Shared.lowerBodyBones);
                prefab.animationClips.set(Shared.ANIM_WALK_NAME_L, walkLowerClip);
            }
        });
    }

    makePartialClip(clip, boneNames) {
        const filteredTracks = clip.tracks.filter(track => {
            return boneNames.some(name => track.name.startsWith(name));
        });
        return new THREE.AnimationClip(clip.name + '_partial', clip.duration, filteredTracks);
    }

    computeColliderFromMesh(scene, prefab, isPlayerPrefab) {
        scene.traverse((child) => {
            if (!child.isMesh) return;
            if (!child.name.startsWith("Collider_Kine")) return;

            // Example name: Collider_Kine_weapon
            const [,relatedName] = child.name.match(/Collider_Kine_(.*)$/);
            if (!relatedName) return;

            // --- 1. LOCAL transforms of collider placeholder object ---
            const childRot = child.quaternion.clone();
            const childPos = child.position.clone();
            const childScale = child.scale.clone();

            // --- 2. Compute bounding box ---
            child.geometry.computeBoundingBox();
            const bbox = child.geometry.boundingBox.clone();

            const size = new THREE.Vector3();
            bbox.getSize(size);

            const center = new THREE.Vector3();
            bbox.getCenter(center);

            // Apply object scale
            size.multiply(childScale);

            // Half extents for RAPIER cuboid
            const halfExtents = {
                x: size.x * 0.5,
                y: size.y * 0.5,
                z: size.z * 0.5,
            };

            // --- 3. Compute final center position (apply rotation to bbox center) ---
            const rotatedCenter = center.clone().applyQuaternion(childRot);
            const worldCenter = childPos.clone().add(rotatedCenter);

            // --- 4. Find the corresponding mesh the collider belongs to ---
            const relatedMesh = scene.getObjectByName(relatedName);
            if (!relatedMesh)
                throw new Error(`Collider '${child.name}' references missing mesh '${relatedName}'`);

            const meshWorldPos = relatedMesh.getWorldPosition(new THREE.Vector3());
            const offsetRootToBody = worldCenter.clone().sub(meshWorldPos);

            // --- 5. Create reusable body and collider descriptors ---
            const weaponBodyDesc = {
                translation: worldCenter,
                rotation: childRot,
            };

            // const weaponColliderDesc = {
            //     halfExtents: halfExtents,
            // };

            // --- 6. Collision groups ---
            let weaponCollisionGroups = Shared.COL_MASKS.ENEMYWPN;
            if(isPlayerPrefab)
                weaponColliderDesc.collisionGroups = Shared.COL_MASKS.PLAYERWPN;

            // --- 7. Store inside prefab ---
            prefab.weaponBodyDesc = weaponBodyDesc;
            prefab.weaponCollisionGroups = weaponCollisionGroups;
            prefab.weaponOffsetRootToBody.copy(offsetRootToBody);
            if(isPlayerPrefab){
                prefab.attackDamageStart = 0.2;
                prefab.attackDamageEnd = null; //end of animation
            } else {
                prefab.attackDamageStart = 0.5;
                prefab.attackDamageEnd = 0.5+0.3;
            }

            // --- 8. Store collider info for character capsule ---
            prefab.capsuleRadius = isPlayerPrefab ? Shared.playerRadius : Shared.playerRadius*0.5 ; //temp should be calculated from mesh BB or dedicated mesh
            prefab.capsuleHeight = Shared.playerHeight; // temp see above
            prefab.collisionGroup = isPlayerPrefab ? Shared.COL_MASKS.PLAYER : Shared.COL_MASKS.ENEMY;

            // optionally:
            prefab.weaponName = relatedName;
        })
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

    spawnCharacter(characterType, spawnPosition, spawnRotation, patrolPath = []) {

        const prefab = this.charaPrefabMap.get(characterType);
        if (!prefab) throw new Error(`character prefab '${characterType}' not loaded`);

        return this.instantiateCharacter(prefab, {
            isPlayer: false,
            position: spawnPosition,
            rotation: spawnRotation,
            patrolPath: patrolPath,
        });
    }

    instantiateCharacter(prefab, options) {
        const entity = new Entity(prefab.name, 
            options?.isPlayer ?
            ENTITY_TYPES.PLAYER :
            ENTITY_TYPES.CHARACTER
        );

        // const camPos = this.game.yawObject.position;
        // const camPos = ;
        const rootPos = options?.position.clone();
        const bodyPos = rootPos.clone();
        bodyPos.add(prefab.offsetRootToBody);
        const rootRot = options?.rotation?.clone() || new THREE.Euler();

        // 1. VisualComponent with cloned armature / skinned mesh
        const root = SkeletonUtils.clone(prefab.root); // Clone skinned mesh + skeleton
        const visualComponent = new VisualComponent(root)
        visualComponent.setFrustumCulled(!(options?.isPlayer));

        // 2. Traverse cloned root to find skeleton
        let clonedSkeleton = null;
        root.traverse(obj => {
            if (obj.isSkinnedMesh && !clonedSkeleton) {
                clonedSkeleton = obj.skeleton;
            }
        });

        // 3. Create PhysicsBodyComponent with capsule collider
        const physicsManager = this.game.systems.physicsManager;

        const playerBody = physicsManager.createKinematicRigidBody(
            bodyPos || new THREE.Vector3(0, 0, 0), 
            //add rotation
            rootRot,
            options?.isPlayer ? "Player" : "NPC"
        );
        const playerCollider = physicsManager.createCapsuleCollider(
             prefab.capsuleRadius,
             (prefab.capsuleHeight * 0.5) - prefab.capsuleRadius,
             prefab.collisionGroup
        , playerBody);
        if (!playerCollider.userData) playerCollider.userData = {};
        playerCollider.userData.entity = entity;//annotate the collider with entity for fast lookup on weapon collision
        const physicsBodyComponent = new PhysicsBodyComponent(playerBody, playerCollider);

        physicsBodyComponent.capsuleRadius = prefab.capsuleRadius ;
        physicsBodyComponent.capsuleTotalHeight = prefab.capsuleHeight;
        physicsBodyComponent.capsuleCylinderHalfHeight = (prefab.capsuleHeight * 0.5) - prefab.capsuleRadius;
        physicsBodyComponent.kcc = physicsManager.createKCC();
        physicsBodyComponent.collisionGroup = prefab.collisionGroup;
        physicsBodyComponent.offsetRootToBody = prefab.offsetRootToBody;

        // Prepare animations
        const mixer = new THREE.AnimationMixer(root);
        // const clips = prefab.animations;

        const transformComponent = new TransformComponent();
        if (options?.isPlayer) {
            // Apply 180° yaw offset to align mesh (-Z forward) with camera (+Z forward)
            transformComponent.tweakRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        } else {
            transformComponent.moveSpeed *= 0.15; //TEMP: to move in constants
        }

        //AnimatorComponent
        const animatorComponent = new AnimatorComponent(clonedSkeleton,mixer);
        prefab.animationClips.forEach((clip, name) => {
            animatorComponent.animationClips.set(name, clip);
            const action = mixer.clipAction(clip);
                // console.log("Clip duration:", clip.name, action._clip.duration);
            // console.log("Clip:", clip.name, action);
            // console.log("Tracks:", action._clip.tracks.map(t => t.name));
            // console.log("Bones:");
            // root.traverse(o => { if (o.isBone) console.log(o.name); });
            // detect attack clips by name or metadata
            if (clip.name.startsWith("Attack")) {
                // console.log("Clip duration:", action._clip.duration);
                action.setLoop(THREE.LoopOnce, 0);

                //TOIMPROVE: if player we want the last frame of attack to be constant (sword in front of screen)
                //otherwise do not clamp
                // action.clampWhenFinished = (options?.isPlayer);   // <- KEEPS last frame visible
                action.clampWhenFinished = true;   // <- KEEPS last frame visible
                // action.enabled = true;
            }
            animatorComponent.animationActions.set(name, action);
        });
        animatorComponent.weaponBone = clonedSkeleton.getBoneByName(prefab.weaponBoneName);
        animatorComponent.headBone = clonedSkeleton.getBoneByName("Head");

        //weapon
        const weaponComponent = new WeaponComponent();
        weaponComponent.weapon = root.getObjectByName(prefab.weaponName);
        const {body: weaponBody, collider: weaponCollider, colliderDesc: weaponColliderDesc} = physicsManager.createKinematicColliderFromMesh(
            prefab.weaponColliderMesh,
            prefab.weaponCollisionGroups
        );
        weaponComponent.weaponBody = weaponBody;
        weaponComponent.weaponCollider = weaponCollider;
        weaponComponent.weaponColliderDesc = weaponColliderDesc;
        weaponComponent.weaponOffsetRootToBody = prefab.weaponOffsetRootToBody;
        weaponComponent.attackDamageStart = prefab.attackDamageStart;
        weaponComponent.attackDamageEnd = prefab.attackDamageEnd;


        //add components
        entity.addComponent(visualComponent);
        entity.addComponent(transformComponent);
        entity.addComponent(animatorComponent);
        entity.addComponent(physicsBodyComponent);
        entity.addComponent(new GameplayComponent());
        entity.addComponent(weaponComponent);
        //entity.addComponent(new AIComponent()); // optional, for NPCs

        //add extra options
        if (options?.isPlayer) {
            entity.addComponent(new PlayerControllerComponent(this.game.input));
        } else {
            const aiComponent = new AIComponent();
            const patrolPath = options?.patrolPath;
            if (patrolPath)
                aiComponent.patrolPath.push(...patrolPath);
            entity.addComponent(aiComponent);
            entity.addComponent(new PathFindingComponent());
        }


        // Add to scene
        this.game.scene.add(root);//TODO: add to rig or enemygroup

        //move root to yawObject position
        root.position.copy(rootPos);
        root.rotation.copy(rootRot);

        // this.entities.push(entity);
        this.game.entities.add(entity);
        this.game.activeEntities.add(entity);
        if (options?.isPlayer)
            this.game.playerEntity = entity;

        return entity;
    }
}
