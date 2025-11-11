// @ts-nocheck
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.12.0';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from './gameHUD.js';

/*---------------------------------*/
// GAMEPLAY VARIABLES
/*---------------------------------*/

// Player physical and camera setup

const playerHeight = 1.8; // total player height in meters
const cameraHeight = 1.3; // desired camera (eye) height above the floor
// const cameraHeight = Shared.cameraOffsetY; // desired camera (eye) height above the floor
const playerRadius = 0.4; // radius of the capsule collider

// Distance from capsule center (which is halfway up the capsule) to the camera position.
// Needed because Rapier places the capsule's origin at its center, not at the feet.
const cameraHeightFromCapsuleCenter = cameraHeight - playerHeight / 2;

// Half-height of the *cylindrical part* of the capsule.
// The capsule’s total height = 2 * halfHeight + 2 * radius = playerHeight
// halfHeight is a bit misleading because it’s not half of the total capsule height, it’s half of the cylindrical part only
const halfHeight = (playerHeight / 2) - playerRadius;

// move variables
// let moveVector = new THREE.Vector3();

// jump variables
//max height
//kinetic e = potential e
//(1/2)mv^2=mgh
//v=sqrt(2gh)
// const jumpSpeed     = 3.5;
// const maxJumpHeight = 0.75;
const maxJumpHeight = 1;
const jumpSpeed = Math.sqrt(2 * Shared.gravity * maxJumpHeight);
// let verticalSpeed = 0;
// let isJumping = false;
// let jumpPressed = false;


// max slope in degrees you want to treat as "floor"
const maxSlopeDeg = 55;
const maxSlopeRad = THREE.MathUtils.degToRad(maxSlopeDeg);
// vertical threshold = cosine of slope
const verticalThreshold = Math.cos(maxSlopeRad);

//inventory
const playerState = {
    "health": 100,
    "maxHealth": 100,
    "inventory": {},
};

// actions variables
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
    // playActionTest: {key: 'KeyB', OnPress: true }
};

/*---------------------------------*/
// startGameLoop
/*---------------------------------*/
let firstInit = true;
let playerBody = null;
let playerColliderDesc = null;
let playerCollider = null;

function newMovementState(){
    const newObj = {
        body: playerBody,
        collider: playerCollider,
        verticalSpeed: 0,
        curPos: 0,
        newPos: 0,
        jumpPressed: false,
        isTouchingGround: false,
        isTouchingCeiling: false,
        moveVector: new THREE.Vector3(),
        moveSpeed: Shared.moveSpeed,
        rotation: new THREE.Quaternion(),
        collisionmask: null,
    }
    Object.seal(newObj);
    return newObj;
}
const playerMovementState = newMovementState()

// let swordMesh;
// let swordBody;
export function startGameLoop() {

    Shared.resetAllActions();
    Shared.editorState.gameRunning = true;
    Shared.setPause(false);
    requestAnimationFrame(gameLoopFirstFrame);
    Shared.clock.start();
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTGAMECOLOR);
    playerMovementState.verticalSpeed = 0;
    playerMovementState.collisionmask = Shared.COL_MASKS.PLAYER;

    document.addEventListener("mousedown", onMouseClick, false);
    document.addEventListener("mouseup", onMouseUp, false);

    if (firstInit) {
        firstInit = false;
        const campos = Shared.yawObject.position;
        // --- Create kinematic body ---
        const playerBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(campos.x, campos.y + cameraHeightFromCapsuleCenter, campos.z); // initial position where camera is

        playerBody = Shared.physWorld.createRigidBody(playerBodyDesc);
        playerBody.userData = { name: "playerBody" };

        // --- Create capsule collider ---
        playerColliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, playerRadius)
            .setFriction(0.9)
            .setRestitution(0)
            .setCollisionGroups(Shared.COL_MASKS.PLAYER);

        playerCollider = Shared.physWorld.createCollider(playerColliderDesc, playerBody);
        Shared.colliderNameMap.set(playerCollider, "playerCollider");
        playerCollider.userData = { name: "playerCollider" };

        playerMovementState.body = playerBody;
        playerMovementState.collider = playerCollider;

        initHighlightPool(Shared.scene);

        // create enemy colliders
        Shared.enemyGroup.children.forEach(element => {


            const enemyBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
                .setTranslation(element.position.x, element.position.y, element.position.z)
            // .setRotation(element.quaternion.x, element.position.y, element.position.z)

            const enemyBody = Shared.physWorld.createRigidBody(enemyBodyDesc);
            enemyBody.userData = { name: "enemyBody_" + element.name };

            const enemyColliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, playerRadius)
                .setFriction(0.9)
                .setRestitution(0)
                .setCollisionGroups(Shared.COL_MASKS.ENEMY)
                ;

            const enemyCollider = Shared.physWorld.createCollider(enemyColliderDesc, enemyBody);

            const enemyMovementState    = newMovementState()
            enemyMovementState.body     = enemyBody
            enemyMovementState.collisionmask = Shared.COL_MASKS.ENEMY
            enemyMovementState.collider = enemyCollider
            enemyMovementState.curPos   = element.position

            Shared.colliderNameMap.set(enemyCollider, "enemyCollider_" + element.name);
            enemyCollider.userData = { name: "enemyCollider_" + element.name};
            element.userData.movementState = enemyMovementState;

        });

        //weapon collider and body


        
        //start enemy loop
        enemyLoop();

        //start animate loop
        animateLoop();

    }

}

