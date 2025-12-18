import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

// holds entity animation related properties

export default class AnimatorComponent {
    constructor(skeleton = null, mixer = null) {
        this.type = ENTITY_COMPONENT_TAGS.ANIMATOR;

        //constants
        this.skeleton = skeleton;
        this.mixer = mixer;
        this.animationClips = new Map();   // name -> clip
        this.animationActions = new Map(); // name -> mixer action
        this.weaponBone = null;
        this.headBone = null;

        //loop variables
        this.desiredAnimation = new Map();//communicates the desired animation from other manager 
        this.headTarget = null;//optionnally rotate head bone to look at something
    
    }
}
