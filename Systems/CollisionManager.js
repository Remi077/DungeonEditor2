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
        this.correctedMovementVector = new THREE.Vector3();

        //used in debug
        const MAX_VERTS = 100_000; // adjust to your worst case
        this.debugPositions = new THREE.Float32BufferAttribute([], 3);
        this.debugColors = new THREE.Float32BufferAttribute([], 3);
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

    /*--------------------*/
    /*--------------------*/
    /* CREATION FUNCTIONS */
    /*--------------------*/
    /*--------------------*/

    /* COLLIDERS */
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

    createCapsuleCollider(radius, halfHeight, collisionGroup, rigidBody, sourceEntity=null) {
        const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
        .setFriction(0.9)
        .setRestitution(0)
        .setCollisionGroups(collisionGroup);

        const col = this.rapierWorld.createCollider(colliderDesc, rigidBody);
        this.colliders.set(col.handle, col);

        //annotate the collider with entity for fast lookup on weapon collision
        if (sourceEntity){
            if (!col.userData) col.userData = {};
            col.userData[Constants.USER_DATA_FIELDS.COLLIDER_ENTITY] = sourceEntity;
        }

        return col;
    }

    createCollider(options, rigidBody) {
        const col = this.rapierWorld.createCollider(options, rigidBody);
        this.colliders.set(col.handle, col);
        return col;
    }

    /* RIGIDBODIES */
    createRigidBody(bodydesc, options) {
        const rb = this.rapierWorld.createRigidBody(bodydesc);
        this.bodies.set(rb.handle, rb);
        rb.userData = options.userData || null;
        return rb;
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

    /* KINEMATIC CHARACTER CONTROLLER (KCC) */
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

    /*-----------------*/
    /*-----------------*/
    /* DEBUG FUNCTIONS */
    /*-----------------*/
    /*-----------------*/

    updateDebug() {

        if (!this.debugLines.visible) return;

        // IMPORTANT: call after rapierWorld.step() so Rapier buffers are fresh
        const debug = this.rapierWorld.debugRender(); //returns vertex buffer and color buffer
        const vertices = debug.vertices || [];
        const colors = debug.colors || [];

        //early exit if no vertices
        if (!vertices.length) {
            // this.debugGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));   
            // this.debugGeo.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
            this.debugGeo.setAttribute('position', this.debugPositions);   
            this.debugGeo.setAttribute('color', this.debugColors);            
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

    /*-------------------*/
    /*-------------------*/
    /* RAPIER WORLD STEP */ 
    /*-------------------*/
    /*-------------------*/

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
            this.updateDebug();

    }

    /*---------------------------*/
    /*---------------------------*/
    /* MAIN UPDATE LOOP FUNCTION */
    /*---------------------------*/
    /*---------------------------*/

    update(dt){
       for (const e of this.world.query(ECT.TRANSFORM, ECT.CAPSULECOLLIDER)) {
            const col = e.capsuleCol;
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

            //schedule sync body
            col.body.setNextKinematicTranslation(tr.positionCenter);
            col.body.setNextKinematicRotation(tr.rotation);

            //sync mesh
            this.syncMesh(e);

            //check if player in water/at surface
            if (e.playerCtrl){
                const belowChin = this.game.yawObject.position.clone();
                belowChin.y -= 0.3;
                const col = e.capsuleCol;
                col.isInWater = this.checkIsInWater(belowChin);
                if (e.capsuleCol.isInWater) {
                    const isHeadInWater = this.checkIsInWater(this.game.yawObject.position);
                    if (!e.capsuleCol.isAtSurface && !isHeadInWater) console.log("ATSURFACE")
                    e.capsuleCol.isAtSurface = !isHeadInWater;
                } else {
                    e.capsuleCol.isAtSurface = false;
                }
            }

            //eventually cleanup bodies if not used anymore
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
        this.correctedMovementVector.set(
            correctedMovement.x,
            correctedMovement.y,
            correctedMovement.z
        );
        const newPos = this.correctedMovementVector.clone().add( body.translation() );

        return {
            newPosition: newPos,
            isTouchingGround: kcc.computedGrounded()
        };
    }

    /*----------------*/
    /*----------------*/
    /* SYNC FUNCTIONS */
    /*----------------*/
    /*----------------*/

    syncMesh(e) {
        const tr = e.transform;
        const vs = e.visual
        const root = vs?.root;
        if (!root) return;

        //take the transform rotation + the offset rotation, slerp it and apply it to the mesh
        const fullRotation = tr.rotation.clone().multiply(vs.offsetRotation);
        root.quaternion.slerp(fullRotation, vs.slerpRotation);
        //take the offset position, apply root rotation, add it to transform pos and apply to mesh
        const rotatedOff = vs.offsetPosition.clone().applyQuaternion(root.quaternion);
        const targetPos = tr.positionRoot.clone().add(rotatedOff);
        root.position.copy(targetPos);
    }

    //sync body to a scene target
    scheduleSyncBodyToTarget(body, target, off) {
        const q = target.getWorldQuaternion(this.worldQuat);
        const newoff = off.clone().applyQuaternion(q);
        const newPos = target.getWorldPosition(this.worldPos);
        newPos.add(newoff);
        // const newPos = target.position.clone().add(newoff);
        body.setNextKinematicTranslation(newPos);
        body.setNextKinematicRotation(q);
    }

    /*-------------------------*/
    /*-------------------------*/
    /* INTERSECTIONS FUNCTIONS */
    /*-------------------------*/
    /*-------------------------*/

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
            body.translation(), //shapePos
            body.rotation(), //shapeRot
            shape, //shape
            (otherCollider) => {
                options?.callback?.(otherCollider)
            }, //callback
            null, //filterFlags
            options?.filterGroups, //filterGroups
            options?.excludeCollider, //filterExcludeCollider
            options?.excludeBody, //filterExcludeBody
            null //filterPredicate
        )
    }

    checkIsInWater(point) {
        return this.intersectionsWithPoint(point, Constants.COL_MASKS.WATER);
    }

    /*-----------*/
    /*-----------*/
    /* UTILITIES */
    /*-----------*/
    /*-----------*/

    getRigidBodyByName(name) {
        for (const rb of this.bodies.values()) {
            if (rb.userData && rb.userData.name === name) {
                return rb;
            }
        }
        return null;
    }

    //stats
    getNumColliders() {
        return this.rapierWorld.colliders.len();
    }

    getNumBodies() {
        return this.rapierWorld.bodies.len();
    }

    // debug visibility helpers
    hide() {
        this.debugLines.visible = false;
    }

    show() {
        this.debugLines.visible = true;
    }

    toggle() {
        this.debugLines.visible = !this.debugLines.visible;
    }

    /*-------------------*/
    /*-------------------*/
    /* CLEANUP FUNCTIONS */
    /*-------------------*/
    /*-------------------*/

    cleanupEntity(e){
        if (e.capsuleCol) {
            const col = e.capsuleCol;
            if (col.toremove) {
                col.toremove = false;
                this.scheduleRemoval(col.body, col.collider);
            }
        }
        if (e.animCol) {
            const animCol = e.animCol;
            if (animCol.toremove) {
                animCol.toremove = false;
                this.scheduleRemoval(animCol.body, animCol.collider);
            }
        }
    }

    scheduleRemoval(body, collider){
        this.bodyToRemove.push(body);
        this.colliderToRemove.push(collider);
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

    removeRigidBody(rb) {
        try {
            this.rapierWorld.removeRigidBody(rb);
        } catch (e) {
            console.error("JS-level error:", e);
        }
        this.bodies.delete(rb.handle);
    }

    removeCollider(collider) {
        try {
            this.rapierWorld.removeCollider(collider, true);
        } catch (e) {
            console.error("JS-level error:", e);
        }
        this.colliders.delete(collider.handle);
    }

    /*-----------------------------*/
    /*-----------------------------*/
    /* ANIMATED COLLIDER FUNCTIONS */
    /*-----------------------------*/
    /*-----------------------------*/

    updateAnimCollider(dt) {
       for (const e of this.world.query(ECT.ANIMCOLLIDER)) {
            this.animSyncBody(e);
       }
    }

    animSyncBody(e) {
        const col = e.animCol;
        const body = col?.body;
        const off = col?.offsetRootToBody;
        const target = col?.mesh;
        if (!body || !target) return;
        const result = this.scheduleSyncBodyToTarget(body, target, off);
    }

    /*---------------*/
    /*---------------*/
    /* UPDATE ATTACK */
    /*---------------*/
    /*---------------*/

    updateAttack(dt) {
       for (const e of this.world.query(ECT.ANIMCOLLIDER, ECT.ATTACK)) {
            this.attack(e, dt);
       }
    }

    attack(e, dt) {
        const col = e.animCol;
        const att = e.attack;
        if (!att.isAttacking) return;
        att.timeSinceStartAttack += dt;
        if (
            att.timeSinceStartAttack >= att.attackDamageStart &&
            (att.attackDamageEnd ?
                (att.timeSinceStartAttack < att.attackDamageEnd) : true)
        ) { 
            const characterBody = e.capsuleCol?.body; //filter out capsule body on this entity if it exists
            this.intersectionsWithShape(
                col.body,
                col.colliderDesc.shape,
                {
                    excludeCollider: col.collider,
                    excludeBody: characterBody,
                    callback: ((otherCollider) => {
                        const colentity = otherCollider?.userData?.[Constants.USER_DATA_FIELDS.COLLIDER_ENTITY];
                        if (colentity){
                            console.log(e.name, "hit something", colentity.name)
                            const gp = colentity.gameplay;
                            if (gp){
                                    gp.isHurt = true; //register hurt
                                    gp.perpetrator = e;
                                }
                        }
                    })
                }
            )
        }
    }


}