function gameLoopFirstFrame() {
    //place the player rigidbody where the camera currently is and step the world
    playerMovementState.curPos = Shared.yawObject.position.clone();
    playerMovementState.curPos.y -= cameraHeightFromCapsuleCenter;
    playerBody.setNextKinematicTranslation(playerMovementState.curPos);
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
    document.removeEventListener("mouseup", onMouseUp, false);
    // document.removeEventListener("wheel", onMouseWheel, { passive: false });
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

    // console.log("player rigidbody position:", playerBody.translation());
    // console.log("camera position:", Shared.yawObject.position);

    if (!Shared.editorState.gameRunning) return;

    //execute actions
    executeActions();

    if (!Shared.editorState.pause) { // && !skipOneFrame) {

        //fps counter
        Stats.stats.begin();

        //initialize gameplay variables this loop
        deltaTime = Shared.clock.getDelta();       // Time elapsed since last frame
        //getDelta resets the clock at every call
        //so its important its called once per clock and per frame
        //all the other frame loop (enemyLoop, animateLoop) which reads deltaTime and call
        //requestAnimationFrame actually run on one single thread in a given unknown order
        //so best approach is to set deltaTime at same place every loop and have all the 
        //other loops consume this deltaTime

        //clear the onpress/onrelease actions now that they have been sampled 
        //in that loop to avoid resampling
        Shared.releaseSingleEventActions();

        //debug only: clear visibility of colliding meshes
        hideAllHighlights();

        /*-----------------------------------------------------*/
        /* INITIALIZE PLAYER MOVE AND ROTATION BASED ON INPUTS */
        /*-----------------------------------------------------*/
        playerMovementState.moveVector.applyQuaternion(Shared.yawObject.quaternion);
        playerMovementState.rotation.copy(Shared.yawObject.quaternion);
        playerMovementState.newPos = playerMovementState.curPos.clone();

        /*-----------------------------------------------*/
        /* VERTICAL MOVEMENTS + GROUND/CEILING DETECTION */
        /*-----------------------------------------------*/
        updateVerticalSpeedAndPos(playerMovementState,deltaTime);
        playerMovementState.jumpPressed = false; //clear jump event

        /*---------------------------------------------*/
        // HORIZONTAL MOVEMENTS + WALL DETECTION       //
        /*---------------------------------------------*/
        updateHorizontalSpeedAndPos(playerMovementState,deltaTime);

        // BODY FINAL UPDATES
        playerMovementState.body.setNextKinematicTranslation(playerMovementState.newPos);
        playerMovementState.body.setNextKinematicRotation(playerMovementState.rotation);


        //TOIMPROVE: call it in a recursive scheduled on next frame function
        //update animated textures
        // convert ms → seconds
        // const t = now * 0.001;
        // // only update if enough time has passed
        // if (t - lastUVUpdate >= Shared.uvUpdateInterval) {
        //     Shared.updateAnimatedTextures();
        //     lastUVUpdate = t;
        // }

        //raycast against actionnables
        raycastActionnables();

        //render scene
        Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);//TODO: you just need to do that once?
        Shared.renderer.render(Shared.scene, Shared.camera);

        //calculate/display stats
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
        Stats.updateTextStatsThrottled();
        Stats.stats.end();

        if (Shared.physWorld) {
            
            // syncRigidBodyToBones(); //sync elected rb to their bones

            syncWeaponBody();

            updatePhysics();

            myworldstep();

            syncCameraToPlayer(); // camera follows capsule

            syncPlayerMesh(); //sync player mesh to player body
            // syncWeaponBody();

            syncEnemyToBodies(); //sync enemy mesh to enemy body

            Shared.rapierDebug.update();

        }

    }
    // skipOneFrame = false;

    neednewframe = false;
    //repeat loop at next frame
    gameId = requestAnimationFrame(gameLoop);

}


