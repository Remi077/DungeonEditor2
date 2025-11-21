// @ts-nocheck
import * as THREE from 'three';
import * as RAPIER from 'rapier';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from './gameHUD.js';

/*---------------------------------*/
// actions variables
/*---------------------------------*/
export let Actions = {};
let gameId = null;
let enemyId = null;
let attackLoopId = null;

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
let myClonedEnemyHandle = null;
export function startGameLoop() {

    Shared.resetAllActions();
    Shared.editorState.gameRunning = true;
    Shared.setPause(false);
    requestAnimationFrame(gameLoopFirstFrame);
    Shared.clock.start();
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTGAMECOLOR);
    Shared.playerState.verticalSpeed = 0;
    Shared.playerState.collisionmask = Shared.COL_MASKS.PLAYER;

    document.addEventListener("mousedown", onMouseClick, false);
    // document.addEventListener("mouseup", onMouseUp, false);

    if (firstInit) {
        firstInit = false;
        const campos = Shared.yawObject.position;
        // --- Create kinematic body ---
        const playerBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(campos.x, campos.y + Shared.cameraHeightFromCapsuleCenter, campos.z); // initial position where camera is

        const playerBody = Shared.createRigidBodyCustom(playerBodyDesc,"playerBody");

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
        // kcc.enableAutostep(1.5, 0.2, true);
        // Snap to the ground if the vertical distance to the ground is smaller than 0.5.
        kcc.enableSnapToGround(0.5);
        // kcc.disableSnapToGround();

        // --- Create capsule collider ---
        const playerColliderDesc = RAPIER.ColliderDesc.capsule(Shared.halfHeight, Shared.playerRadius)
            .setFriction(0.9)
            .setRestitution(0)
            .setCollisionGroups(Shared.COL_MASKS.PLAYER);
            
        const playerCollider = Shared.createColliderCustom(playerColliderDesc, playerBody, "playerCollider");

        Shared.playerState.body = playerBody;
        Shared.playerState.collider = playerCollider;
        Shared.playerState.colliderDesc = playerColliderDesc;
        Shared.playerState.offsetRootToBody = new THREE.Vector3(
            0,Shared.halfHeight + Shared.playerRadius,0
        );
        Shared.playerState.tweakRot = Math.PI
        Shared.playerState.tweakPos = new THREE.Vector3(0.1,0,0.1);

        Shared.playerState.kcc = kcc;

        initHighlightPool(Shared.scene);

        //initialize enemy template rapier primitives
        const EnemyTemplateState = Shared.EnemyTemplateState;
        const enemyColliderDesc = RAPIER.ColliderDesc.capsule(Shared.halfHeight, Shared.playerRadius)
            .setFriction(0.9)
            .setRestitution(0)
            .setCollisionGroups(Shared.COL_MASKS.ENEMY);
        const e_kcc = Shared.physWorld.createCharacterController(Shared.skin); //0.1 is skin distance
        e_kcc.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        e_kcc.setMinSlopeSlideAngle(30 * Math.PI / 180);
        e_kcc.enableAutostep(0.5, 0.2, true);
        e_kcc.enableSnapToGround(0.5);
        EnemyTemplateState.kcc = e_kcc
        EnemyTemplateState.moveSpeed = 0.8;
        EnemyTemplateState.collisionmask = Shared.COL_MASKS.ENEMY
        EnemyTemplateState.colliderDesc = enemyColliderDesc
        EnemyTemplateState.offsetRootToBody = new THREE.Vector3(0, Shared.halfHeight + Shared.playerRadius, 0);

        let num = 1;
        Shared.enemySpawnGroup.children.forEach(
            child => {
                num --;
                // if (num<0) return;
                const p = child.getWorldPosition(new THREE.Vector3());
                const q = child.getWorldQuaternion(new THREE.Quaternion());
                const myClonedEnemy = Shared.EnemyTemplateState.clone(
                    child.name, p, //q
                );
                Shared.enemyGroup.add(myClonedEnemy.root);
            }
        )

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
    Shared.playerState.curPos = Shared.yawObject.position.clone();
    Shared.playerState.curPos.y -= Shared.cameraHeightFromCapsuleCenter;
    Shared.playerState.body.setNextKinematicTranslation(Shared.playerState.curPos);
    Shared.physWorld.step();
    gameId = requestAnimationFrame(gameLoop);

    // playClip(Shared.EnemyTemplateState,"Idle");
    // playClip(myClonedEnemyHandle,"Idle");
}

