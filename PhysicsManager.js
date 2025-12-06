// @ts-nocheck
import * as THREE from 'three';
import * as RAPIER from 'rapier';
import * as Shared from '../Shared.js';

export default class PhysicsManager {
    constructor() {
        this.world = null;
        this.fixedTimeStep = 1/60; //physics run at constant rate
        this.bodies = new Map();
        this.colliders = new Map();
        this.events = null;
        this.kcc = null;

        this.scene = null;
        this.debugGeo = new THREE.BufferGeometry();
        this.debugMat = new THREE.LineBasicMaterial({
            color: 0xffffff, // white lines
            linewidth: 2, // only affects some renderers (not webGL1)
            vertexColors: false, // ignore Rapier's internal colors
        });
        this.debugLines = new THREE.LineSegments(this.debugGeo, this.debugMat);
        this.debugLines.frustumCulled = false;

        this.bodyDesc = {
            translation : null,
            rotation : null,
        }
        this.colliderDesc = {
            halfExtents : null,
            rotation : null,
            collisionGroup : null,
        }

        this.accumulator = 0;
    }

    async init(scene) {
        await RAPIER.init();
        this.world = new RAPIER.World({x: 0, y: -Shared.gravity, z: 0});
        this.events = new RAPIER.EventQueue(true);

        //rapier debug
        this.setupDebugRenderer(scene);
    }

    setupDebugRenderer(scene) {
        this.scene = scene;
        this.scene.add(this.debugLines);
    }

    step(dt) {

        this.accumulator += dt;
        if (this.accumulator > 0.25) this.accumulator = 0.25;

        while (this.accumulator >= this.fixedTimeStep) {
            this.world.timestep = this.fixedTimeStep;
            this.world.step(this.events);
            this.accumulator -= this.fixedTimeStep;
        }

        if (this.debugLines.visible)
            this.updateDebug();

    }

    // step(fixedDelta) {

    //     this.world.timestep = fixedDelta;
    //     this.world.step(this.events);

    //     if (this.debugLines.visible)
    //         this.updateDebug();
    // }

    createStaticColliderFromMesh(mesh) {
        const { halfExtents, center } = this.computeBoundingBox(mesh);
        const colliderDesc = RAPIER.ColliderDesc.cuboid(
            halfExtents.x,
            halfExtents.y,
            halfExtents.z
        ).setTranslation(center.x, center.y, center.z)
        .setRotation(mesh.quaternion)
        .setCollisionGroups(Shared.COL_MASKS.SCENERY);

        return this.createCollider(colliderDesc);
    }

    createKinematicColliderFromMesh(mesh) {
        const { halfExtents, center } = this.computeBoundingBox(mesh);
        
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(center.x, center.y, center.z)
            .setRotation(mesh.quaternion);

        const body = this.createRigidBody(bodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(
            halfExtents.x,
            halfExtents.y,
            halfExtents.z
        )

        if (mesh.name.startsWith("Trigger_")) colliderDesc.setCollisionGroups(Shared.COL_MASKS.WATER);
        else colliderDesc.setCollisionGroups(Shared.COL_MASKS.SCENERY);

        const collider = this.createCollider(colliderDesc, body);

        return { body, collider };
    }

    computeBoundingBox(mesh) {
        mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox.clone();
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);
        size.multiply(mesh.scale);
        const rotatedCenter = center.applyQuaternion(mesh.quaternion);
        const worldCenter = rotatedCenter.add(mesh.position);
        return { halfExtents: size.multiplyScalar(0.5), center: worldCenter };
    }

    createRigidBody(options) {
        const rb = this.world.createRigidBody(options);
        this.bodies.set(rb.handle, rb);
        return rb;
    }

    removeRigidBody(rb) {
        this.world.removeRigidBody(rb);
        this.bodies.delete(rb.handle);
    }

    createCollider(options, rigidBody) {
        const col = this.world.createCollider(options, rigidBody);
        this.colliders.set(col.handle, col);
        return col;
    }

    createKinematicRigidBody(translation) {
        const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation( translation.x, translation.y, translation.z) // initial position
        const rb = this.world.createRigidBody(rigidBodyDesc);
        this.bodies.set(rb.handle, rb);
        return rb;
    }

    createCapsuleCollider(radius, halfHeight, collisionGroup, rigidBody) {
        const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
        .setFriction(0.9)
        .setRestitution(0)
        .setCollisionGroups(collisionGroup);

        const col = this.world.createCollider(colliderDesc, rigidBody);
        this.colliders.set(col.handle, col);
        return col;
    }

    createKCC(){
        const kcc = this.world.createCharacterController(Shared.skin); //0.1 is skin distance
        // Don’t allow climbing slopes larger than 45 degrees.
        kcc.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        // Automatically slide down on slopes smaller than 30 degrees.
        kcc.setMinSlopeSlideAngle(40 * Math.PI / 180);
        // Autostep if the step height is smaller than 0.5, its width is larger than 0.2,
        // and allow stepping on dynamic bodies.
        kcc.enableAutostep(0.5, 0.2, true);
        // Snap to the ground if the vertical distance to the ground is smaller than 0.5.
        kcc.enableSnapToGround(0.5);
        return kcc;
    }