//TODO: moved in Shared
const enableEnemy = false;
// const enemyMoveSpeed = Shared.moveSpeed*0.8;     // Adjust movement speed
const enemyMoveSpeed = Shared.moveSpeed*0.1;     // Adjust movement speed
const enemyAttackDistance = 2;     // Adjust movement speed        
const up = new THREE.Vector3(0, 1, 0);

function enemyLoop() {

    if (!Shared.editorState.pause && enableEnemy) {
        
        const targetPos = Shared.yawObject.position.clone();
        Shared.enemyGroup.children.forEach(enemy => {

            const enemyMovementState= enemy.userData.movementState;
            const enemyBody = enemyMovementState.body;

            // Compute the quaternion that makes the enemy look at the target
            const enemyPos = enemy.position.clone();
            const m = new THREE.Matrix4().lookAt(enemyPos, targetPos, up);
            const q = new THREE.Quaternion().setFromRotationMatrix(m);
            const rapierQuat = { x: q.x, y: q.y, z: q.z, w: q.w };// ✅ Convert to Rapier format
            enemyMovementState.rotation = q;
            enemyBody.setNextKinematicRotation(rapierQuat);

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
                updateVerticalSpeedAndPos(enemyMovementState,deltaTime);
                updateHorizontalSpeedAndPos(enemyMovementState,deltaTime);

                enemyBody.setNextKinematicTranslation(enemyMovementState.newPos);
            }
        });
    }
    requestAnimationFrame(enemyLoop);
}


//wrapper around world step to check its not called twice within the same frame
//otherwise the physics go crazy
let neednewframe = false;
function myworldstep() {
    if (neednewframe) {
        throw new Error("world.step has been called more than once within the same frame, this is forbidden.");
    }
    // console.log("WORLD STEP")
    // Shared.enemyGroup.children.forEach(enemy => {
    //     const enemyBodyPosition = enemy.userData.movementState.body.translation();
        // console.log("ENEMYPOSBEFOREWORLDSTEP",enemyBodyPosition);
    // })
    Shared.physWorld.step();
    neednewframe = true;
    // Shared.enemyGroup.children.forEach(enemy => {
        // const enemyBodyPosition = enemy.userData.movementState.body.translation();
        // console.log("ENEMYPOSAFTERWORLDSTEP",enemyBodyPosition);
    // })
}

/*---------------------------------*/
// executeActions
/*---------------------------------*/
function executeActions() {
    if (!Shared.editorState.pause) {
        //pauseable actions
        playerMovementState.moveVector.set(0,0,0);
        if (Actions.moveCamLeft) playerMovementState.moveVector.x = -1;
        if (Actions.moveCamRight) playerMovementState.moveVector.x = 1;
        if (Actions.moveCamFront) playerMovementState.moveVector.z = -1;
        if (Actions.moveCamBack) playerMovementState.moveVector.z = 1;
        playerMovementState.moveVector.normalize();
        if (Actions.startGame) Shared.toggleGameMode();
        if (Actions.jump) jump();
        if (Actions.interact) interact();
        if (Actions.hideCol) toggleHideCollider();
        // if (Actions.playActionTest) playClip("Armature_Man_Walking");

        //animations
        if (
            Actions.moveCamLeft || 
            Actions.moveCamRight || 
            Actions.moveCamFront || 
            Actions.moveCamBack
        ) playClip(Shared.ANIM_WALK_NAME_L);
        // ) playClip(Shared.ANIM_WALK_NAME);
        else stopClip();

    } else {
        //unpauseable actions
    }
}

/*---------------------------------*/
// jump related functions 
/*---------------------------------*/

/*---------------------------------*/
// jump
/*---------------------------------*/
function jump() {
    if (playerMovementState.isTouchingGround)
        playerMovementState.jumpPressed = true;
}

