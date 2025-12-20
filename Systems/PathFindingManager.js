import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import { Pathfinding } from "three-pathfinding";
import * as Debug from '../Debug.js';

export default class PathFindingManager {

    constructor(game) {
        this.game = game;
        this.navmesh = null;
        this.pathfinder = null;
        this.currentPos = new THREE.Vector3();
        this.newEuler = new THREE.Euler();
        this.zone = "level";
    }

    async loadNavMesh(path) {
        const arrayBuffer = await(await fetch(path)).arrayBuffer();
        const gltf = await this.loadLevelGlb(arrayBuffer);
        this.gltf = gltf;

        const pathfinder = new Pathfinding();
        gltf.scene.children.forEach((navmesh) => {
            this.navmesh = navmesh;
            this.game.scene.add(navmesh);
            this.navmesh.visible = false;

            this.pathfinder = new Pathfinding();
            const zoneData = Pathfinding.createZone(this.navmesh.geometry);
            this.pathfinder.setZoneData(this.zone, zoneData);
        })
    }

    async loadLevelGlb(arrayBuffer) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.parse(arrayBuffer, '', (gltf) => {
                // gltf.scene is your loaded model
                console.log('GLB loaded:', gltf.scene);
                resolve(gltf);
            }, (error) => {
                reject(error);
            });
        });
    }

    moveEntityToWithin(e, targetPos, withinDistance, dt) {

        const pf = e.pathfinding;
        const tr = e.transform;
        const mv = e.movement;
        const col = e.capsuleCol;

        if (!pf || !tr || !col) return;

        const moveVector = mv.moveVector;
        const newRotation = tr.rotation;
        const pathbuffer = pf.pathbuffer;
        const currentPos = tr.positionRoot
        const offsetRootToBody = col.offsetRootToBody;

        const withinReach = currentPos.distanceTo(targetPos) < withinDistance;
        moveVector.set(0,0,0);

        if (0) {
            
            this.steerEntity(e, targetPos, true);

        } else if (withinReach || 0) {

            this.steerEntity(e, targetPos);

        } else if (!withinReach) {

            // Compute path
            if (pf.timeSinceLastCalculatedPath < pf.recalcPeriod) {
                pf.timeSinceLastCalculatedPath += dt;
            } else if (pf.lastKnownPlayerPosition !== null &&
                pf.lastKnownPlayerPosition.equals(targetPos)){
                //timer expired but player didnt move => dont recompute, just restart timer
                pf.timeSinceLastCalculatedPath = 0;
            } else {
                //timer expired and player moved => recompute path
                pf.timeSinceLastCalculatedPath = 0;

                // use the navmesh
                const groupID = this.pathfinder.getGroup(this.zone, currentPos);
                const start = this.projectToNavmesh(currentPos);
                const end = this.projectToNavmesh(targetPos);

                if (!start || !end) {
                    console.warn("Could not project position(s) onto navmesh.");
                }

                const path = this.pathfinder.findPath(
                    start,
                    end,
                    this.zone,
                    groupID
                );
                pathbuffer.length = 0
                if (path) pathbuffer.push(...path);

                // console.log(e.name, "CALCULATE PATH", performance.now());
                pf.lastKnownPlayerPosition.copy(targetPos);
                if (1) {
                    const debugSpheres = pf.debugSpheres;
                    Debug.drawDebugSpheres(path, debugSpheres, this.game.scene); //TEMP TOFIX
                }
            }

            if (pathbuffer.length > 0) {
                const target = pathbuffer[0];

                //calculate desired movement
                const dir = target.clone().sub(currentPos).setY(0);
                const dist = dir.length();

                const currentFootPos = currentPos.clone().sub(offsetRootToBody);

                if (currentFootPos.distanceTo(target) < 0.05) {
                    pathbuffer.shift();
                } else {
                    dir.normalize();
                    const desiredStep = dir.clone().multiplyScalar(mv.moveSpeed);
                    moveVector.copy(desiredStep);

                    const yaw2 = Math.atan2(desiredStep.x, desiredStep.z);
                    this.newEuler.set(0, yaw2, 0, "YXZ");
                    newRotation.setFromEuler(this.newEuler);
                }
            } else {
                // console.log("NO MORE PATH");
                this.steerEntity(e, targetPos, true);
            }

        }

        // moveVector.multiplyScalar(dt);
        return withinReach;

    }

    steerEntity(e, targetPos, updatePos = false) {
        const pf = e.pathfinding;
        const tr = e.transform;
        const mv = e.movement;
        const col = e.capsuleCol;

        if (!pf || !tr || !col) return;

        const moveVector  = mv.moveVector;
        const newRotation = tr.rotation;
        const pathbuffer  = pf.pathbuffer;
        const currentPos  = tr.positionRoot;

        const toTarget = targetPos.clone().sub(currentPos);
        toTarget.y = 0; // <-- remove pitch
        toTarget.normalize();
        toTarget.multiplyScalar(mv.moveSpeed);
        if (updatePos) moveVector.copy(toTarget);

        const yaw = Math.atan2(toTarget.x, toTarget.z); // Compute yaw angle from direction (THREE uses Z-forward)
        this.newEuler.set(0, yaw, 0, "YXZ");
        newRotation.setFromEuler(this.newEuler); // Build quaternion with yaw only
    }

    projectToNavmesh(pos) {
        // Find the group the position belongs to
        const groupID = this.pathfinder.getGroup(this.zone, pos);
        if (groupID === null || groupID === undefined) return null;

        // Try to get a node only if the point is actually inside the polygon
        let node = this.pathfinder.getClosestNode(pos, this.zone, groupID, true);
        if (node) {
            // Player is on navmesh: return actual position
            return pos.clone();
        }

        // Fallback: get the nearest node (ignoring polygon check)
        node = this.pathfinder.getClosestNode(pos, this.zone, groupID, false);
        return node ? node.centroid.clone() : null;
    }

}