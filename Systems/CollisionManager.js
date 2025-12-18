import * as THREE from 'three';
import * as RAPIER from 'rapier';
import * as Constants from '../Constants.js';
import { ECT } from '../Entities/Entity.js';

export default class CollisionManager {
    constructor(game) {
        this.game = game;
        this.world = game.world; //gamestate world storing the game entities
        this.rapierWorld = null; //world used by rapier to store colliders
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

        //used in logic below
        this.worldPos = new THREE.Vector3();
        this.worldQuat = new THREE.Quaternion();
        this.bodyToRemove = [];
        this.colliderToRemove = [];

        //used in debug
        const MAX_VERTS = 100_000; // adjust to your worst case
        this.debugPositions = new Float32Array(MAX_VERTS * 3);
        this.debugColors = new Float32Array(MAX_VERTS * 3);
        this.debugPosAttr = new THREE.BufferAttribute(this.debugPositions, 3);
        this.debugColorAttr = new THREE.BufferAttribute(this.debugColors, 3);

    }

    async init(scene) {
        await RAPIER.init();
        this.rapierWorld = new RAPIER.World({x: 0, y: -Constants.GRAVITY, z: 0});
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
            this.rapierWorld.timestep = this.fixedTimeStep;
            // try {
            //     this.rapierWorld.step(this.events);
            // } catch (e) {
            //     console.error("JS-level error:", e);
            // }
            this.rapierWorld.step(this.events);
            this.accumulator -= this.fixedTimeStep;
        }

        //handle safe deferred removal of bodies and colliders after step
        for (const collider of this.colliderToRemove){
            this.removeCollider(collider);
        }
        for (const body of this.bodyToRemove){
            this.removeRigidBody(body);
        }

        this.colliderToRemove.length = 0;
        this.bodyToRemove.length = 0;