/*---------------------------------*/
// groundCeilingCheck
/*---------------------------------*/
let groundDebugArrow = null;
let ceilingDebugArrow = null;
let debugCapsuleBottom = null;
let debugCapsuleUp = null;
let firstTimeArrow = true;
function groundCeilingCheck(thisbody, thisCollider) {

    const bodyPos = thisbody.translation();
    // Y position of the *bottom* of the capsule (the player's feet).
    // The capsule's center is at bodyPos.y, so we subtract the cylinder half-height
    // plus the spherical cap radius to reach the very bottom of the capsule.
    // halfHeight is a bit misleading because it’s not half of the total capsule height, it’s half of the cylindrical part only
    const capsuleBottomY = bodyPos.y - (halfHeight + playerRadius);//TODO: halfheight and playerradius should be inputs of this function
    const capsuleUpY = bodyPos.y + (halfHeight + playerRadius);

    // const skinDistance      = 0.01;
    const aboveFeetDistance = 0.4;
    const rayLength = 0.2;                          // small margin
    const totalrayLength = aboveFeetDistance + rayLength;  // small margin

    // GROUND DETECTION
    const groundRayOrigin = {
        x: bodyPos.x,
        y: capsuleBottomY + aboveFeetDistance, // just above feet
        z: bodyPos.z
    };

    const groundRayDir = { x: 0, y: -1, z: 0 };
    const groundRay = new RAPIER.Ray(groundRayOrigin, groundRayDir);

    const groundHit = Shared.physWorld.castRay(
        groundRay,
        totalrayLength,
        true,              // solid
        undefined,         // filterFlags
        undefined,         // filterGroups
        thisCollider,    // exclude this collider
        undefined,         // exclude rigidbody (optional)
        undefined          // filterPredicate (optional)
    );

    let distanceToGround = 0;
    if (groundHit != null) {
        const name = Shared.colliderNameMap.get(groundHit.collider);
        distanceToGround = groundHit.toi - aboveFeetDistance;
        updateHighlight(groundHit.collider, 0);
        if (verbose)
            console.log("GROUND hit ", name, "at distance", distanceToGround);
    } else {
        if (verbose)
            console.log("NOGROUND from origin ", groundRayOrigin);
    }

    // CEILING DETECTION
    const ceilingRayOrigin = {
        x: bodyPos.x,
        y: capsuleUpY - aboveFeetDistance, // just below head
        z: bodyPos.z
    };

    const ceilingRayDir = { x: 0, y: 1, z: 0 };
    const ceilingRay = new RAPIER.Ray(ceilingRayOrigin, ceilingRayDir);

    const ceilingHit = Shared.physWorld.castRay(
        ceilingRay,
        totalrayLength,
        true,              // solid
        undefined,         // filterFlags
        undefined,         // filterGroups
        thisCollider,    // exclude this collider
        undefined,         // exclude rigidbody (optional)
        undefined          // filterPredicate (optional)
    );

    let distanceToCeiling = 0;
    if (ceilingHit != null) {
        const name = Shared.colliderNameMap.get(ceilingHit.collider);
        distanceToCeiling = ceilingHit.toi - aboveFeetDistance;
        updateHighlight(ceilingHit.collider, 1);
        if (verbose)
            console.log("CEILING hit ", name, "at distance", distanceToCeiling);
        // console.log("Collider", groundHit.collider, "hit at distance", groundHit.toi, "shape", groundHit.collider.shape);
        // if (Math.abs(distanceToGround) <= skinDistance) distanceToGround = 0;//discard small distances to avoid jitter
    } else {
        if (verbose)
            console.log("CEILING from origin ", ceilingRayOrigin);
    }


    /*---------------*/
    /*---------------*/
    /*---------------*/
    /*---------------*/
    // DRAW A DEBUG LINE
    /*---------------*/
    /*---------------*/
    /*---------------*/
    if (firstTimeArrow) {
        // console.log("FIRSTTIMEARROW");
        // ground arrow
        firstTimeArrow = false;
        {
            const origin = new THREE.Vector3(groundRayOrigin.x, groundRayOrigin.y, groundRayOrigin.z);
            const direction = new THREE.Vector3(groundRayDir.x, groundRayDir.y, groundRayDir.z).normalize();
            const length = totalrayLength;
            const color = groundHit ? 0x00ff00 : 0xff0000;
            groundDebugArrow = new THREE.ArrowHelper(direction, origin, length, color);
            Shared.colliderDebugGroup.add(groundDebugArrow);
            // Sphere for capsule bottom
            const sphereGeometry = new THREE.SphereGeometry(0.05, 8, 8); // radius 5 cm
            const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            debugCapsuleBottom = new THREE.Mesh(sphereGeometry, sphereMaterial);
            debugCapsuleBottom.position.set(groundRayOrigin.x, capsuleBottomY, groundRayOrigin.z);
            Shared.colliderDebugGroup.add(debugCapsuleBottom);
        }
        {
            const origin = new THREE.Vector3(ceilingRayOrigin.x, ceilingRayOrigin.y, ceilingRayOrigin.z);
            const direction = new THREE.Vector3(ceilingRayDir.x, ceilingRayDir.y, ceilingRayDir.z).normalize();
            const length = totalrayLength;
            const color = ceilingHit ? 0x00ff00 : 0xff0000;
            ceilingDebugArrow = new THREE.ArrowHelper(direction, origin, length, color);
            Shared.colliderDebugGroup.add(ceilingDebugArrow);
            // Sphere for capsule bottom
            const sphereGeometry = new THREE.SphereGeometry(0.05, 8, 8); // radius 5 cm
            const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            debugCapsuleUp = new THREE.Mesh(sphereGeometry, sphereMaterial);
            debugCapsuleUp.position.set(ceilingRayOrigin.x, capsuleUpY, ceilingRayOrigin.z);
            Shared.colliderDebugGroup.add(debugCapsuleUp);
        }
    } else {
        {        // move/update the arrow
            groundDebugArrow.position.set(groundRayOrigin.x, groundRayOrigin.y, groundRayOrigin.z);
            groundDebugArrow.setDirection(new THREE.Vector3(groundRayDir.x, groundRayDir.y, groundRayDir.z).normalize());
            groundDebugArrow.setLength(totalrayLength);
            groundDebugArrow.setColor(groundHit ? 0x00ff00 : 0xff0000);
            // Update capsule bottom sphere
            debugCapsuleBottom.position.set(groundRayOrigin.x, capsuleBottomY, groundRayOrigin.z);
        }
        {        // move/update the arrow
            ceilingDebugArrow.position.set(ceilingRayOrigin.x, ceilingRayOrigin.y, ceilingRayOrigin.z);
            ceilingDebugArrow.setDirection(new THREE.Vector3(ceilingRayDir.x, ceilingRayDir.y, ceilingRayDir.z).normalize());
            ceilingDebugArrow.setLength(totalrayLength);
            ceilingDebugArrow.setColor(ceilingHit ? 0x00ff00 : 0xff0000);
            // Update capsule bottom sphere
            debugCapsuleUp.position.set(ceilingRayOrigin.x, capsuleUpY, ceilingRayOrigin.z);
        }
    }
    /*---------------*/
    /*---------------*/
    /*---------------*/
    /*---------------*/

    return {
        groundHit: (groundHit != null && distanceToGround < Shared.contactThreshold),
        groundDistance: distanceToGround,
        ceilingHit: (ceilingHit != null && distanceToCeiling < Shared.contactThreshold),
        ceilingDistance: distanceToCeiling,
    };

}


