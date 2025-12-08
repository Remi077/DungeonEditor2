import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class AnimatorComponent {
    constructor(skeleton = null, mixer = null) {
        this.type = ENTITY_COMPONENT_TAGS.ANIMATOR;
        this.skeleton = skeleton;
        this.mixer = mixer;
        this.animationClips = new Map();   // name -> clip
        this.animationActions = new Map(); // name -> mixer action
        this.currentAction = null;
        this.weaponBone = null;
        this.headBone = null;
    }
}
