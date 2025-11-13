// @ts-nocheck
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.12.0';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from './gameHUD.js';



/*-----------*/
// inventory //
/*-----------*/
const playerState = {
    health: 100,
    maxHealth: 100,
    inventory: {},
    weapon: null,
    weaponBody: null,
    weaponCollider: null
};
Object.seal(playerState);

/*---------------------------------*/
// actions variables
/*---------------------------------*/
export let Actions = {};
let gameId = null;

export let ActionToKeyMap = {
    moveCamRight: { key: 'KeyD' },
    moveCamLeft: { key: 'KeyA' },
    moveCamFront: { key: 'KeyW' },
    moveCamBack: { key: 'KeyS' },
    startGame: { key: 'KeyG', OnPress: true },
    jump: { key: 'Space', OnPress: true },
    interact: { key: 'KeyE', OnPress: true },
    hideCol: { key: 'KeyH', OnPress: true },
};

/*---------------------------------*/
/* startGameLoop */
/*---------------------------------*/
let firstInit = true;
export function startGameLoop() {

    Shared.resetAllActions();
    Shared.editorState.gameRunning = true;
    Shared.setPause(false);
    requestAnimationFrame(gameLoopFirstFrame);
    Shared.clock.start();
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTGAMECOLOR);
    Shared.playerMovementState.verticalSpeed = 0;
    Shared.playerMovementState.collisionmask = Shared.COL_MASKS.PLAYER;

    document.addEventListener("mousedown", onMouseClick, false);
    // document.addEventListener("mouseup", onMouseUp, false);

    if (firstInit) {
        firstInit = false;
        const campos = Shared.yawObject.position;
        // --- Create kinematic body ---
        const playerBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(campos.x, campos.y + Shared.cameraHeightFromCapsuleCenter, campos.z); // initial position where camera is

        const playerBody = Shared.physWorld.createRigidBody(playerBodyDesc);
        playerBody.userData = { name: "playerBody" };

        // --- Create character controller ---
        const kcc = Shared.physWorld.createCharacterController(Shared.skin); //0.1 is skin distance
        // kcc.setSlideEnabled(true);
        // Don’t allow climbing slopes larger than 45 degrees.
        kcc.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        // Automatically slide down on slopes smaller than 30 degrees.
        kcc.setMinSlopeSlideAngle(30 * Math.PI / 180);
        // Autostep if the step height is smaller than 0.5, its width is larger than 0.2,
        // and allow stepping on dynamic bodies.
        kcc.enableAutostep(0.5, 0.2, true);
        // Snap to the ground if the vertical distance to the ground is smaller than 0.5.
        kcc.enableSnapToGround(0.5);
        // kcc.disableSnapToGround();

        // --- Create capsule collider ---
        const playerColliderDesc = RAPIER.ColliderDesc.capsule(Shared.halfHeight, Shared.playerRadius)
            .setFriction(0.9)
            .setRestitution(0)
            .setCollisionGroups(Shared.COL_MASKS.PLAYER);
            
        const playerCollider = Shared.physWorld.createCollider(playerColliderDesc, playerBody);
        Shared.colliderNameMap.set(playerCollider, "playerCollider");
        playerCollider.userData = { name: "playerCollider" };

        Shared.playerMovementState.body = playerBody;
        Shared.playerMovementState.collider = playerCollider;
        Shared.playerMovementState.colliderDesc = playerColliderDesc;
        Shared.playerMovementState.offsetRootToBody = new THREE.Vector3(
            0,Shared.halfHeight + Shared.playerRadius,0
        );
        Shared.playerMovementState.tweakRot = Math.PI
        Shared.playerMovementState.tweakPos = new THREE.Vector3(0.1,0,0.1);

        Shared.playerMovementState.kcc = kcc;

        initHighlightPool(Shared.scene);

        // create enemy colliders
        Shared.enemyGroup.children.forEach(element => {


            const enemyBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
                .setTranslation(element.position.x, element.position.y, element.position.z)

            const enemyBody = Shared.physWorld.createRigidBody(enemyBodyDesc);
            enemyBody.userData = { name: "enemyBody_" + element.name };

            const enemyColliderDesc = RAPIER.ColliderDesc.capsule(Shared.halfHeight, Shared.playerRadius)
                .setFriction(0.9)
                .setRestitution(0)
                .setCollisionGroups(Shared.COL_MASKS.ENEMY)
                ;

            const enemyCollider = Shared.physWorld.createCollider(enemyColliderDesc, enemyBody);

            const enemyMovementState = Shared.newMovementState()
            enemyMovementState.root = element;
            enemyMovementState.body = enemyBody

            //enemy controller (one controller per enemy/player - avoid sharing them)
            const e_kcc = Shared.physWorld.createCharacterController(Shared.skin); //0.1 is skin distance
            e_kcc.setMaxSlopeClimbAngle(45 * Math.PI / 180);
            e_kcc.setMinSlopeSlideAngle(30 * Math.PI / 180);
            e_kcc.enableAutostep(0.5, 0.2, true);
            e_kcc.enableSnapToGround(0.5);

            enemyMovementState.kcc = e_kcc
            enemyMovementState.collisionmask = Shared.COL_MASKS.ENEMY
            enemyMovementState.collider = enemyCollider
            enemyMovementState.colliderDesc = enemyColliderDesc
            enemyMovementState.offsetRootToBody = new THREE.Vector3(
                0,Shared.halfHeight + Shared.playerRadius,0
            );
            enemyMovementState.curPos = element.position

            Shared.colliderNameMap.set(enemyCollider, "enemyCollider_" + element.name);
            enemyCollider.userData = { name: "enemyCollider_" + element.name };
            element.userData.movementState = enemyMovementState;

        });

        //carried weapon
        playerState.weapon = Shared.scene.getObjectByName(Shared.SWORD_NAME);
        playerState.weaponBody = Shared.BodyNameMap.get("Collider_Kine_"+Shared.SWORD_NAME)
        playerState.weaponCollider = Shared.colliderNameMap.get("Collider_Kine_"+Shared.SWORD_NAME)

        //start enemy loop
        enemyLoop();

        //start animate loop
        animateLoop();

    }

}