function updateVerticalSpeedAndPos(movementState, deltaTime){

    const checkResult = groundCeilingCheck(movementState.body, movementState.collider);
    movementState.isTouchingGround  = checkResult.groundHit;
    movementState.isTouchingCeiling = checkResult.ceilingHit;

    // check ground and ceiling update vertical speed and snap to floor if close  
    const isTouchingGround  = checkResult.groundHit;
    const isTouchingCeiling = checkResult.ceilingHit;

    movementState.verticalSpeed = Math.max(-Shared.maxFallSpeed, movementState.verticalSpeed-(Shared.gravity * deltaTime));
    if (isTouchingGround || isTouchingCeiling) {
        movementState.verticalSpeed = 0; //cancel speed and snap to floor/ceiling within a skin distance margin
        movementState.newPos.y -= (isTouchingGround ? (checkResult.groundDistance - Shared.skin) : (checkResult.ceilingDistance + Shared.skin));
    }

    //jump
    if (isTouchingGround && !isTouchingCeiling && movementState.jumpPressed) {
        movementState.verticalSpeed = jumpSpeed;
    }
    
    movementState.newPos.y += movementState.verticalSpeed * deltaTime;
}

function updateHorizontalSpeedAndPos(movementState, deltaTime){

    movementState.moveSpeed = Shared.moveSpeed;
    if (!movementState.isTouchingGround && 
        !movementState.isTouchingCeiling)
        movementState.moveSpeed *= 0.5; //slower lateral moves when in Air

    //apply moveVector in XZ plane
    movementState.moveSpeed *= deltaTime;
    movementState.newPos.x += movementState.moveVector.x * movementState.moveSpeed;
    movementState.newPos.z += movementState.moveVector.z * movementState.moveSpeed;

    if (verbose) console.log(
        "newPos", movementState.newPos, 
        "currentPos", movementState.currentPos, 
        "moveVector", movementState.moveVector);

    //3 consecutive collision checks to avoid sliding through collider after the first collision check
    collisionCheck(movementState, 2);
    collisionCheck(movementState, 3);
    collisionCheck(movementState, 4);

    //update current position
    movementState.curPos = movementState.newPos
}




