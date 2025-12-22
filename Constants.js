// Collision constants
export const GRAVITY = 9.81;
export const MAXFALLSPEED = 50; // meters per second, adjust as needed

// mixamo bone constant
export const UPPERBODYBONES = [
    'mixamorigSpine',
    'mixamorigSpine1',
    'mixamorigSpine2',
    'mixamorigNeck',
    'mixamorigHead',
    // 'mixamorigRightArm', 
    'mixamorigLeftArm'];
export const LOWERBODYBONES = [//define bone whitelist for an animation
    'mixamorigHips',
    'mixamorigRightUpLeg',
    'mixamorigRightLeg',
    'mixamorigRightFoot',
    'mixamorigLeftUpLeg',
    'mixamorigLeftLeg',
    'mixamorigLeftFoot',
    'mixamorigRightArm',  //for walk cycle, weapon is in left hand so leave right arm go with walk
];
export const HEAD_BONE_NAME = "mixamorigHead";

// animation name constants
export const ANIM = {
    IDLE   : "Idle",
    ATTACK : "Attack",
    WALK   : "Walk",
    WALK_L : "Walk_Lower",
    HURT   : "Hurt",
    DIE    : "Die",
}

// collision groups constants
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

// user data fields constant
export const USER_DATA_FIELDS = {
    COLLIDER_ENTITY : "colEntity",
    INTERACT_ENTITY : "interactEntity"
}

// character types
export const CHARACTER_TYPES = {
    PLAYER : 'player',
    ZOMBIE : 'zombie',
}

export const GLB_PREFIX = {

    ARMATURE : 'Armature',

    ACTION : 'Action_',
    ACTION_DOOR : 'Action_Door',
    ACTION_SWITCH : 'Action_Switch',
    ACTION_CHEST : 'Action_Chest',
    ACTION_ITEM : 'Action_Item',

    ENEMY : 'Enemy',

    COLLIDER : 'Collider_',
    COLLIDER_KINE : 'Collider_Kine',

    TRIGGER : 'Trigger',

    WEAPON : 'weapon',

}