/*---------------------------------*/
/* gameLoopFirstFrame */
/*---------------------------------*/
function gameLoopFirstFrame() {
    //place the player rigidbody where the camera currently is and step the world
    Shared.playerMovementState.curPos = Shared.yawObject.position.clone();
    Shared.playerMovementState.curPos.y -= Shared.cameraHeightFromCapsuleCenter;
    Shared.playerMovementState.body.setNextKinematicTranslation(Shared.playerMovementState.curPos);
    Shared.physWorld.step();
    gameId = requestAnimationFrame(gameLoop);
}

/*---------------------------------*/
// stopGameLoop
/*---------------------------------*/
export function stopGameLoop() {
    Shared.editorState.gameRunning = false;
    cancelAnimationFrame(gameId);
    document.removeEventListener("mousedown", onMouseClick, false);
    // document.removeEventListener("mouseup", onMouseUp, false);
}

/*---------------------------------*/
// gameLoop
/*---------------------------------*/
let lastUVUpdate = 0;
let isPlayerTouchingGround = false;
const verbose = false;
let deltaTime = 0;

function gameLoop(now) {
    const scene = Shared.scene;

    if (!Shared.editorState.gameRunning) return;

    //execute actions
    executeActions();

    if (!Shared.editorState.pause) { // && !skipOneFrame) {

        //fps counter
        Stats.stats.begin();

        //initialize gameplay variables this loop
        deltaTime = Shared.clock.getDelta();       // Time elapsed since last frame
        // getDelta resets the clock at every call
        // so its important its called once per clock and per frame
        // all the other frame loop (enemyLoop, animateLoop) which reads deltaTime and call
        // requestAnimationFrame actually run on one single thread in a given unknown order
        // so best approach is to set deltaTime at same place every loop and have all the 
        // other loops consume this deltaTime

        // clear the onpress/onrelease actions now that they have been sampled 
        // in that loop to avoid resampling
        Shared.releaseSingleEventActions();

        //debug only: clear visibility of colliding meshes
        hideAllHighlights();

        /*-----------------------------------------------------*/
        /* INITIALIZE PLAYER MOVE AND ROTATION BASED ON INPUTS */
        /*-----------------------------------------------------*/
        Shared.playerMovementState.moveVector.applyQuaternion(Shared.yawObject.quaternion);
        
        // Shared.playerMovementState.moveVector.applyEuler(
        //     new THREE.Euler(Shared.pitchObject.rotation.x, Shared.yawObject.rotation.y, 0)
        // );
        
        Shared.playerMovementState.rotation.copy(Shared.yawObject.quaternion);
        Shared.playerMovementState.newPos = Shared.playerMovementState.curPos.clone();

        computeNextPos(Shared.playerMovementState, deltaTime);

        // BODY FINAL UPDATES
        // Shared.playerMovementState.body.setNextKinematicTranslation(Shared.playerMovementState.newPos);
        // Shared.playerMovementState.body.setNextKinematicRotation(Shared.playerMovementState.rotation);
        // movePlayerMesh(Shared.playerMovementState); //move Player Mesh to new position/rotation
        Shared.updateMeshRotPos(Shared.playerMovementState);
        syncCameraTo(Shared.playerMovementState, camPlayerTweak);
        //raycast against actionnables
        raycastActionnables();

        //consistent approach: 
        //we update the mesh/rendered models based on movement/collision data
        //then in last step we sync the rigidbodies to the rendered models
        if (Shared.physWorld) {

            Shared.scheduleSyncBodyFromMovementState(Shared.playerMovementState) // schedule player rigidbody sync
            Shared.scheduleSyncBodyToMesh(playerState.weapon) // schedule weapon rigidbody sync

            updatePhysics(); // update all the kinematic rigidbodies

            worldstep(); // step the physic world

            syncEnemyToBodies(); //sync enemy mesh to enemy body

            Shared.rapierDebug.update();

        }

        //render scene
        Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);//TODO: you just need to do that once?
        Shared.renderer.render(Shared.scene, Shared.camera);

        //calculate/display stats
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
        Stats.updateTextStatsThrottled();
        Stats.stats.end();

    }
    // skipOneFrame = false;

    neednewframe = false;
    //repeat loop at next frame
    gameId = requestAnimationFrame(gameLoop);

}