/*---------------------------------*/
// stopGameLoop
/*---------------------------------*/
export function stopGameLoop() {
    Shared.editorState.gameRunning = false;
    cancelAnimationFrame(gameId);
    cancelAnimationFrame(enemyId);
    cancelAnimationFrame(attackLoopId);
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
        Shared.playerState.moveVector.applyQuaternion(Shared.yawObject.quaternion);
        Shared.playerState.rotation.copy(Shared.yawObject.quaternion);
        Shared.playerState.newPos = Shared.playerState.curPos.clone();

        computeNextPos(Shared.playerState, deltaTime); // compute next position based on movement and collisions

        // BODY FINAL UPDATES
        Shared.updateMeshRotPos(Shared.playerState); // update the mesh position
        syncCameraTo(Shared.playerState, camPlayerTweak); // update the camera position

        raycastActionnables();        //raycast against actionnables

        //consistent approach: 
        //we update the mesh/rendered models based on movement/collision data
        //then in last step we sync the rigidbodies to the rendered models

        Shared.scheduleSyncBodyFromcharacterState(Shared.playerState) // schedule player rigidbody sync
        Shared.scheduleSyncBodyToMesh(Shared.playerState.weapon, Shared.playerState.weaponBody, Shared.playerState.weaponOffsetRootToBody) // schedule weapon rigidbody sync

        updatePhysics(); // update all the scene kinematic rigidbodies. Player/enemies/weapons/doors etc...

        worldstep(); // step the physic world

        Shared.rapierDebug.update(); // update collider debug logic

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
const enemyMoveSpeed = Shared.moveSpeed * 0.02;     // Adjust movement speed
const enemyAttackDistance = 2.4;     // Adjust movement speed        
const up = new THREE.Vector3(0, 1, 0);
// let oneFrameOnly = false;
function enemyLoop() {

    if (
        !Shared.editorState.pause && enableEnemy
        // && !oneFrameOnly
    ) {
        // oneFrameOnly = true;

        const targetPos = Shared.yawObject.position.clone();
        Shared.enemyGroup.children.forEach(enemy => {

            const enemycharacterState = Shared.characterStateNameMap.get(enemy.userData.name);

            // Compute the quaternion that makes the enemy look at the target
            const enemyPos = enemy.position.clone();

            const isAlive = enemycharacterState.health > 0;
            
            // Compute direction but ignore vertical difference:
            if (isAlive){

                // same as player loop:
                // 1) compute desired movement (enemy goes to player)
                // 2) compute next position based on movement+collisions+gravity
                // 3) update mesh position
                // 4) schedule body and weaponbody sync

                const toPlayer = targetPos.clone().sub(enemyPos);
                toPlayer.y = 0;                  // <-- remove pitch
                toPlayer.normalize();
                const yaw = Math.atan2(toPlayer.x, toPlayer.z); // Compute yaw angle from direction (THREE uses Z-forward)
                const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));// Build quaternion with yaw only
                
                enemycharacterState.rotation = q;

                //if within reach attack, otherwise move towards player
                if (enemyPos.distanceTo(targetPos) < enemyAttackDistance) {
                    // console.log("ATTACK");
                    // playClip(enemycharacterState,"Idle",true);
                    playClip(enemycharacterState,"Attack",true);
                    enemycharacterState.moveVector.set(0,0,0);
                } else {
                    // const toPlayer = targetPos.clone().sub(enemyPos);
                    // toPlayer.y = 0;//unless enemy is flying movement along Y is prohibited                
                    // toPlayer.normalize().multiplyScalar(enemyMoveSpeed);
                    toPlayer.multiplyScalar(enemycharacterState.moveSpeed);
                    // const nextPos = enemyPos.add(toPlayer);
                    enemycharacterState.moveVector = toPlayer;
                    enemycharacterState.newPos = enemycharacterState.curPos.clone();
                    playClip(enemycharacterState,"Walk",true);
                }
                
                computeNextPos(enemycharacterState, deltaTime); //compute next position based on movement and collisions

                Shared.updateMeshRotPos(enemycharacterState); //update mesh position
                Shared.scheduleSyncBodyFromcharacterState(enemycharacterState) // schedule player rigidbody sync
                Shared.scheduleSyncBodyToMesh(enemycharacterState.weapon, enemycharacterState.weaponBody, enemycharacterState.weaponOffsetRootToBody) // schedule weapon rigidbody sync
            }

        });
    }
    enemyId = requestAnimationFrame(enemyLoop);
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
        Shared.playerState.moveVector.set(0, 0, 0);
        if (Actions.moveCamLeft) Shared.playerState.moveVector.x = -1;
        if (Actions.moveCamRight) Shared.playerState.moveVector.x = 1;
        if (Actions.moveCamFront) Shared.playerState.moveVector.z = -1;
        if (Actions.moveCamBack) Shared.playerState.moveVector.z = 1;
        Shared.playerState.moveVector.normalize();
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
        ) playClip(Shared.playerState,Shared.ANIM_WALK_NAME_L);
        else stopClip(Shared.playerState);

    } else {
        //unpauseable actions
    }
}


