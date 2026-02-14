import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import * as SkeletonUtils from 'SkeletonUtils';

import * as Constants from '../Constants.js';
import Entity from '../Entities/Entity.js';
import AIComponent from '../Entities/Components/AIComponent.js';
import AnimColliderComponent from '../Entities/Components/AnimColliderComponent.js';
import AttackComponent from '../Entities/Components/AttackComponent.js';
import CapsuleColliderComponent from '../Entities/Components/CapsuleColliderComponent.js';
import GameplayComponent from '../Entities/Components/GameplayComponent.js';
import InventoryComponent from '../Entities/Components/InventoryComponent.js';
import MovementComponent from '../Entities/Components/MovementComponent.js';
import PathFindingComponent from '../Entities/Components/PathFindingComponent.js';
import PlayerControlComponent from '../Entities/Components/PlayerControlComponent.js';
import TransformComponent from '../Entities/Components/TransformComponent.js';
import VisualComponent from '../Entities/Components/VisualComponent.js';

class CharacterPrefab {

    static DEFAULT_CHARACTER_HEIGHT = 1.8; // total character height in meters
    static DEFAULT_CHARACTER_RADIUS = 0.4; // radius of the character capsule collider
    static DEFAULT_CHARACTER_EYE_HEIGHT = 1.5; // desired camera (eye) height above the floor

    constructor() {

        this.name = "";
        this.root = null;        // template armature hierarchy
        this.weaponMeshName = "";

        //materials 
        this.normalMaterial = null;
        this.hurtMaterial = null;

        //Animations
        this.animationClips = new Map();  // parsed once
        this.attackDamageStart = 0; //attack related
        this.attackDamageEnd = 0;

        //weapon Collider + Collisions
        this.weaponColliderMesh = null;
        this.weaponBodyDesc = null;
        this.weaponColliderDesc = null;
        this.weaponCollisionGroups = null;
        this.weaponOffsetRootToBody = new THREE.Vector3();

        //Collisions template
        this.capsuleRadius = this.constructor.DEFAULT_CHARACTER_RADIUS; //temp should be calculated from mesh BB or dedicated mesh TOFIX
        this.capsuleHeight = this.constructor.DEFAULT_CHARACTER_HEIGHT; // temp see above TOFIX
        this.offsetRootToBody = new THREE.Vector3(0, this.capsuleHeight * 0.5, 0);
        this.offsetRootToCamera =  new THREE.Vector3(0, this.constructor.DEFAULT_CHARACTER_EYE_HEIGHT, 0)
        this.collisionGroup = null;

        // Flag to track if capsule dimensions were found in mesh
        this.useMeshCapsule = false;

        this.isLoaded = false;
    }
}


export default class CharacterFactory {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.loader = new GLTFLoader();

        this.charaPrefabMap = new Map(); // multiple character types

        // DEBUG: Toggle mesh-based capsule collider per character type
        this.USE_MESH_CAPSULE_PLAYER = true;  // Set to true to use mesh-based capsule for player
        this.USE_MESH_CAPSULE_ZOMBIE = true;   // Set to true to use mesh-based capsule for zombie

