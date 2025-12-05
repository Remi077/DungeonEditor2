export default class VisualComponent {
    constructor(root = null) {
        this.type = 'Visual';
        this.root = root; // THREE.Object3D (armature / visual root)
    }

    setFrustumCulled(culled) {
        if (this.root) {
            this.root.traverse(obj => {
                if (obj.isMesh) {
                    obj.frustumCulled = culled;
                }
            });
        }
    }
}