/*---------------------------------*/
/* enemyLoop */
/*---------------------------------*/
//TODO: moved in Shared
const enableEnemy = true;
// const enemyMoveSpeed = Shared.moveSpeed*0.8;     // Adjust movement speed
const enemyMoveSpeed = Shared.moveSpeed * 0.1;     // Adjust movement speed
const enemyAttackDistance = 2;     // Adjust movement speed        
const up = new THREE.Vector3(0, 1, 0);
function enemyLoop() {

    if (!Shared.editorState.pause && enableEnemy) {

        const targetPos = Shared.yawObject.position.clone();
        Shared.enemyGroup.children.forEach(enemy => {

            const enemyMovementState = enemy.userData.movementState;
            // const enemyBody = enemyMovementState.body;

            // Compute the quaternion that makes the enemy look at the target
            const enemyPos = enemy.position.clone();
            const m = new THREE.Matrix4().lookAt(enemyPos, targetPos, up);
            const q = new THREE.Quaternion().setFromRotationMatrix(m);
            const rapierQuat = { x: q.x, y: q.y, z: q.z, w: q.w };// ✅ Convert to Rapier format
            enemyMovementState.rotation = q;
            // enemyBody.setNextKinematicRotation(rapierQuat);

            //if within reach attack, otherwise move towards player
            if (enemyPos.distanceTo(targetPos) < enemyAttackDistance) {
                console.log("ATTACK");
            } else {
                const toPlayer = targetPos.clone().sub(enemyPos);
                toPlayer.y = 0;//unless enemy is flying movement along Y is prohibited                
                toPlayer.normalize().multiplyScalar(enemyMoveSpeed);
                // const nextPos = enemyPos.add(toPlayer);
                enemyMovementState.moveVector = toPlayer;
                enemyMovementState.newPos = enemyMovementState.curPos.clone();

                computeNextPos(enemyMovementState, deltaTime);
                // updateVerticalSpeedAndPos(enemyMovementState, deltaTime);
                // updateHorizontalSpeedAndPos(enemyMovementState, deltaTime);

                Shared.updateMeshRotPos(enemyMovementState);
                Shared.scheduleSyncBodyFromMovementState(enemyMovementState) // schedule player rigidbody sync
                // Shared.updateMovementStatePhysics(enemyMovementState) // schedule enemy rigidbody sync
                // enemyBody.setNextKinematicTranslation(enemyMovementState.newPos);
            }
        });
    }
    requestAnimationFrame(enemyLoop);
}