    getNumColliders() {
        return this.world.colliders.len();
    }

    getNumBodies() {
        return this.world.bodies.len();
    }

    syncMeshToRigidBody(mesh, rigidBody) {
        const t = rigidBody.translation();
        const r = rigidBody.rotation();
        mesh.position.set(t.x, t.y, t.z);
        mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    raycast(origin, dir, maxDist) {
        return this.world.castRay(
            new RAPIER.Ray(origin, dir),
            maxDist, 
            true
        );
    }

    updateDebug() {

        if (!this.debugLines.visible) return;

        // IMPORTANT: call after world.step() so Rapier buffers are fresh
        const debug = this.world.debugRender(); //returns vertex buffer and color buffer
        const vertices = debug.vertices || [];
        const colors = debug.colors || [];

        //early exit if no vertices
        if (!vertices.length) {
            this.debugGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));   
            this.debugGeo.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
            return;   
        }

        // Ensure vertices contain valid numbers
        const validVertices = vertices.every(v => Number.isFinite(v));
        if (!validVertices) {
            console.warn("Debug vertices contain invalid values; skipping update.");
            return;
        }

        // Recreate attributes if size differs
        if (!this.debugGeo.attributes.position || this.debugGeo.attributes.position.count !== vertices.length / 3) {
            this.debugGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

            let colorAttr;
            if (colors.length === vertices.length) {
                colorAttr = new THREE.Float32BufferAttribute(colors, 3);
            } else if (colors.length === (vertices.length / 3) * 4) {
                const conv = new Float32Array((colors.length / 4) * 3);
                for (let i = 0, j = 0; i < colors.length; i += 4, j+= 3) {
                    conv[j + 0] = colors[i + 0] / 255;
                    conv[j + 1] = colors[i + 1] / 255;
                    conv[j + 2] = colors[i + 2] / 255;
                }
                colorAttr = new THREE.Float32BufferAttribute(conv, 3);
            } else {
                // fallback to white
                colorAttr = new THREE.Float32BufferAttribute(new Float32Array(vertices.length).fill(1), 3);
            }
            this.debugGeo.setAttribute('color', colorAttr);
        } else {
            //update existing attributes
            this.debugGeo.attributes.position.array.set(vertices);
            this.debugGeo.attributes.position.needsUpdate = true;

            if (colors.length > 0) {
                const attr = this.debugGeo.attributes.color;
                if (colors.length === vertices.length) {
                    attr.array.set(colors);
                } else if (colors.length === (vertices.length / 3) * 4) {
                    for (let i = 0, ai = 0; i < colors.length; i += 4, ai += 3) {
                        attr.array[ai + 0] = colors[i + 0] / 255;
                        attr.array[ai + 1] = colors[i + 1] / 255;
                        attr.array[ai + 2] = colors[i + 2] / 255;
                    }
                }
                attr.needsUpdate = true;
            }
        }

        // Only compute bounding sphere if positions are valid
        if (this.debugGeo.attributes.position && this.debugGeo.attributes.position.count > 0) {
            this.debugGeo.computeBoundingSphere();
        }
    }

    scheduleColliderMovement(kcc, body, collider, desiredMovement, desiredRotation, collisionGroups=null) {
        kcc.computeColliderMovement(
            collider,
            desiredMovement,
            null,
            collisionGroups,
            null
        );
        const correctedMovement = kcc.computedMovement();
        const correctedMovementVector = new THREE.Vector3(
            correctedMovement.x,
            correctedMovement.y,
            correctedMovement.z
        );
        const newPos = correctedMovementVector.clone().add( body.translation() );
        body.setNextKinematicTranslation(newPos);
        body.setNextKinematicRotation(desiredRotation);
        return {
            newPosition: newPos,
            isTouchingGround: kcc.computedGrounded()
        };
    }

    syncMeshToRigidBody(mesh, rigidBody, offset = new THREE.Vector3(0,0,0)) {
        const t = rigidBody.translation();
        const r = rigidBody.rotation();
        mesh.position.set(t.x + offset.x, t.y + offset.y, t.z + offset.z);
        mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    //visibility helpers
    hide() {
        this.debugLines.visible = false;
    }

    show() {
        this.debugLines.visible = true;
    }

    toggle() {
        this.debugLines.visible = !this.debugLines.visible;
    }

    reset() {
        for (const rb of this.bodies.values()) this.world.removeRigidBody(rb);
        this.bodies.clear();
        this.colliders.clear();
    }

    cleanup() {
        this.world.free();
        this.world = null;
        this.bodies.clear();
        this.colliders.clear();

        //cleanup debug
        this.scene.remove(this.debugLines);
        this.debugGeo.dispose();
        this.debugMat.dispose();
    }

}