/*---------------------------------*/
// interact related functions 
/*---------------------------------*/
/*---------------------------------*/
// interact
/*---------------------------------*/
function interact() {
    console.log("interact");
}


let raycastChunkArray = [];
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)

let selectObject = null;

function raycastActionnables() {
    // console.log("raycastActionnables");
    selectObject = null;
    // raycastChunkArray = Object.values(Shared.chunksInScene);//to optimize only load nearby chunks
    // const actionnableChunkArray = Object.values(Shared.actionnablesInScene).flat();
    // const raycastTargets = raycastChunkArray.concat(actionnableChunkArray);
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
            console.log("RAYCASTHIT", selectObject.name);
            if (selectObject.userData.actionnableParent != null)
                selectObject = selectObject.userData.actionnableParent
            // while (parentActionnable && !actionnableChunkArray.includes(parentActionnable)) {
            //     parentActionnable = parentActionnable.parent;
            // }
            // selectObject = parentActionnable || selectObject;
        }
        // console.log("HIT");
        // console.log(closestHit.object?.userData);
        // closestHit.object?.userData?.action();
    }

}

function onMouseClick(event) {
    // console.log("game click");
    if (selectObject) {
        selectObject?.userData?.actionnableData?.action(selectObject, playerState);
    }
    attack();
    // playClipOnce(Shared.ANIM_ATTACK_NAME);
}

function onMouseUp(event) {
    // console.log("game mouseup");
}

// const camTweakY = 0.2;
// const camTweakXZ = 0.25;
const camTweakY = 0.2;
const camTweakXZ = 0.10;
function syncCameraToPlayer() {
    const t = playerBody.translation();
    // Shared.yawObject.position.set(t.x, t.y + cameraHeightFromCapsuleCenter, t.z);//
    // Shared.yawObject.position.set(t.x, t.y + cameraHeightFromCapsuleCenter + 0.2, t.z);//
    Shared.yawObject.position.set(t.x, t.y + cameraHeightFromCapsuleCenter + camTweakY, t.z);//
}

function syncPlayerMesh() {
    const p = Shared.playerMesh.root
    const q = playerBody.rotation();
    p.quaternion.set(q.x, q.y, q.z, q.w);

    // optional 180° turn if needed
    p.rotation.y += Math.PI;

    const t = playerBody.translation();
    const capsuleBottomY = t.y - (halfHeight + playerRadius);

    // compute forward vector in world space
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(p.quaternion);

    const offset = camTweakXZ; // distance behind playerBody

    p.position.set(
        t.x - forward.x * offset,
        capsuleBottomY,
        t.z - forward.z * offset
    );
}

function syncEnemyToBodies() {
    Shared.enemyGroup.children.forEach(enemy => {
        const enemyBody = enemy.userData.movementState.body;
        const t = enemyBody.translation();
        const q = enemyBody.rotation();
        enemy.position.set(t.x, t.y, t.z);
        enemy.quaternion.set(q.x, q.y, q.z, q.w)
    })
}