/*---------------------------------*/
/* myworldstep */
/*---------------------------------*/
//wrapper around world step to check its not called twice within the same frame
//otherwise the physics go crazy
let neednewframe = false;
function worldstep() {
    if (neednewframe) {
        throw new Error("world.step has been called more than once within the same frame, this is forbidden.");
    }
    Shared.physWorld.step();
    neednewframe = true;
}

/*---------------------------------*/
// executeActions
/*---------------------------------*/
function executeActions() {
    if (!Shared.editorState.pause) {
        //pauseable actions
        Shared.playerMovementState.moveVector.set(0, 0, 0);
        if (Actions.moveCamLeft) Shared.playerMovementState.moveVector.x = -1;
        if (Actions.moveCamRight) Shared.playerMovementState.moveVector.x = 1;
        if (Actions.moveCamFront) Shared.playerMovementState.moveVector.z = -1;
        if (Actions.moveCamBack) Shared.playerMovementState.moveVector.z = 1;
        Shared.playerMovementState.moveVector.normalize();
        if (Actions.startGame) Shared.toggleGameMode();
        if (Actions.jump) jump();
        if (Actions.interact) interact();
        if (Actions.hideCol) toggleHideCollider();

        //animations
        if (
            Actions.moveCamLeft ||
            Actions.moveCamRight ||
            Actions.moveCamFront ||
            Actions.moveCamBack
        ) playClip(Shared.ANIM_WALK_NAME_L);
        else stopClip();

    } else {
        //unpauseable actions
    }
}


/*---------------------------------*/
// jump
/*---------------------------------*/
function jump() {
    // if (Shared.playerMovementState.isTouchingGround)
        Shared.playerMovementState.jumpPressed = true;
}

