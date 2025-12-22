import * as THREE from 'three';

// Debug sphere setup
export const debugSphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
export const debugSphereMaterialRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });
export const debugSphereMaterialBlue = new THREE.MeshBasicMaterial({ color: 0x0000ff });

export const SHOWDEBUGSPHERES = false;

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

export const SHOWDEBUGLINE = false;

// Debug line setup
const debugLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const debugLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3()
]);

export function getNewDebugLine() {
    return new THREE.Line(debugLineGeometry, debugLineMaterial);
}