/*---------------------------------*/
// jump
/*---------------------------------*/
function jump() {
    // if (Shared.playerState.isTouchingGround)
        Shared.playerState.jumpPressed = true;
}

/*---------------------------------*/
// computeNextPos
/*---------------------------------*/
function computeNextPos(characterState, deltaTime) {

    const kcc = characterState.kcc;
    const collider = characterState.collider;
    const movement = characterState.moveVector.clone().multiplyScalar(characterState.moveSpeed);
    const nextVerticalSpeed = Math.max(-Shared.maxFallSpeed, characterState.verticalSpeed - (Shared.gravity * deltaTime));
    movement.y += nextVerticalSpeed
    
    //add repulsion forces from hit
    movement.add(characterState.hitRepulsionForce);
    // console.log(characterState.name,characterState.hitRepulsionForce);

    //decorrelate from framerate
    movement.multiplyScalar(deltaTime);

    kcc.computeColliderMovement(
        collider,
        movement,
        null,
        characterState.collisionmask,
        null
    );
    let correctedMovement = kcc.computedMovement();
    let grounded = kcc.computedGrounded();
    
    //collision debug
    for (let i = 0; i < kcc.numComputedCollisions(); i++) {
        let collision = kcc.computedCollision(i);
        let othercollider = collision.collider;
        // console.log("colliding with "+othercollider.userData.name)
        updateHighlight(othercollider, i);
    }

    if (grounded) {
        if (characterState.jumpPressed){
            characterState.verticalSpeed = Shared.jumpSpeed;
            characterState.jumpPressed = false;
            // console.log("jump");
        }
        // console.log("grounded"+characterState.verticalSpeed );
        // characterState.moveSpeed = Shared.moveSpeed; //TOFIX
    }else{
        // console.log("notgrounded"+characterState.verticalSpeed );
        characterState.verticalSpeed = nextVerticalSpeed;//accumulate vertical speed
        // characterState.moveSpeed = Shared.moveSpeed*0.5; //TOFIX
    } 

    characterState.newPos = characterState.curPos.clone().add(correctedMovement);
    characterState.curPos = characterState.newPos

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
        selectObject?.userData?.actionnableData?.action(selectObject, Shared.playerState);
    }
    attack();
}

/*---------------------------------*/
// syncCameraTo
/*---------------------------------*/
// const camPlayerTweak = new THREE.Vector3(0,Shared.cameraHeightFromCapsuleCenter + 0.2,0);
const camPlayerTweak = new THREE.Vector3(0,Shared.cameraHeightFromCapsuleCenter,0);
function syncCameraTo(characterState, tweak=null) {
    const t = characterState.newPos;
    Shared.yawObject.position.set(
        t.x + (tweak ? tweak.x : 0), 
        t.y + (tweak ? tweak.y : 0), 
        t.z + (tweak ? tweak.z : 0) );
}