/*---------------------------------*/
// computeNextPos
/*---------------------------------*/
function computeNextPos(movementState, deltaTime) {

    const kcc = movementState.kcc;
    const collider = movementState.collider;
    const movement = movementState.moveVector.clone().multiplyScalar(movementState.moveSpeed);
    const nextVerticalSpeed = Math.max(-Shared.maxFallSpeed, movementState.verticalSpeed - (Shared.gravity * deltaTime));
    movement.y += nextVerticalSpeed
    movement.multiplyScalar(deltaTime);

    kcc.computeColliderMovement(
        collider,
        movement,
        null,
        movementState.collisionmask,
        null
    );
    let correctedMovement = kcc.computedMovement();
    let grounded = kcc.computedGrounded();
    
    //collision debug
    for (let i = 0; i < kcc.numComputedCollisions(); i++) {
        let collision = kcc.computedCollision(i);
        let othercollider = collision.collider;
        console.log("colliding with "+othercollider.userData.name)
        updateHighlight(othercollider, i);
    }

    if (grounded) {
        if (movementState.jumpPressed){
            movementState.verticalSpeed = Shared.jumpSpeed;
            movementState.jumpPressed = false;
            // console.log("jump");
        }
        // console.log("grounded"+movementState.verticalSpeed );
        movementState.moveSpeed = Shared.moveSpeed;
    }else{
        // console.log("notgrounded"+movementState.verticalSpeed );
        movementState.verticalSpeed = nextVerticalSpeed;//accumulate vertical speed
        movementState.moveSpeed = Shared.moveSpeed*0.5;
    } 

    movementState.newPos = movementState.curPos.clone().add(correctedMovement);
    movementState.curPos = movementState.newPos

}

/*---------------------------------*/
// interact
/*---------------------------------*/
function interact() {
    console.log("interact");
}

/*---------------------------------*/
// raycastActionnables
/*---------------------------------*/
let raycastChunkArray = [];
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)
let selectObject = null;

function raycastActionnables() {
    selectObject = null;
    const raycastTargets = [];

    //TODO: optimize with octree or BVH tree
    Shared.actionnablesGroup.traverse((child) => {
        if (child.isMesh) raycastTargets.push(child);
    });
    Shared.staticGroup.traverse((child) => {
        if (child.isMesh) raycastTargets.push(child);
    });
    Shared.enemyGroup.traverse((child) => {
        if (child.isMesh) raycastTargets.push(child);
    });
    // const raycastTargets = raycastChunkArray;
    raycaster.setFromCamera(screenCenter, Shared.camera);
    let doesIntersect = false;
    const visibleTargets = raycastTargets.filter(obj => obj.visible);
    const hits = raycaster.intersectObjects(visibleTargets, true);//true means recursive raycast, it parses children too

    let closestHit = null;

    for (const hit of hits) {
        if (!closestHit || hit.distance < closestHit.distance) {
            closestHit = hit;
        }
    }

    if (closestHit && closestHit.distance < 3) {
        doesIntersect = true;
    }

    if (doesIntersect) {

        if (closestHit.object?.userData?.type == "actionnable" ||
            closestHit.object?.userData?.type == "enemy"
        ) {
            selectObject = closestHit.object;
            if (selectObject.userData.actionnableParent != null)
                selectObject = selectObject.userData.actionnableParent
        }
    }

}

/*---------------------------------*/
// onMouseClick
/*---------------------------------*/
function onMouseClick(event) {
    if (selectObject) {
        selectObject?.userData?.actionnableData?.action(selectObject, playerState);
    }
    attack();
}

/*---------------------------------*/
// syncCameraTo
/*---------------------------------*/
// const camPlayerTweak = new THREE.Vector3(0,Shared.cameraHeightFromCapsuleCenter + 0.2,0);
const camPlayerTweak = new THREE.Vector3(0,Shared.cameraHeightFromCapsuleCenter,0);
function syncCameraTo(movementState, tweak=null) {
    const t = movementState.newPos;
    Shared.yawObject.position.set(
        t.x + (tweak ? tweak.x : 0), 
        t.y + (tweak ? tweak.y : 0), 
        t.z + (tweak ? tweak.z : 0) );
}

/*---------------------------------*/
// syncPlayerMesh
/*---------------------------------*/
// function movePlayerMesh(movementState) {
//     const root = Shared.Shared.playerMovementState.root;
//     const pos = movementState.newPos;
//     const rot = movementState.rotation;
//     root.quaternion.set(rot.x, rot.y, rot.z, rot.w);
//     root.rotation.y += Math.PI; // optional 180° turn if needed
//     const capsuleBottomY = pos.y - (Shared.halfHeight + Shared.playerRadius);
//     const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(root.quaternion); // compute forward vector in world space
//     root.position.set(
//         pos.x - forward.x * meshTweak.x,
//         capsuleBottomY,
//         pos.z - forward.z * meshTweak.z
//     );
// }

