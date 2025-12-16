// @ts-nocheck
import * as THREE from 'three';
import * as RAPIER from 'rapier';
import * as SkeletonUtils from 'SkeletonUtils';

/*------------------*/
// CANVAS VARIABLES //
/*------------------*/
export const canvas = document.getElementById('three-canvas');
export const container = document.getElementById('canvas-container');

/*---------------------------------*/
// NAVMESH VARIABLES
/*---------------------------------*/
export let navmesh = null;
export function setNavMesh(n){ navmesh = n; }
export let pathfinder = null;
export function setPathFinder(p){pathfinder = p;}
export const calculatePathPeriod = 1.5;

/*---------------------------------*/
// PHYSICS VARIABLES
/*---------------------------------*/
export const moveSpeed = 5;

/*-----------------------------*/
// jump variables
//
// max height
// kinetic e = potential e
// (1/2)mv^2=mgh
// v=sqrt(2gh)
/*-----------------------------*/
export const gravity = 9.81;
export const maxJumpHeight = 1;
export const jumpSpeed = Math.sqrt(2 * gravity * maxJumpHeight);
export const maxFallSpeed = 50; // meters per second, adjust as needed
export const maxSlopeDeg = 55;// max slope in degrees you want to treat as "floor"
export const maxSlopeRad = THREE.MathUtils.degToRad(maxSlopeDeg);
export const verticalThreshold = Math.cos(maxSlopeRad);// vertical threshold = cosine of slope
export const contactThreshold = 0.05; //when capsule is closer than this distance to ground or ceiling we consider it a collision 
export const skin = 0.02; //after a collision we snap the capsule bottom/up to the ground/ceiling and we nudge outward by skin distance to avoid penetration

// Player physical and camera setup
export const playerHeight = 1.8; // total player height in meters
export const cameraHeight = 1.5; // desired camera (eye) height above the floor
export const playerRadius = 0.4; // radius of the capsule collider
// Distance from capsule center (which is halfway up the capsule) to the camera position.
// Needed because Rapier places the capsule's origin at its center, not at the feet.
export const cameraHeightFromCapsuleCenter = cameraHeight - playerHeight / 2;
// Half-height of the *cylindrical part* of the capsule.
// The capsule’s total height = 2 * halfHeight + 2 * radius = playerHeight
// halfHeight is a bit misleading because it’s not half of the total capsule height, it’s half of the cylindrical part only
export const halfHeight = (playerHeight / 2) - playerRadius;
// camera initial offset position
export const cameraOffsetX = 2;
export const cameraOffsetZ = 2;
// export const cameraOffsetY = 1.3 + 0.1; //see camera height in game.js
export const cameraOffsetY = cameraHeight+0.1; //see camera height in game.js

/*----------------------*/
// ANIMATIONS VARIABLES //
/*----------------------*/
export const upperBodyBones = [
    'mixamorigSpine',
    'mixamorigSpine1',
    'mixamorigSpine2',
    'mixamorigNeck',
    'mixamorigHead',
    // 'mixamorigRightArm', 
    'mixamorigLeftArm'];
export const lowerBodyBones = [//define bone whitelist for an animation
    'mixamorigHips',
    'mixamorigRightUpLeg',
    'mixamorigRightLeg',
    'mixamorigRightFoot',
    'mixamorigLeftUpLeg',
    'mixamorigLeftLeg',
    'mixamorigLeftFoot',
    'mixamorigRightArm',  //for walk cycle, weapon is in left hand so leave right arm go with walk
];
export const ANIM_ATTACK_NAME = "Attack";
export const ANIM_WALK_NAME = "Walk";
export const ANIM_WALK_NAME_L = "Walk_Lower";
export const WEAPON_BONE_NAME = "mixamorigLeftHand";
export const SWORD_NAME = "weapon_sword";
export function makePartialClip(clip, boneNames) {
    const filteredTracks = clip.tracks.filter(track => {
        return boneNames.some(name => track.name.startsWith(name));
    });
    return new THREE.AnimationClip(clip.name + '_partial', clip.duration, filteredTracks);
}

// COLLISION GROUPS
export const COL_LAYERS = {
    PLAYER: 1 << 0,  // 000001
    PLAYERWPN: 1 << 1,  // 000010
    ENEMY: 1 << 2,  // 000100
    ENEMYWPN: 1 << 3,  // 001000
    SCENERY: 1 << 4,  // 010000
    WATER: 1 << 5,  // 100000
};

// --- Helper to make masks ---
export const makeMask = (layer, collidesWith) =>
    (layer << 16) | collidesWith;

// --- Define who collides with who ---
export const COL_MASKS = {
    PLAYER: makeMask(
        COL_LAYERS.PLAYER,
        COL_LAYERS.ENEMY | COL_LAYERS.SCENERY //| COL_LAYERS.ENEMYWPN
    ),

    PLAYERWPN: makeMask(
        COL_LAYERS.PLAYERWPN,
        COL_LAYERS.ENEMY | COL_LAYERS.SCENERY
    ),

    ENEMY: makeMask(
        COL_LAYERS.ENEMY,
        COL_LAYERS.PLAYER | COL_LAYERS.SCENERY | COL_LAYERS.ENEMY //| COL_LAYERS.PLAYERWPN | 
    ),

    ENEMYWPN: makeMask(
        COL_LAYERS.ENEMYWPN,
        COL_LAYERS.PLAYER | COL_LAYERS.SCENERY
    ),

    SCENERY: makeMask(
        COL_LAYERS.SCENERY,
        COL_LAYERS.PLAYER | COL_LAYERS.ENEMY | COL_LAYERS.PLAYERWPN | COL_LAYERS.ENEMYWPN
    ),

    WATER: makeMask(
        COL_LAYERS.WATER,
        COL_LAYERS.WATER
    ),    
};


export const debugSphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
export const debugSphereMaterialRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });
export const debugSphereMaterialBlue = new THREE.MeshBasicMaterial({ color: 0x0000ff });

export function drawDebugSpheres(points, debugSpheres, scene,
    debugMat = debugSphereMaterialRed
) {

    // Remove old debug spheres
    if (debugSpheres && debugSpheres.length > 0) {
        debugSpheres.forEach(sphere => scene.remove(sphere));
        debugSpheres.length = 0; // clear array
    }

    if (!points || points.length === 0) return;

    // Create new spheres at each path point
    points.forEach(point => {
        const sphere = new THREE.Mesh(debugSphereGeometry, debugMat);
        sphere.position.copy(point);
        scene.add(sphere);
        debugSpheres.push(sphere);
    });

}


// Debug line setup
export const debugLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
export const debugLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3()
]);
export const debugLine = new THREE.Line(debugLineGeometry, debugLineMaterial);

// Add it to the scene but keep it invisible
debugLine.visible = false;
// scene.add(debugLine);