const psyncObjectTo = new THREE.Vector3();
const qsyncObjectTo = new THREE.Quaternion();
function syncObjectTo(characterState, targetObj) {
    const p = targetObj.getWorldPosition(psyncObjectTo);
    const q = targetObj.getWorldQuaternion(qsyncObjectTo);
    characterState.root.position.set(
        p.x, p.y, p.z
    )
    characterState.root.rotation.set(
        q.x, q.y, q.z, q.w
    )
}

/*---------------------------------*/
// syncPlayerMesh
/*---------------------------------*/
// function movePlayerMesh(characterState) {
//     const root = Shared.Shared.playerState.root;
//     const pos = characterState.newPos;
//     const rot = characterState.rotation;
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
        const enemyBody = enemy.userData.characterState.body;
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
const activeMixers = new Set();
const inactiveMixers = new Set();

function animateLoop() {
    for (const mixer of activeMixers) {
        mixer.update(deltaTime);
    }
    requestAnimationFrame(animateLoop);
}


/*----------------*/
/* playClip */
/*----------------*/
function playClip(characterState,clipName,r=false, v=false) {
    // const clipInfo = Shared.clipActions.get(clipName);
    const nextAction = characterState.animationActions.get(clipName);
    const currentMixer = characterState.mixer;
    if (!nextAction || (nextAction === characterState.currentAction)) return;
    activateMixer(currentMixer);

    if (!r)
        nextAction.reset().play();//start next action before fading out previous one

    if (r){
    //start at random point in the anim
        const clip = nextAction.getClip();
        const randomOffset = Math.random() * clip.duration;
        nextAction.reset();
        nextAction.time = randomOffset;   // <-- start at a random point
        nextAction.play();
    }

    if (characterState.currentAction && characterState.currentAction !== nextAction) {
        characterState.currentAction.crossFadeTo(nextAction, 0.3, true);
        // characterState.currentAction.crossFadeTo(nextAction, 0.9, true);
        if (v)console.log("FADEOUT TO ",clipName);
    } else {
    if (v)console.log("SETACTION TO ",clipName);}
    // nextAction.reset().play();
    characterState.currentAction = nextAction;
}

function activateMixer(mixer, single=false) {
    if (!single) mixer._isActive = true;
    else mixer._isSingleActive = true;
    inactiveMixers.delete(mixer);
    activeMixers.add(mixer);
}

function deactivateMixer(mixer, single=false) {
    if (!single) mixer._isActive = false;
    else mixer._isSingleActive = false;
    if (mixer._isActive || mixer._isSingleActive) return;
    activeMixers.delete(mixer);
    inactiveMixers.add(mixer);
}

/*----------------*/
/* playClipOnce */
/*----------------*/
function playClipOnce(characterState,clipName, endAction = null) {
    // const clipInfo = Shared.clipActions.get(clipName);
    const nextAction = characterState.animationActions.get(clipName);
    const currentMixer = characterState.mixer;
    activateMixer(currentMixer, true);
    nextAction.reset();
    nextAction.setLoop(THREE.LoopOnce, 1);
    nextAction.clampWhenFinished = true;

    // Remove previous listener to prevent stacking
    currentMixer.removeEventListener('finished', currentMixer._onFinishListener);

    // Add new listener
    currentMixer._onFinishListener = (e) => {
        if (e.action === nextAction) {  // check which action finished
            console.log('Animation finished!');
            deactivateMixer(currentMixer, true);
            if (endAction) endAction(characterState);
        }
    };
    currentMixer.addEventListener('finished', currentMixer._onFinishListener);

    nextAction.play();
}

/*----------------*/
/* stopClip */
/*----------------*/
function stopClip(characterState) {
    // return;
    if (!characterState.currentAction) return;
    characterState.currentAction.fadeOut(0.3); // fades over 0.3s
    characterState.currentAction = null;
    // OPTIONAL — if no action is running anymore
    setTimeout(() => {
        deactivateMixer(characterState.mixer);
    }, 300);
}


