export default class AnimatorComponent {
    constructor(skeleton = null, mixer = null) {
        this.skeleton = skeleton;
        this.mixer = mixer;
        this.animationClips = new Map();   // name -> clip
        this.animationActions = new Map(); // name -> mixer action
        this.currentAction = null;
        this.weaponBone = null;
        this.headBone = null;
    }
}
