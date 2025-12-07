// @ts-nocheck
import * as THREE from 'three';
import Entity from './Entities/Entity.js'; // optional, for NPCs
import { GLTFLoader } from 'GLTFLoader';
import VisualComponent from './Entities/Components/VisualComponent.js';
import TransformComponent from './Entities/Components/TransformComponent.js';
import PhysicsBodyComponent from './Entities/Components/PhysicsBodyComponent.js';
import AnimatorComponent from './Entities/Components/AnimatorComponent.js';
import InteractableComponent from './Entities/Components/InteractableComponent.js';
import GameStateManager from './GameStateManager.js';

export default class LevelManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.physics = game.systems.physicsManager;

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
            else if (child.name.startsWith("Enemy_")) this.enemySpawnGroup.add(child);
            else this.staticGroup.add(child);
        });

        // Create physics for colliders/triggers
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

    findAnimatedNodes(gltf) {
        const animatedNames = new Set();

        for (const clip of gltf.animations) {
            for (const track of clip.tracks) {
                const [nodeName] = track.name.split('.');
                animatedNames.add(nodeName);
            }
        }

        // const animatedNodes = [];

        gltf.scene.traverse(obj => {
            if (animatedNames.has(obj.name) && !obj.isSkinnedMesh) {
                this.animatedNodes.push(obj);
            }
        });

        // return animatedNodes;
    }

    processActionnables() {
        const physics = this.physics; // reference to your PhysicsManager

        // First detect which level objects actually have animations
        // const animatedNodes = this.findAnimatedNodes(this.gltf);
        const animatedSet = new Set(this.animatedNodes.map(n => n.name));

        Array.from(this.actionnablesGroup.children).forEach(child => {

            // Setup actionnable properties here
            const visualComponent = new VisualComponent(child)
            const transformComponent = new TransformComponent()
            
            //new entity
            const entity = new Entity(child.name);

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
                        animator.animationClips.set(clip.name, filtered);
                        animator.animationActions.set(
                            clip.name,
                            mixer.clipAction(filtered)
                        );
                    }
                }

                entity.addComponent(animator);
            }
            
            //physics body component
            const rb = physics.getRigidBodyByName(`Collider_Kine_${child.name}`);
            if (rb) {
                const physicsBodyComponent = new PhysicsBodyComponent(rb);
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                const rbPos = rb.translation();
                physicsBodyComponent.offsetRootToBody = new THREE.Vector3(rbPos.x - worldPos.x, rbPos.y - worldPos.y, rbPos.z - worldPos.z);
                entity.addComponent(physicsBodyComponent);
            }

            // add visual and transform components
            entity.addComponent(visualComponent);
            // entity.addComponent(transformComponent);
            entity.addComponent(new InteractableComponent(
                () => {
                 this.game.systems.interactableManager.doorInteract(entity);   //interaction logic here
                }
            ));

            //add entity to game entities list
            this.game.entities.push(entity);
        });
    }

}