        //floating health bar
        this.floatingHPWidth = 0.5;
        this.floatingHPHeight = 0.05;
        this.floatingHPGeom = new THREE.PlaneGeometry(this.floatingHPWidth, this.floatingHPHeight);
        this.floatingHPBackgroundColor = 0x550000;
        this.floatingHPBgMat = new THREE.MeshBasicMaterial({ color: this.floatingHPBackgroundColor });
        this.floatingHPBgMesh = new THREE.Mesh(this.floatingHPGeom, this.floatingHPBgMat);
        this.floatingHPBgMesh.name= "hp_bg";
        this.floatingHPForegroundColor = 0x00ff00;
        this.floatingHPFgMat = new THREE.MeshBasicMaterial({ color: this.floatingHPForegroundColor });
        this.floatingHPFgMesh = new THREE.Mesh(this.floatingHPGeom, this.floatingHPFgMat);
        this.floatingHPFgMesh.name= "hp_fg";
    }

    async loadCharacter(path, characterType) {
        if (this.charaPrefabMap.has(characterType)) return; // load character gltf only once;
        const arrayBuffer = await (await fetch(path)).arrayBuffer();
        const gltf = await this.loadGlb(arrayBuffer);

        this.prefab = new CharacterPrefab();
        this.prefab.name = characterType;

        const isPlayerPrefab = characterType === Constants.CHARACTER_TYPES.PLAYER;

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
            if (child.name.startsWith(Constants.GLB_PREFIX.ARMATURE)) prefab.root = child;
            if (child.isSkinnedMesh) {
                child.frustumCulled = !isPlayerPrefab;
                prefab.normalMaterial = child.material;
                prefab.hurtMaterial = child.material.clone();
                prefab.hurtMaterial.color?.set(0xff0000);
            };
            if (child.name.startsWith(Constants.GLB_PREFIX.WEAPON)) {
                child.frustumCulled = !isPlayerPrefab;
                prefab.weaponMeshName = prefab.weapon?.name;
            }
            if (child.name.startsWith(Constants.GLB_PREFIX.COLLIDER_KINE_WEAPON)) prefab.weaponColliderMesh = child;
        });
    }

    processAnimations(animations, prefab) {
        animations.forEach(clip => {
            prefab.animationClips.set(clip.name, clip);
            if (clip.name === Constants.ANIM.WALK) {
                const walkLowerClip = this.makePartialClip(clip, Constants.LOWERBODYBONES, Constants.ANIM.WALK_L);
                prefab.animationClips.set(Constants.ANIM.WALK_L, walkLowerClip);
            }
        });
    }

    makePartialClip(clip, boneNames, name) {
        const filteredTracks = clip.tracks.filter(track => {
            return boneNames.some(name => track.name.startsWith(name));
        });
        return new THREE.AnimationClip(name, clip.duration, filteredTracks);
    }

    computeColliderFromMesh(scene, prefab, isPlayerPrefab) {
        scene.traverse((child) => {
            if (!child.isMesh) return;
            const prefix = Constants.GLB_PREFIX.COLLIDER_KINE;

            if (!child.name.startsWith(prefix)) return;

            const match = child.name.match(new RegExp(`^${prefix}_(.+)$`));
            if (!match) return;

            const relatedName = match[1];
            if (!relatedName) return;

            // --- WEAPON COLLIDER ---
            if (relatedName.startsWith(Constants.GLB_PREFIX.WEAPON)) {
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

                // --- 6. Collision groups ---
                let weaponCollisionGroups = Constants.COL_MASKS.ENEMYWPN;
                if(isPlayerPrefab)
                    weaponCollisionGroups = Constants.COL_MASKS.PLAYERWPN;

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

                prefab.weaponName = relatedName;
            }
            // --- CHARACTER CAPSULE COLLIDER ---
            else if (relatedName === Constants.GLB_PREFIX.CAPSULE) {
                // Check if we should use mesh-based capsule for this character type
                const useMeshCapsule = isPlayerPrefab
                    ? this.USE_MESH_CAPSULE_PLAYER
                    : this.USE_MESH_CAPSULE_ZOMBIE;

                if (!useMeshCapsule) {
                    console.log(`[CharacterFactory] Mesh capsule found for ${prefab.name} but USE_MESH_CAPSULE is disabled, using defaults`);
                    return;
                }

                // --- 1. LOCAL transforms of collider placeholder object ---
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

                // --- 3. Extract capsule dimensions from bounding box ---
                // Capsule height is the Y dimension
                // Capsule radius is the max of X and Z dimensions divided by 2
                prefab.capsuleHeight = size.y;
                prefab.capsuleRadius = Math.max(size.x, size.z) / 2;

                // --- 4. Compute offset from root to body center ---
                const worldCenter = childPos.clone().add(center);
                prefab.offsetRootToBody.copy(worldCenter);

                // --- 5. Compute offset from root to camera (eye height) ---
                // Assume camera is at 85% of capsule height
                const eyeHeight = prefab.capsuleHeight * 0.85;
                prefab.offsetRootToCamera.set(0, eyeHeight, 0);

                // Mark that we're using mesh-based capsule
                prefab.useMeshCapsule = true;

                console.log(`[CharacterFactory] Mesh-based capsule collider for ${prefab.name}:`, {
                    height: prefab.capsuleHeight,
                    radius: prefab.capsuleRadius,
                    offsetRootToBody: prefab.offsetRootToBody
                });
            }
        });

        // --- 8. Apply old system fallback if mesh capsule not used ---
        if (!prefab.useMeshCapsule && !isPlayerPrefab) {
            // Old zombie-specific scaling
            prefab.capsuleRadius *= 0.5;
            console.log(`[CharacterFactory] Using default capsule for ${prefab.name} with old zombie scaling (radius *= 0.5)`);
        }

        // --- 9. Set collision group ---
        prefab.collisionGroup = isPlayerPrefab ? Constants.COL_MASKS.PLAYER : Constants.COL_MASKS.ENEMY;
    }

    spawnPlayer(characterType, spawnPosition) {

        const prefab = this.charaPrefabMap.get(characterType);
        if (!prefab) throw new Error(`player prefab '${characterType}' not loaded`);

        const player = this.instantiateCharacter(prefab, {
            isPlayer: true,
            position: spawnPosition,
            posRelativeToCam: true
        });

        this.world.setPlayer(player);

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
        const e = new Entity(prefab.name);

        const rootPos = options?.position.clone();
        if (options?.posRelativeToCam) //optionally position root wrt camera
            rootPos.sub(prefab.offsetRootToCamera); 
        const bodyPos = rootPos.clone();
        bodyPos.add(prefab.offsetRootToBody);
        const rootRot = options?.rotation?.clone() || new THREE.Euler();

        // 1. VisualComponent with cloned armature / skinned mesh
        const root = SkeletonUtils.clone(prefab.root); // Clone skinned mesh + skeleton
        const vs = new VisualComponent(root)
        // vs.setFrustumCulled(!(options?.isPlayer));
        if (vs.root) {
            vs.root.traverse(obj => {
                if (obj.isMesh) {
                    obj.frustumCulled = !(options?.isPlayer); //dont frustrum cull player meshes (camera is very close from it)
                }
            });
        }

        vs.normalMaterial = prefab.normalMaterial;
        vs.hurtMaterial = prefab.hurtMaterial;
        vs.offsetPosition.set(0,0,0);
        if (options?.isPlayer){
            //adjust mesh position wrt to the capsule collider here
            vs.offsetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
            vs.offsetPosition.set(0,0,-0.07);
            vs.slerpRotation = 1;
        }

        // 2. Traverse cloned root to find skeleton
        let clonedSkeleton = null;
        root.traverse(obj => {
            if (obj.isSkinnedMesh && !clonedSkeleton) {
                clonedSkeleton = obj.skeleton;
            }
        });

        // 3. Create CapsuleColliderComponent with capsule collider
        const collisionManager = this.game.systems.collisionManager;

        const playerBody = collisionManager.createKinematicRigidBody(
            bodyPos || new THREE.Vector3(0, 0, 0), 
            //add rotation
            rootRot,
            e.name,
        );
        const playerCollider = collisionManager.createCapsuleCollider(
             prefab.capsuleRadius,
             (prefab.capsuleHeight * 0.5) - prefab.capsuleRadius,
             prefab.collisionGroup, 
             playerBody,
             e
            );
        const col = new CapsuleColliderComponent(playerBody, playerCollider);

        col.capsuleRadius = prefab.capsuleRadius ;
        col.capsuleTotalHeight = prefab.capsuleHeight;
        col.capsuleCylinderHalfHeight = (prefab.capsuleHeight * 0.5) - prefab.capsuleRadius;
        col.kcc = collisionManager.createKCC();
        col.collisionGroup = prefab.collisionGroup;
        col.offsetRootToBody = prefab.offsetRootToBody;

        // Prepare animations
        const mixer = new THREE.AnimationMixer(root);

        //movement
        const mv = new MovementComponent();
        if (!options?.isPlayer) mv.moveSpeed *= 0.15; //TEMP: to move in constants TOFIX

        //AnimatorComponent
        const animatorManager = this.game.systems.animatorManager;
        const anim = animatorManager.createAnimatorComponent(clonedSkeleton, mixer, prefab.animationClips);

        /*--------------------*/
        /*--------------------*/
        //animated collider
        const wpn = new AnimColliderComponent();
        const {body: weaponBody, collider: weaponCollider, colliderDesc: weaponColliderDesc} = collisionManager.createKinematicColliderFromMesh(
            prefab.weaponColliderMesh,
            prefab.weaponCollisionGroups
        );
        wpn.mesh = root.getObjectByName(prefab.weaponName);
        wpn.body = weaponBody;
        wpn.collider = weaponCollider;
        wpn.colliderDesc = weaponColliderDesc;
        wpn.offsetRootToBody = prefab.weaponOffsetRootToBody;
        this.world.addComponent(e, wpn);

        //attack
        const wpnAttack = new AttackComponent();
        wpnAttack.attackDamageStart = prefab.attackDamageStart;
        wpnAttack.attackDamageEnd = prefab.attackDamageEnd;
        this.world.addComponent(e, wpnAttack);
        /*--------------------*/
        /*--------------------*/

        //gameplay
        const gp = new GameplayComponent();

        //add components
        this.world.addComponent(e, vs);
        this.world.addComponent(e, new TransformComponent());
        this.world.addComponent(e, mv);
        this.world.addComponent(e, anim);
        this.world.addComponent(e, col);
        this.world.addComponent(e, gp);

        //add extra options
        if (options?.isPlayer) {
            const pc = new PlayerControlComponent(this.game.input);
            pc.offsetRootToCamera = prefab.offsetRootToCamera;
            this.world.addComponent(e, pc);
            this.world.addComponent(e, new InventoryComponent());
        } else {
            const ai = new AIComponent();
            const patrolPath = options?.patrolPath;
            if (patrolPath)
                ai.patrolPath.push(...patrolPath);
            this.world.addComponent(e, ai);
            this.world.addComponent(e, new PathFindingComponent());

            //add health bar
            const hp = this.createHealthBar();
            hp.position.y = col.capsuleTotalHeight + 0.3;
            root.add(hp);
            gp.healthBar = hp;
        }

        //make the entity active
        this.world.setActive(e, true);

        // Add to scene
        this.game.scene.add(root);//TODO: add to rig or enemygroup

        //move root to yawObject position
        root.position.copy(rootPos);
        root.rotation.copy(rootRot);

        return e;
    }

    createHealthBar() {
        const group = new THREE.Group();
        group.name="healthbar";

        // Background
        const bg = this.floatingHPBgMesh.clone();
        group.add(bg);

        // Foreground (actual health)
        const fg = this.floatingHPFgMesh.clone();
        fg.position.z = 0.001; // avoid z-fighting
        group.add(fg);

        // Store for later updates
        group.healthForeground = fg;
        group.fullWidth = this.floatingHPWidth;

        //start invisible
        group.visible = false;

        return group;
    }

}
