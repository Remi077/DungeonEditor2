import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import * as Constants from '../Constants.js';

import Entity from '../Entities/Entity.js';
import VisualComponent from '../Entities/Components/VisualComponent.js';
import TransformComponent from '../Entities/Components/TransformComponent.js';
import CollisionsBodyComponent from '../Entities/Components/CollisionsBodyComponent.js';
import AnimatorComponent from '../Entities/Components/AnimatorComponent.js';
import InteractableComponent from '../Entities/Components/InteractableComponent.js';

export default class LevelFactory {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.scene = game.scene;
        this.collision = game.systems.collisionManager;

        this.staticGroup = new THREE.Group();
        this.actionnablesGroup = new THREE.Group();
        this.lightGroup = new THREE.Group();
        this.enemySpawnGroup = new THREE.Group();
        this.rigGroup = new THREE.Group();
        this.colliderGroup = new THREE.Group();
        this.triggerGroup = new THREE.Group();

        this.loaded = false;
        this.animatedNodes = [];
        this.gltf = null;
    }

    async loadLevel(path) {
        const arrayBuffer = await (await fetch(path)).arrayBuffer();
        const gltf = await this.loadLevelGlb(arrayBuffer);
        this.gltf = gltf;

        //find animated nodes
        this.findAnimatedNodes(gltf);

        //parse into groups
        Array.from(gltf.scene.children).forEach(child => {
            if (child.isLight) this.lightGroup.add(child);
            else if (child.name.startsWith("Collider_")) this.colliderGroup.add(child);
            else if (child.name.startsWith("Trigger_")) this.triggerGroup.add(child);
            else if (child.name.startsWith("Action_")) this.actionnablesGroup.add(child);
            else if (child.name.startsWith("Enemy")) this.enemySpawnGroup.add(child);
            else this.staticGroup.add(child);
        });

        // Create collision for colliders/triggers
        this.processColliders();

        this.processActionnables();

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
        const physics = this.collision; // reference to your collisionManager

        Array.from(this.colliderGroup.children).forEach(child => {
            if (child.name.startsWith("Collider_Kine")) {
                const colGroup = (child.name.startsWith("Trigger_")) ?
                Constants.COL_MASKS.WATER : Constants.COL_MASKS.SCENERY
                this.collision.createKinematicColliderFromMesh(child, colGroup);
            } else {
                this.collision.createStaticColliderFromMesh(child, Constants.COL_MASKS.SCENERY);
            }
        });

        Array.from(this.triggerGroup.children).forEach(child => {
           this.collision.createStaticColliderFromMesh(child, Constants.COL_MASKS.WATER)
        //    .setSensor(true); 
        });

    }

    findAnimatedNodes(gltf) {
        const animatedNames = new Set();

        for (const clip of gltf.animations) {
            for (const track of clip.tracks) {
                const [nodeName] = track.name.split('.');
                animatedNames.add(nodeName);
            }
        }

        gltf.scene.traverse(obj => {
            if (animatedNames.has(obj.name) && !obj.isSkinnedMesh) {
                this.animatedNodes.push(obj);
            }
        });

    }

    processActionnables() {
        const col = this.collision; // reference to your collisionManager

        // First detect which level objects actually have animations
        // const animatedNodes = this.findAnimatedNodes(this.gltf);
        const animatedSet = new Set(this.animatedNodes.map(n => n.name));

        this.actionnablesGroup.traverse(child => {

            // Setup actionnable properties here
            const visualComponent = new VisualComponent(child)
            const transformComponent = new TransformComponent()
            
            //new entity
            const e = new Entity(child.name);

            //animator component
            if (animatedSet.has(child.name)) {

                const mixer = new THREE.AnimationMixer(child);

                const animator = new AnimatorComponent(null, mixer);

                // Add relevant clips for this node
                for (const clip of this.gltf.animations) {
                    const filtered = clip.clone();

                    // Keep only tracks belonging to this child
                    filtered.tracks = filtered.tracks.filter(t => 
                        t.name.startsWith(child.name + '.')
                    );

                    if (filtered.tracks.length > 0) {
                        const action = mixer.clipAction(filtered);
                        action.setLoop(THREE.LoopOnce, 0);
                        action.clampWhenFinished = true;
                        animator.animationClips.set(clip.name, filtered);
                        animator.animationActions.set(
                            clip.name,
                            action
                        );
                    }
                }

                this.world.addComponent(e, animator);
            }
            
            //body component
            const rb = col.getRigidBodyByName(`Collider_Kine_${child.name}`);
            if (rb) {
                const collisionBodyComponent = new CollisionsBodyComponent(rb);
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                const rbPos = rb.translation();
                collisionBodyComponent.offsetRootToBody = new THREE.Vector3(rbPos.x - worldPos.x, rbPos.y - worldPos.y, rbPos.z - worldPos.z);
                this.world.addComponent(e, collisionBodyComponent);
            }

            // add visual and transform components
            this.world.addComponent(e, visualComponent);
            // e.addComponent(transformComponent);
            if (
                child.name.startsWith("Action_Door")
                || child.name.startsWith("Action_Chest")
            ) {
                this.world.addComponent(e, new InteractableComponent(() => this.game.systems.interactableManager.doorInteract(e)));
            } else if (child.name.startsWith("Action_Switch")) {
                this.world.addComponent(e, new InteractableComponent(() => this.game.systems.interactableManager.switchInteract(e)));
            } else if (child.name.startsWith("Action_Item")) {
                this.world.addComponent(e, new InteractableComponent((callerEntity) => this.game.systems.interactableManager.itemInteract(e, callerEntity)));
            } else {
                if (child.parent?.name.startsWith("Action_Switch")) {
                    //this current mesh is parented to a switch, get the switch parent and its associated entity
                    const parentEntity = child.parent.userData[Constants.USER_DATA_FIELDS.INTERACT_ENTITY];
                    //add this current mesh to the list of dependables for the parent switch entity
                    parentEntity.interactable?.dependentEntities?.push(e);
                }
            }

            //add a pointer to the entity on the mesh (for raycast)
            child.userData[Constants.USER_DATA_FIELDS.INTERACT_ENTITY] = e;

        });
    }

    getRaycastTargets(
        IncStatic = true, //all static items
        IncActionnable = true, //interactable items
        IncRig = false, //characters, enemies
    ){
        const raycastTargets = [];
        if (IncActionnable)
            this.actionnablesGroup.traverse((child) => {
                if (child.isMesh) raycastTargets.push(child);
            });
        if (IncStatic)
            this.staticGroup.traverse((child) => {
                if (child.isMesh) raycastTargets.push(child);
            });
        if (IncRig)
            this.rigGroup.traverse((child) => {
                if (child.isMesh || child.isSkinnedMesh) raycastTargets.push(child);
            });
        const visibleTargets = raycastTargets.filter(obj => obj.visible);
        return visibleTargets;
    }

}