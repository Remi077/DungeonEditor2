// @ts-nocheck
import * as THREE from 'three';

// Debug sphere setup
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