//move mesh to new position/rotation in movement state

/*---------------------------------*/
// syncEnemyToBodies
/*---------------------------------*/
function syncEnemyToBodies() {
    Shared.enemyGroup.children.forEach(enemy => {
        const enemyBody = enemy.userData.movementState.body;
        const t = enemyBody.translation();
        const q = enemyBody.rotation();
        enemy.position.set(t.x, t.y, t.z);
        enemy.quaternion.set(q.x, q.y, q.z, q.w)
    })
}

/*---------------------------------*/
// toggleHideCollider
/*---------------------------------*/
function toggleHideCollider() {
    Shared.colliderDebugGroup.visible = !Shared.colliderDebugGroup.visible;
}

/*---------------------------------*/
// updatePhysics
/*---------------------------------*/
function updatePhysics() {
    for (const update of Shared.pendingBodyUpdates) {
        update.body.setNextKinematicTranslation(update.pos);
        update.body.setNextKinematicRotation(update.quat);
    }
    Shared.pendingBodyUpdates.length = 0; // clear for next frame
}


/*-----------------------------------*/
// initHighlightPool               //
/*-----------------------------------*/

// outside update loop
const highlightCollidingMeshes = [];
const highlightColors = [0xCFFF00, 0xFFFF00, 0xFFA500, 0xFF0000]; // green, yellow, orange, red
const MAX_HIGHLIGHTS = 4; // slightly more than expected collisions

function initHighlightPool(scene) {
    for (let i = 0; i < MAX_HIGHLIGHTS; i++) {
        const color = highlightColors[i % highlightColors.length]; // cycle if more than 4
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
        });

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        mesh.name = "highlightCollidingMeshes_" + i;
        mesh.renderOrder = 999;   // always in front
        mesh.visible = false;
        highlightCollidingMeshes.push(mesh);
        Shared.colliderDebugGroup.add(mesh);
    }
}

/*---------------------------------*/
// updateHighlight
/*---------------------------------*/
// update per frame
// update a single highlight at a given index
function updateHighlight(collider, index, highlightBody = false) {
    if (!Shared.rapierDebug.isVisible()) return;
    if (!collider) return;
    if (index >= highlightCollidingMeshes.length) return;

    const mesh = highlightCollidingMeshes[index];
    mesh.visible = true;

    const rigidBody = collider.parent(); // optional: get parent rigid body
    const position = highlightBody ? rigidBody.translation() : collider.translation();
    const rotation = highlightBody ? rigidBody.rotation() : collider.rotation();

    mesh.position.set(position.x, position.y, position.z);
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    const shape = collider.shape;
    if (shape instanceof RAPIER.Cuboid) {
        const hx = shape.halfExtents.x;
        const hy = shape.halfExtents.y;
        const hz = shape.halfExtents.z;
        mesh.scale.set(hx * 2, hy * 2, hz * 2);
    } else if (shape instanceof RAPIER.Capsule) {
        const r = shape.radius;
        const hh = shape.halfHeight;
        mesh.scale.set(r * 2, hh * 2 + r * 2, r * 2);
    } else if (shape instanceof RAPIER.Ball) {
        const r = shape.radius;
        mesh.scale.set(r * 2, r * 2, r * 2);
    } else {
        mesh.scale.set(1, 1, 1);
    }
}

/*---------------------------------*/
// hideAllHighlights
/*---------------------------------*/
function hideAllHighlights() {
    highlightCollidingMeshes.forEach(m => m.visible = false);
}

/*----------------*/
/* animateLoop */
/*----------------*/
let currentAction = null;
let currentSingleAction = null;
let currentMixer = null;

