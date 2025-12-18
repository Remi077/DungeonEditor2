import { ENTITY_COMPONENT_TAGS } from '../Entity.js';

//holds all visual related stuff: rigged mesh, materials, mesh offsets

export default class VisualComponent {
    constructor(root = null) {
        this.type = ENTITY_COMPONENT_TAGS.VISUAL;

        //rigged mesh
        this.root = root; // THREE.Object3D (armature / visual root)
        let found = null;
        root.traverse((child) => {
            if (child.isSkinnedMesh && !found) {
                found = child;
            }
        });
        this.skinnedMesh = found;

        //materials
        this.normalMaterial = null;
        this.hurtMaterial = null;
        
        //relative position/rotation of mesh wrt body (used in sync mesh)
        this.offsetPosition = new THREE.Vector();
        this.offsetRotation = new THREE.Quaternion(); // identity
        this.slerpRotation = 1; //0: no rotation, 1: full match (default)
    }
}