        if (this.debugLines.visible)
            this.updateDebugOpti();
            // this.updateDebug();

    }

    createStaticColliderFromMesh(mesh, collisionGroups) {
        const { halfExtents, center } = this.computeBoundingBox(mesh);
        const colliderDesc = RAPIER.ColliderDesc.cuboid(
            halfExtents.x,
            halfExtents.y,
            halfExtents.z
        ).setTranslation(center.x, center.y, center.z)
        .setRotation(mesh.quaternion)
        .setCollisionGroups(collisionGroups);

        return this.createCollider(colliderDesc);
    }

    createKinematicColliderFromMesh(mesh, colgroup) {
        const { halfExtents, center } = this.computeBoundingBox(mesh);
        
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(center.x, center.y, center.z)
            .setRotation(mesh.quaternion);

        const body = this.createRigidBody(bodyDesc, { userData: { name: mesh.name } });

        const colliderDesc = RAPIER.ColliderDesc.cuboid(
            halfExtents.x,
            halfExtents.y,
            halfExtents.z
        )

        colliderDesc.setCollisionGroups(colgroup);

        const collider = this.createCollider(colliderDesc, body);

        return { body, collider, colliderDesc };
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

    createRigidBody(bodydesc, options) {
        const rb = this.rapierWorld.createRigidBody(bodydesc);
        this.bodies.set(rb.handle, rb);
        rb.userData = options.userData || null;
        return rb;
    }

    removeRigidBody(rb) {
        try {
            this.rapierWorld.removeRigidBody(rb);
        } catch (e) {
            console.error("JS-level error:", e);
        }
        this.bodies.delete(rb.handle);
    }

    createCollider(options, rigidBody) {
        const col = this.rapierWorld.createCollider(options, rigidBody);
        this.colliders.set(col.handle, col);
        return col;
    }

    removeCollider(collider) {
        try {
            this.rapierWorld.removeCollider(collider, true);
        } catch (e) {
            console.error("JS-level error:", e);
        }
        this.colliders.delete(collider.handle);
    }

    scheduleRemoval(body, collider){
        this.bodyToRemove.push(body);
        this.colliderToRemove.push(collider);
    }


    createKinematicRigidBody(translation,rotationEuler,name) {

        // Convert Euler -> Quaternion
        const euler = new THREE.Euler(rotationEuler.x, rotationEuler.y, rotationEuler.z, 'XYZ');
        const quat = new THREE.Quaternion().setFromEuler(euler);

        const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation( translation.x, translation.y, translation.z) // initial position
            .setRotation(quat.x, quat.y, quat.z, quat.w);
        const rb = this.rapierWorld.createRigidBody(rigidBodyDesc);
        rb.userData = { name };
        this.bodies.set(rb.handle, rb);
        return rb;
    }

    getRigidBodyByName(name) {
        for (const rb of this.bodies.values()) {
            if (rb.userData && rb.userData.name === name) {
                return rb;
            }
        }
        return null;
    }

    createCapsuleCollider(radius, halfHeight, collisionGroup, rigidBody) {
        const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
        .setFriction(0.9)
        .setRestitution(0)
        .setCollisionGroups(collisionGroup);

        const col = this.rapierWorld.createCollider(colliderDesc, rigidBody);
        this.colliders.set(col.handle, col);
        return col;
    }

    //after a collision we snap the capsule bottom/up to the ground/ceiling and we nudge outward by skin distance to avoid penetration
    static SKIN = 0.02;

    createKCC(){
        const kcc = this.rapierWorld.createCharacterController(CollisionManager.SKIN); //0.1 is skin distance
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
        return this.rapierWorld.colliders.len();
    }

    getNumBodies() {
        return this.rapierWorld.bodies.len();
    }

    syncMeshToRigidBody(mesh, rigidBody) {
        const t = rigidBody.translation();
        const r = rigidBody.rotation();
        mesh.position.set(t.x, t.y, t.z);
        mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    raycast(origin, dir, maxDist) {
        return this.rapierWorld.castRay(
            new RAPIER.Ray(origin, dir),
            maxDist, 
            true
        );
    }

    updateDebug() {

        if (!this.debugLines.visible) return;

        // IMPORTANT: call after rapierWorld.step() so Rapier buffers are fresh
        const debug = this.rapierWorld.debugRender(); //returns vertex buffer and color buffer
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

    updateDebugOpti() {
        if (!this.debugLines.visible) return;

        const { vertices, colors } = this.rapierWorld.debugRender();
        if (!vertices || vertices.length === 0) {
            this.debugGeo.setDrawRange(0, 0);
            return;
        }

        const vertCount = vertices.length / 3;

        // grow buffers only if needed
        if (vertices.length > this.debugPositions.length) {
            this._growDebugBuffers(vertices.length);
        }

        // positions
        this.debugPositions.set(vertices, 0);
        this.debugPosAttr.needsUpdate = true;

        // colors
        if (colors?.length) {
            if (colors.length === vertices.length) {
                this.debugColors.set(colors, 0);
            } else if (colors.length === vertCount * 4) {
                for (let i = 0, j = 0; i < colors.length; i += 4, j += 3) {
                    this.debugColors[j + 0] = colors[i + 0] / 255;
                    this.debugColors[j + 1] = colors[i + 1] / 255;
                    this.debugColors[j + 2] = colors[i + 2] / 255;
                }
            }
            this.debugColorAttr.needsUpdate = true;
        }

        this.debugGeo.setDrawRange(0, vertCount);
    }

    _growDebugBuffers(requiredLength) {
        const newSize = Math.max(requiredLength, this.debugPositions.length * 2);

        this.debugPositions = new Float32Array(newSize);
        this.debugColors = new Float32Array(newSize);

        this.debugPosAttr.array = this.debugPositions;
        this.debugColorAttr.array = this.debugColors;

        this.debugPosAttr.needsUpdate = true;
        this.debugColorAttr.needsUpdate = true;
    }


    update(dt){
       for (const e of this.world.query(ECT.TRANSFORM, ECT.COLLISION)) {
            const col = e.collision;
            const tr = e.transform;
            const mv = e.movement;
            // check for collision and correct movement
            const result = this.calculateCorrectMovement(
                col.kcc,
                col.body,
                col.collider,
                mv.moveVector,
                tr.rotation,
                col.collisionGroup
            );
            col.isTouchingGround = result.isTouchingGround;

            //update entity transform
            tr.positionCenter = result.newPosition;
            tr.positionRoot = result.newPosition.clone().sub(col.offsetRootToBody);

            //check if player in water/at surface
            if (e.playerCtrl){
                const belowChin = this.game.yawObject.position.clone();
                belowChin.y -= 0.3;
                const col = e.collision;
                col.isInWater = this.checkIsInWater(belowChin);
                if (e.collision.isInWater) {
                    const isHeadInWater = this.checkIsInWater(this.game.yawObject.position);
                    if (!e.collision.isAtSurface && !isHeadInWater) console.log("ATSURFACE")
                    e.collision.isAtSurface = !isHeadInWater;
                } else {
                    e.collision.isAtSurface = false;
                }
            }

            this.syncMesh(e);
            this.scheduleSyncBody(e);
            this.cleanupEntity(e)
        }
    }

    calculateCorrectMovement(kcc, body, collider, desiredMovement, desiredRotation, collisionGroups=null) {
        
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

        return {
            newPosition: newPos,
            isTouchingGround: kcc.computedGrounded()
        };
    }


    syncMesh(e) {
        const tr = e.transform;
        const vs = e.visual
        const root = vs?.root;
        if (!root) return;
        root.quaternion.slerp(tr.rotation, vs.slerpRotation);//update rotation
        const targetPos = tr.positionRoot.clone().add(vs.offsetPosition);
        targetPos.applyQuaternion(root.quaternion); //rotate the offset too
        root.position.copy(targetPos);
    }


    applyWallSlide(move, normals) {
        // Work in direction space (no dt)
        const dir = move.clone().normalize();
        let correctedDir = dir.clone();

        for (const n of normals) {
            const dot = correctedDir.dot(n);
            if (dot < 0) {
                // Remove inward component of the *direction*
                correctedDir.sub(n.clone().multiplyScalar(dot));
            }
        }

        // Then re-apply the original dt magnitude
        return correctedDir.normalize().multiplyScalar(move.length());
    }

    //sync body to mesh
    scheduleSyncBody(e) {
        const target = e.visual?.root;
        if (!target) return;
        const body = e.collision?.body;
        const off = e.collision?.offsetRootToBody;
        this.scheduleSyncBodyToTarget(body, off, target);
    }

    scheduleSyncBodyToTarget(body, target, off) {
        const q = target.getWorldQuaternion(this.worldQuat);
        const newoff = off.clone().applyQuaternion(q);
        const newPos = target.getWorldPosition(this.worldPos);
        newPos.add(newoff);
        // const newPos = target.position.clone().add(newoff);
        body.setNextKinematicTranslation(newPos);
        body.setNextKinematicRotation(q);
    }


    syncMeshToRigidBody(mesh, rigidBody, offset = new THREE.Vector3(0,0,0)) {
        const t = rigidBody.translation();
        const r = rigidBody.rotation();
        mesh.position.set(t.x + offset.x, t.y + offset.y, t.z + offset.z);
        mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    intersectionsWithPoint(point, colGroup) {
        let isInside = false;
        this.rapierWorld.intersectionsWithPoint(
            point,
            (h) => {
                isInside = true;
            },
            undefined, // optional filterFlags
            colGroup
        );
        return isInside;
    }

    intersectionsWithShape(body, shape, options) {

        this.rapierWorld.intersectionsWithShape(
            body.translation(), //shapePos: pos,
            body.rotation(), //shapeRot: rot,
            shape, //shape: weaponColliderDesc.shape,
            (otherCollider) => {
                options?.callback?.(otherCollider)
            }, //callback: null, // callback: (collider: Collider) => boolean,
            null, //filterFlags?: QueryFilterFlags,
            options?.filterGroups, //filterGroups?: InteractionGroups,
            options?.excludeCollider, //filterExcludeCollider?: Collider,
            options?.excludeBody,
            // weaponBody, //filterExcludeRigidBody?: RigidBody,
            null //filterPredicate?: (collider: Collider) => boolean,
        )
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
        for (const rb of this.bodies.values()) this.rapierWorld.removeRigidBody(rb);
        this.bodies.clear();
        this.colliders.clear();
    }

    cleanupEntity(e){
        const col = e.collision;
        if (!col.toremove) return;
        col.toremove = false;
        this.scheduleRemoval(col.body, col.collider);
        const wpn = e.weapon;
        if (wpn) this.scheduleRemoval(wpn.body, wpn.collider);
    }

    cleanup() {
        this.rapierWorld.free();
        this.rapierWorld = null;
        this.bodies.clear();
        this.colliders.clear();

        //cleanup debug
        this.scene.remove(this.debugLines);
        this.debugGeo.dispose();
        this.debugMat.dispose();
    }



    updateWpn(dt) {
       for (const e of this.world.query(ECT.WEAPON, ECT.COLLISION)) {
            this.weaponSyncBody(e);
            this.weaponAttack(e, dt);
       }
    }


    weaponSyncBody(e) {
        const wpn = e.weapon;
        if (!wpn) return;
        const body = wpn?.body;
        const off = wpn?.offsetRootToBody;
        const target = wpn?.weapon;
        if (!body || !target) return;
        const result = this.scheduleSyncBodyToTarget(body, target, off);
    }


    weaponAttack(e, dt) {
        const wpn = e.weapon;
        const col = e.collision;
        if (!wpn.isAttacking) return;
        wpn.timeSinceStartAttack += dt;
        if (
            wpn.timeSinceStartAttack >= wpn.attackDamageStart &&
            (wpn.attackDamageEnd ?
                (wpn.timeSinceStartAttack < wpn.attackDamageEnd) : true)
        ) { 
            const characterBody = col.body;
            this.intersectionsWithShape(
                wpn.body,
                wpn.colliderDesc.shape,
                {
                    excludeCollider: wpn.collider,
                    excludeBody: characterBody,
                    callback: ((otherCollider) => {
                        const colentity = otherCollider?.userData?.entity;
                        if (colentity){
                            console.log(e.name, "hit something", colentity.name)
                            this.hurt(colentity, e);
                        }
                    })
                }
            )
        }
    }

    checkIsInWater(point) {
        return this.intersectionsWithPoint(point, Constants.COL_MASKS.WATER);
    }




}