function animateLoop() {
    if ((currentSingleAction || currentAction)
        && currentMixer) {
        currentMixer.update(deltaTime);
    }
    requestAnimationFrame(animateLoop);
}

/*----------------*/
/* playClip */
/*----------------*/
function playClip(clipName) {
    const clipInfo = Shared.clipActions.get(clipName);
    const nextAction = clipInfo?.clipAction;
    if (!nextAction || (nextAction === currentAction)) return;
    currentMixer = clipInfo.mixer;
    if (currentAction && currentAction !== nextAction) {
        currentAction.crossFadeTo(nextAction, 0.3, true);
    }
    //   console.log("SETACTION TO ",clipName);
    nextAction.reset().play();
    currentAction = nextAction;
}

/*----------------*/
/* playClipOnce */
/*----------------*/
function playClipOnce(clipName, endAction = null) {
    const clipInfo = Shared.clipActions.get(clipName);
    const nextAction = clipInfo?.clipAction;
    currentMixer = clipInfo.mixer;
    nextAction.reset();
    nextAction.setLoop(THREE.LoopOnce, 1);
    nextAction.clampWhenFinished = true;

    // Remove previous listener to prevent stacking
    currentMixer.removeEventListener('finished', currentMixer._onFinishListener);

    // Add new listener
    currentMixer._onFinishListener = (e) => {
        if (e.action === nextAction) {  // check which action finished
            console.log('Animation finished!');
            if (endAction) endAction();
        }
    };
    currentMixer.addEventListener('finished', currentMixer._onFinishListener);

    nextAction.play();
    currentSingleAction = nextAction;
}

/*----------------*/
/* stopClip */
/*----------------*/
function stopClip() {
    // return;
    if (!currentAction) return;
    currentAction.fadeOut(0.3); // fades over 0.3s
    currentAction = null;
}

/*----------------*/
/* makePartialClip */
/*----------------*/
function makePartialClip(clip, boneNames) {
    const filteredTracks = clip.tracks.filter(track => {
        return boneNames.some(name => track.name.startsWith(name));
    });
    return new THREE.AnimationClip(clip.name + '_partial', clip.duration, filteredTracks);
}


/*----------------*/
/* attack */
/*----------------*/
let isAttacking = false;
let attackLoopId;
function attack() {

    if (!isAttacking) {
        isAttacking = true;

        playClipOnce(Shared.ANIM_ATTACK_NAME, endAttack);
        attackLoopId = requestAnimationFrame(attackLoop);
    }

}

/*----------------*/
/* endAttack */
/*----------------*/
function endAttack() {
    console.log("ENDATTACK");
    isAttacking = false;
    cancelAnimationFrame(attackLoopId);
}

function attackLoop() {

    console.log("attackloop")
    const weaponCollider = playerState.weaponCollider;
    const weaponBody = playerState.weaponBody;
    const weaponColliderDesc = weaponBody.userData.colliderDesc;
    const pos = weaponBody.translation();
    const rot = weaponBody.rotation();

    Shared.physWorld.intersectionsWithShape(
        pos, //shapePos: pos,
        rot, //shapeRot: rot,
    weaponColliderDesc.shape, //shape: weaponColliderDesc.shape,
        (otherCollider) =>{
            console.log('3 Sword overlapping '+ otherCollider.userData?.name);
        }
        , //callback: null, // callback: (collider: Collider) => boolean,
        null, //filterFlags?: QueryFilterFlags,
        // null, //filterGroups?: InteractionGroups,
        Shared.COL_MASKS.PLAYERWPN, //filterGroups?: InteractionGroups,
        weaponCollider, //filterExcludeCollider?: Collider,
        weaponBody, //filterExcludeRigidBody?: RigidBody,
        null //filterPredicate?: (collider: Collider) => boolean,
    )


    attackLoopId = requestAnimationFrame(attackLoop);
}