function collisionCheck(movementState, idx = 2) {

    const currentPos = movementState.curPos.clone();
    const movement = movementState.newPos.clone().sub(currentPos);
    const movementLength = movement.length();
    const direction = movement.clone().normalize();

const excludedColliders = new Set([
  movementState.collider,
//   someOtherCollider,
//   yetAnotherCollider,
]);
    const excludeBodies = [];
    excludeBodies.push(movementState.body);

    const hit = Shared.physWorld.castShape(
        currentPos,               // shapePos
        movementState.rotation,   // shapeRot
        movement,                 // shapeVel
        playerColliderDesc.shape, // shape
        1.0,                      // maxToi (distance multiplier)
        true,                     // stopAtPenetration
        null,                     // filterFlags
        // null,                     // filterGroups
        movementState.collisionmask,                     // filterGroups

        null,                     // exclude this collider
        // movementState.collider,   // exclude this collider

        // null,                      // exclude this rigidbody
        movementState.body,     // exclude this rigidbody

        // (collider) => {
        //     // return false;
        // // Return true to *consider* collider, false to *ignore*
        // if (excludedColliders.has(collider)) return false;
        // return true;
        // }                         //filterPredicate
    );

    if (hit && hit.toi < 1.0) { //toi<=0: penetration, 0<toi<1: collision within movement, 1<toi: collision beyond movement
        let collidername = Shared.colliderNameMap.get(hit.collider);
        updateHighlight(hit.collider, idx); //colour colliding collider
        // if (verbose) 
            console.log("check" + idx + " hit", collidername, "at fractional distance", hit.toi);


        // const collider = hit.collider;
        // const groups = collider.collisionGroups();
        // const layer = groups >>> 16;
        // const mask = groups & 0xFFFF;

        // console.log(
        //     "Hit collider:", Shared.colliderNameMap.get(collider),
        //     "\n  Layer bits:", layer.toString(2).padStart(16, "0"),
        //     "\n  Mask bits:", mask.toString(2).padStart(16, "0"),
        //     "\n  Layer:", Object.keys(Shared.COL_LAYERS).find(k => Shared.COL_LAYERS[k] === layer)
        // );

        // const p_collider = movementState.collider;
        // const p_groups = p_collider.collisionGroups();
        // const p_layer = p_groups >>> 16;
        // const p_mask = p_groups & 0xFFFF;

        // console.log(
        //     "Hit collider:", Shared.colliderNameMap.get(p_collider),
        //     "\n  Layer bits:", p_layer.toString(2).padStart(16, "0"),
        //     "\n  Mask bits:", p_mask.toString(2).padStart(16, "0"),
        //     "\n  Layer:", Object.keys(Shared.COL_LAYERS).find(k => Shared.COL_LAYERS[k] === p_layer)
        // );



        //calculate movement to contact and remaining of the movement after contact
        const distToContact = movementLength * hit.toi;
        const distRemaining = movementLength - distToContact;
        const movementToContact = direction.clone().multiplyScalar(distToContact)
        const movementRemaining = direction.clone().multiplyScalar(distRemaining)
        // Project movementRemaining onto plane (remove movement component along hit normal)
        const normal = new THREE.Vector3(hit.normal1.x,hit.normal1.y,hit.normal1.z);//convert hit normal to threejs vector3
        const dotRem = movementRemaining.dot(normal);
        let slideVec = movementRemaining.clone().sub(normal.clone().multiplyScalar(dotRem));
        //move to contact point then nudge slighly away along normal by skin distance
        const newPos = currentPos.clone().add(movementToContact) 
        newPos.add(normal.multiplyScalar(Shared.skin))
        newPos.add(slideVec) //then slide along the remaining distance projected onto collider

        movementState.newPos = newPos.clone();
    }
}

function toggleHideCollider() {
    // Shared.rapierDebug.toggle();
    Shared.colliderDebugGroup.visible = !Shared.colliderDebugGroup.visible;
}

function updatePhysics() {
    for (const update of Shared.pendingBodyUpdates) {
        update.body.setNextKinematicTranslation(update.pos);
        update.body.setNextKinematicRotation(update.quat);
    }
    Shared.pendingBodyUpdates.length = 0; // clear for next frame
}


/*-----------------------------------*/
// HIGHLIGHT COLLIDERS               //
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
            // wireframe: true,      // show edges
            // depthTest: false,
            // depthWrite: false
        });

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        mesh.name = "highlightCollidingMeshes_" + i;
        mesh.renderOrder = 999;   // always in front
        mesh.visible = false;
        highlightCollidingMeshes.push(mesh);
        Shared.colliderDebugGroup.add(mesh);
    }
}

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

