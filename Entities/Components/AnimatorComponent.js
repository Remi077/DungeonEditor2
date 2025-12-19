import { ECT } from '../Entity.js';

// holds entity animation related properties

export default class AnimatorComponent {
    constructor(skeleton = null, mixer = null) {
        this.type = ECT.ANIMATOR;

        //constants
        this.skeleton = skeleton;
        this.mixer = mixer;
        this.animationClips = new Map();   // name -> clip
        this.animationActions = new Map(); // name -> mixer action
        this.headBone = null;

        //loop variables
        this.desiredAnimation = new Map();//communicates the desired animation from other manager 
        this.headTarget = null;//optionnally rotate head bone to look at something
    
    }
}
