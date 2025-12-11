import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

export default class VisualComponent {
    constructor(root = null) {
        this.type = ENTITY_COMPONENT_TAGS.VISUAL;
        this.root = root; // THREE.Object3D (armature / visual root)
        let found = null;
        root.traverse((child) => {
            if (child.isSkinnedMesh && !found) {
                found = child;
            }
        });
        this.skinnedMesh = found;
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