function stopAllActions(characterState, exceptAction = null) {
    characterState.animationActions.forEach((action) => {
        if (action !== exceptAction) {
            action.stop();
            // action.enabled = false;
            // action.setEffectiveWeight(0);
        }
    });
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
function attack() {

    if (!isAttacking) {
        isAttacking = true;

        playClipOnce(Shared.playerState,Shared.ANIM_ATTACK_NAME, endAttack);
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

    // console.log("attackloop")
    const weaponCollider = Shared.playerState.weaponCollider;
    const weaponBody = Shared.playerState.weaponBody;
    const weaponColliderDesc = Shared.playerState.colliderDesc;
    const pos = weaponBody.translation();
    const rot = weaponBody.rotation();

    // return;

    Shared.physWorld.intersectionsWithShape(
        pos, //shapePos: pos,
        rot, //shapeRot: rot,
        weaponColliderDesc.shape, //shape: weaponColliderDesc.shape,
        (otherCollider) =>{
            const hitCharacter = otherCollider.userData?.characterState
            // const hitCharacter = Shared.characterStateNameMap.get(otherCollider.name);
            if (hitCharacter) {
                console.log("HIT",hitCharacter.name);
                hitCollider(hitCharacter, Shared.playerState);}
        }
        , //callback: null, // callback: (collider: Collider) => boolean,
        null, //filterFlags?: QueryFilterFlags,
        null, //filterGroups?: InteractionGroups,
        // Shared.COL_MASKS.PLAYERWPN, //filterGroups?: InteractionGroups,
        weaponCollider, //filterExcludeCollider?: Collider,
        Shared.playerState.body,
        // weaponBody, //filterExcludeRigidBody?: RigidBody,
        null //filterPredicate?: (collider: Collider) => boolean,
    )


    attackLoopId = requestAnimationFrame(attackLoop);
}

//make the enemy invincible for a few frames after being hit
const invincibleDuration = 1;//1s
const repulsionDuration = 0.3;//1s
const maxHitRepulsionForce = 5;//1s
function hitCollider(hitCharacter, hitter){

    if (hitCharacter.invincibility || hitCharacter.health <= 0) {
        // console.log("hitCollider skip")
        return;
    }

    hitCharacter.invincibility = true;
    console.log("hitCharacter ", hitCharacter.name)
    // hitCharacter.health -= 25;
    hitCharacter.health -= 50;
    // hitCharacter.health -= 100;
    const hitRepulsionForce = hitCharacter.root.position.clone().sub(hitter.root.position);
    hitRepulsionForce.y = 0;
    hitRepulsionForce.normalize().multiplyScalar(maxHitRepulsionForce);
    hitCharacter.hitRepulsionForce.copy(hitRepulsionForce);

    if (hitCharacter.health <= 0) {
        console.log("character dead");
        // stopClip(hitCharacter);
        stopAllActions(hitCharacter);
        playClipOnce(hitCharacter,"Die",die);
    } else {
        hitCharacter.root.traverse((child) =>{
            if (child.isMesh){
                child.material?.color?.set(0xff0000);
            }}
        )        
        playClipOnce(hitCharacter,"Hurt");
        requestAnimationFrame(() => invincibleFrames(hitCharacter));
    }
    // invincibleFrames(hitCharacter);
    
}

function invincibleFrames(hitCharacter){
    hitCharacter.timeSinceLastHit += deltaTime;
    if (hitCharacter.timeSinceLastHit > repulsionDuration) {
        hitCharacter.hitRepulsionForce.set(0, 0, 0);
        hitCharacter.root.traverse((child) =>{
            if (child.isMesh){
                child.material?.color?.set(0xffffff);
            }}
        )
    }
    if (hitCharacter.timeSinceLastHit > invincibleDuration) {
        hitCharacter.timeSinceLastHit = 0;
        hitCharacter.invincibility = false;

        console.log("last invincibleFrames call",hitCharacter.timeSinceLastHit)
    } else {
        // hitRepulsionForce.
        console.log("new invincibleFrames call",hitCharacter.timeSinceLastHit)
        // requestAnimationFrame(hitCollider);
        requestAnimationFrame(() => invincibleFrames(hitCharacter));
    }
}

function die(thisCharacter){
    thisCharacter.body.setEnabled(false);
    Shared.physWorld.removeCollider(thisCharacter.collider, true);
    Shared.physWorld.removeCollider(thisCharacter.weaponCollider, true);
}