function hideAllHighlights() {
    highlightCollidingMeshes.forEach(m => m.visible = false);
}





/*----------------*/
/* SKIN ANIMATION */
/*----------------*/

let currentAction = null;
let currentSingleAction = null;
let currentMixer = null;

function animateLoop(){
    if ((currentSingleAction || currentAction)
        && currentMixer){
        // console.log("UPDATING",currentAction);
        currentMixer.update(deltaTime);
    }
    requestAnimationFrame(animateLoop);
}

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

function playClipOnce(clipName, endAction=null) {
  const clipInfo = Shared.clipActions.get(clipName);
  const nextAction = clipInfo?.clipAction;
  currentMixer = clipInfo.mixer;
  nextAction.reset();
  nextAction.setLoop(THREE.LoopOnce, 1);
  nextAction.clampWhenFinished = true;

//   console.log(nextAction.getClip().duration);
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

function stopClip() {
    // return;
    if (!currentAction) return;
    currentAction.fadeOut(0.3); // fades over 0.3s
    // currentAction.stop();  // stops playback immediately
    currentAction = null;
}

function makePartialClip(clip, boneNames) {
  const filteredTracks = clip.tracks.filter(track => {
    return boneNames.some(name => track.name.startsWith(name));
  });
  return new THREE.AnimationClip(clip.name + '_partial', clip.duration, filteredTracks);
}


let isAttacking = false;
function attack() {
    
    if (!isAttacking){
    isAttacking = true;

    playClipOnce(Shared.ANIM_ATTACK_NAME, endAttack);
}
}

function endAttack()
{
    console.log("ENDATTACK");
    isAttacking = false;
}


// Reuse temporary vectors/quaternions to avoid GC churn
const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();

function syncRigidBodyToBones() {
  // ✅ Map iteration is done with forEach, not .array
  Shared.RigidBodyBoneBindingMap.forEach((bone, rb) => {
    bone.getWorldPosition(_worldPos);
    bone.getWorldQuaternion(_worldQuat);

    // ✅ Rapier expects raw values (Vec3 + Quaternion)
    rb.setNextKinematicTranslation({
      x: _worldPos.x,
      y: _worldPos.y,
      z: _worldPos.z,
    });

    rb.setNextKinematicRotation({
      x: _worldQuat.x,
      y: _worldQuat.y,
      z: _worldQuat.z,
      w: _worldQuat.w,
    });

    // rb.setNextKinematicTranslation({
    //   x: _worldPos.x,
    //   y: _worldPos.z,   // Blender Z → Three.js Y
    //   z: -_worldPos.y,  // Blender -Y → Three.js -Z
    // });


    // ✅ Rapier expects raw values (Vec3 + Quaternion)
    // rb.setNextKinematicTranslation({
    //   x: _worldPos.x,
    //   y: _worldPos.y,
    //   z: _worldPos.z,
    // });

    // const blenderToThree = new THREE.Quaternion();
    // // blenderToThree.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); 
    // blenderToThree.setFromEuler(new THREE.Euler(
    //     // 0,
    //     // Math.PI/2,
    //     0,
    //     // -Math.PI / 2,
    //     0,
    //     Math.PI / 2,
    // )); 
    // // rotates from Blender Z-up to Three.js Y-up

    // const correctedQuat = _worldQuat.clone().premultiply(blenderToThree);

    // rb.setNextKinematicRotation({
    //   x: correctedQuat.x,
    //   y: correctedQuat.y,
    //   z: correctedQuat.z,
    //   w: correctedQuat.w,
    // });

  });
}


let swordMesh = null;
let swordBody = null;
const swordPos=new THREE.Vector3();
const swordQuat=new THREE.Quaternion();
// const swordBody;
function syncWeaponBody(){

    if (!swordMesh)  swordMesh = Shared.scene.getObjectByName(Shared.SWORD_NAME);
    if (!swordBody) swordBody = Shared.BodyNameMap.get("Collider_Kine_"+Shared.SWORD_NAME)

    swordMesh.getWorldPosition(swordPos);
    swordMesh.getWorldQuaternion(swordQuat);

    swordBody.setNextKinematicTranslation(swordPos);
    swordBody.setNextKinematicRotation(swordQuat);

}