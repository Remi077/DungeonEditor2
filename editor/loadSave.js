// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import * as SkeletonUtils from 'SkeletonUtils';

import * as RAPIER from 'rapier';

import * as Shared from '../shared.js';


/*------*/
// LOAD //
/*------*/

/*---------------------------------*/
// loadLevel
/*---------------------------------*/
// export async function loadLevel() {
//     const file = await new Promise((resolve) => {
//         const input = document.createElement("input");
//         input.type = "file";
//         input.accept = ".json";

//         input.onchange = (event) => {
//             const file = event.target.files[0];
//             resolve(file);  // pass file back to the promise
//         };

//         input.click(); // opens the file dialog
//     });

//     if (!file) return;

//     const json = await new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//             try {
//                 const json = JSON.parse(e.target.result);
//                 resolve(json);
//             } catch (err) {
//                 reject(err);
//             }
//         };
//         reader.onerror = reject;
//         reader.readAsText(file);
//     });

//     //we want to update progression bar at the same time as loading
//     //so this function and the parent function needs to be asynchronous
//     //so stuff can happen in parallel instead of blocking the main thread
//     // await loadPlanesIntoScene(json);
// }

export async function loadTest(scene) {
    loadLevel(scene);
    await(loadCharacter(Shared.playerState, scene, './assets/glb/player.glb'));
    await(loadCharacter(Shared.EnemyTemplateState, scene, './assets/glb/zombie.glb'));

    //add player to the level
    Shared.rigGroup.add(Shared.playerState.root);
    // Shared.rigGroup.add(Shared.EnemyTemplateState.root);
}

async function loadLevel(scene) {
    try {
        const response = await fetch('./assets/glb/Level1.glb');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const gltf = await loadLevelGlb(arrayBuffer);

        const staticArray = [];
        const weaponArray = [];
        const actionnablesArray = [];
        const lightsArray = [];
        const enemySpawnArray = [];
        const rigArray = [];

        gltf.scene.children.forEach((child) => {

            if (child.isLight) {
                lightsArray.push(child);
            }

            if (child.name.startsWith("Collider_")) {
                //Collider -> do nothing
            } else if (child.name.startsWith("Action_")) {
                //Actionnable
                let exitLoop = false;
                for (const name of Shared.actionnableNames) {
                    if (child.name.startsWith("Action_" + name)) {
                        actionnablesArray.push(child);
                        child.traverse((childofchild) => {
                            childofchild.userData.type = "actionnable";
                            if (child != childofchild)
                                childofchild.userData.actionnableParent = child;
                        }
                        );
                        exitLoop = true;
                        child.userData["actionnableData"] = Shared.actionnableUserData[name];
                        break; // exit the name loop
                    }
                }
                if (exitLoop) return; // exit current traverse iteration

            } else if (child.name.startsWith("Enemy")) {
                enemySpawnArray.push(child);
                // child.userData.type = "enemy";
            //     child.userData["actionnableData"] = Shared.actionnableUserData["enemy"];
            } else if (child.name.startsWith("Armature")) {

                let isPlayer=child.name.startsWith("Armature_Player"); 
                const characterState = isPlayer ? Shared.playerState : Shared.EnemyTemplateState;

                characterState.root = child;//TEMP

                child.traverse(obj => {
                    if (obj.isSkinnedMesh) {
                        characterState.skeleton = obj.skeleton;//TEMP
                        // characterState.weaponBone = obj.skeleton.getBoneByName(Shared.WEAPON_BONE_NAME);;//TEMP
                        characterState.weaponBone = getBoneByPrefix(obj.skeleton,Shared.WEAPON_BONE_NAME);;//TEMP
                        if (!characterState.weaponBone && isPlayer) throw new Error("weapon bone not defined");
                        if (obj.name.startsWith("weapon")) {
                            //do this only for sword, body can be frustrum culled
                            obj.frustumCulled = false; //this prevents sword in first person view to be culled when camera tilts and get too close
                            weaponArray.push(obj);
                        }
                    }
                });
                if (!characterState.weaponBone && isPlayer) throw new Error("weapon bone not defined");

                //create mixer on the armature root
                const mixer = new THREE.AnimationMixer(child)
                characterState.mixer = mixer;
                rigArray.push(child);

                // extract animations
                gltf.animations.forEach(clip => {
                    if (clip.name.startsWith(child.name)) {
                        const match = clip.name.match(new RegExp(`${child.name}_(.*)$`));
                        const newClipName = match ? match[1] : null;
                        characterState.animationClips.set(newClipName,clip);
                        characterState.animationActions.set(newClipName,clip);
                        if (newClipName === Shared.ANIM_WALK_NAME) {
                            const walkLowerClip = Shared.makePartialClip(clip, Shared.lowerBodyBones);
                            characterState.animationClips.set(Shared.ANIM_WALK_NAME_L,walkLowerClip);
                            characterState.animationActions.set(Shared.ANIM_WALK_NAME_L,mixer.clipAction(walkLowerClip));
                        }
                    }
                });

            } else {
                staticArray.push(child);
            }

        });

        // Now safely add to your scene
        actionnablesArray.forEach(mesh => Shared.actionnablesGroup.add(mesh));
        staticArray.forEach(mesh => Shared.staticGroup.add(mesh));
        lightsArray.forEach(light => Shared.lightGroup.add(light));
        enemySpawnArray.forEach(ene => Shared.enemySpawnGroup.add(ene));
        rigArray.forEach(rig => Shared.rigGroup.add(rig));
        scene.add(Shared.staticGroup);
        scene.add(Shared.actionnablesGroup);
        scene.add(Shared.lightGroup);
        scene.add(Shared.enemySpawnGroup);
        scene.add(Shared.enemyGroup);
        Shared.enemySpawnGroup.visible = false;
        scene.add(Shared.rigGroup);


        //enable shadows
        if (Shared.shadowEnabled) {
            scene.traverse((obj) => {
                if (obj.isLight) {
                    if (obj.isDirectionalLight || obj.isSpotLight || obj.isPointLight) {
                        obj.castShadow = true; // enable shadow casting
                        obj.shadow.bias = -0.0001;
                        obj.shadow.mapSize.width = 2048;
                        obj.shadow.mapSize.height = 2048;
                    }
                }

                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
        }

        // Now process colliders
        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;

            if (child.name.startsWith("Collider_")) {

                //local transforms of the object as exported from Blender, relative to its parent (or the world if it has no parent).
                const childquaternion = child.quaternion.clone();
                const childposition = child.position.clone();
                const childscale = child.scale.clone();

                // Compute bounding box and scale
                child.geometry.computeBoundingBox();
                const bbox = child.geometry.boundingBox.clone();
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const center = new THREE.Vector3(); //center of the mesh boundind box in object space
                bbox.getCenter(center);
                size.multiply(childscale);

                // Half extents for cuboid
                const halfExtents = {
                    x: size.x * 0.5,
                    y: size.y * 0.5,
                    z: size.z * 0.5,
                };

                const colliderDesc = RAPIER.ColliderDesc.cuboid(
                    halfExtents.x,
                    halfExtents.y,
                    halfExtents.z
                )

                //at this point its just a cuboid computed from object BB in local space
                //with 0 rotation and offset

                //rotate bbox center with the object rotation
                const rotatedCenter = center.clone().applyQuaternion(childquaternion.clone());
                const newCenterPosition = rotatedCenter.clone();
                newCenterPosition.x += childposition.x;
                newCenterPosition.y += childposition.y;
                newCenterPosition.z += childposition.z;

                let bodyHandle = null; // null is default for static collider

                //kinematic collider
                if (child.name.startsWith("Collider_Kine_")) {

                    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
                        .setTranslation(newCenterPosition.x, newCenterPosition.y, newCenterPosition.z)
                        .setRotation(childquaternion); // must be a RAPIER.Quaternion
                    bodyHandle = Shared.physWorld.createRigidBody(bodyDesc);
                    bodyHandle.userData = { name: "Body_" + child.name };

                    //add corresponding mesh offset
                    // const relatedName = child.name.substring(child.name.lastIndexOf("_") + 1);
                    const [, relatedName] = child.name.match(/Collider_Kine_(.*)$/);
                    // const relatedMesh = Shared.scene.getObjectByName(relatedName)
                    const relatedMesh = Shared.scene.getObjectByName(relatedName)
                    const p = relatedMesh.getWorldPosition(new THREE.Vector3());
                    const q = relatedMesh.getWorldQuaternion(new THREE.Quaternion());
                    // const offsetRootToBody = newCenterPosition.clone().sub(relatedMesh.position)
                    const offsetRootToBody = newCenterPosition.clone().sub(p)
                    bodyHandle.userData = { 
                        name: (child.name+"_body"),
                        offsetRootToBody: offsetRootToBody,
                        colliderDesc:colliderDesc,
                    };


                    //static collider
                } else {

                    // Create Rapier cuboid collider (static if no body)
                    colliderDesc
                        .setTranslation(newCenterPosition.x, newCenterPosition.y, newCenterPosition.z)
                        .setRotation(childquaternion)

                }

                //collision groups
                if (child.name.startsWith("Collider_Kine_weapon")) {
                    colliderDesc.setCollisionGroups(Shared.COL_MASKS.PLAYERWPN)
                } else {
                    colliderDesc.setCollisionGroups(Shared.COL_MASKS.SCENERY)
                }

                const colliderHandle = Shared.physWorld.createCollider(colliderDesc, bodyHandle);

                colliderHandle.userData = { name: child.name };
                Shared.colliderNameMap.set(child.name, colliderHandle);
                Shared.BodyNameMap.set(child.name, bodyHandle);

            }
        });

    } catch (err) {
        console.error("Failed to load GLB:", err);
    }
}

function getBoneByPrefix(skeleton, prefix) {
  return skeleton.bones.find(bone => bone.name.startsWith(prefix)) || null;
}


/*---------------------------------*/
// loadLevelGlb
/*---------------------------------*/
async function loadLevelGlb(arrayBuffer) {
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

/*---------------------------------*/
// updateLoadProgression
/*---------------------------------*/
function updateLoadProgression(ratio) {
    const percent = Math.floor(ratio * 100);
    Shared.LoadBtnTxt.textContent = `Loading... ${percent}%`;

    Shared.LoadBtnProgress.style.width = (ratio * 100) + '%';

    if (ratio >= 1) {
        // Wait 1 second then reset button
        setTimeout(() => {
            Shared.LoadBtnProgress.style.width = '0%';
            Shared.LoadBtnTxt.textContent = 'Load Planes (L)';
        }, 1000); // 1000ms = 1 second

    }
}




/*------*/
// SAVE //
/*------*/


/*---------------------------------*/
// saveLevel
/*---------------------------------*/
export function saveLevel() {
    const mergedData = {};
    let json = JSON.stringify(mergedData, null, 2);

    console.log(json);
    downloadJson(json, "grouped_planes.json");
}

/*---------------------------------*/
// downloadJson (refactored)
/*---------------------------------*/
async function downloadJson(data, filename = "data.json") {
    const blob = new Blob([data], { type: "application/json" });
    await saveFile(blob, filename, "application/json");
}

/*---------------------------------*/
// saveFile helper
/*---------------------------------*/
async function saveFile(blob, suggestedName, mimeType) {
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: mimeType,
                        accept: { [mimeType]: [`.${suggestedName.split('.').pop()}`] }
                    }
                ]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            console.warn("Save cancelled or failed:", err);
            return; // don’t fallback if the user cancels
        }
    }

    // Fallback for browsers without FS API
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = suggestedName;
    link.click();
    URL.revokeObjectURL(url);
}


/*---------------------------------*/
// resetLevel
/*---------------------------------*/
export function resetLevel() {
    //TODO
}





async function loadCharacter(characterState, scene, pathToGlb) {
    try {
        // const response = await fetch('./assets/glb/player.glb');
        const response = await fetch(pathToGlb);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const gltf = await loadLevelGlb(arrayBuffer);
        const weaponArray = [];
        // const rigArray = [];

        // const characterState = Shared.playerState;

        gltf.scene.children.forEach((child) => {

            if (child.name.startsWith("Armature")) {
                characterState.root = child;//TEMP

                child.traverse(obj => {
                    if (obj.isSkinnedMesh) {
                        characterState.skeleton = obj.skeleton;//TEMP
                        // characterState.weaponBone = obj.skeleton.getBoneByName(Shared.WEAPON_BONE_NAME);;//TEMP
                        characterState.weaponBone = getBoneByPrefix(obj.skeleton, Shared.WEAPON_BONE_NAME);;//TEMP
                        if (!characterState.weaponBone && isPlayer) throw new Error("weapon bone not defined");
                        obj.frustumCulled = false;//temp
                    } else if ( obj.isMesh && obj.name.startsWith("weapon")) {
                        characterState.weapon = obj;
                        //do this only for sword, body can be frustrum culled
                        obj.frustumCulled = false; //this prevents sword in first person view to be culled when camera tilts and get too close
                        weaponArray.push(obj);
                    }
                });
                if (!characterState.weaponBone && isPlayer) throw new Error("weapon bone not defined");

                //create mixer on the armature root
                const mixer = new THREE.AnimationMixer(child)
                mixer.name = child.name+"_mixer";
                characterState.mixer = mixer;
                // rigArray.push(child);

                // extract animations
                gltf.animations.forEach(clip => {
                    // if (clip.name.startsWith(child.name)) {
                    //     const match = clip.name.match(new RegExp(`${child.name}_(.*)$`));
                    //     const newClipName = match ? match[1] : null;
                        const newClipName = clip.name;
                        characterState.animationClips.set(newClipName, clip);
                        characterState.animationActions.set(newClipName, mixer.clipAction(clip));
                        if (newClipName === Shared.ANIM_WALK_NAME) {
                            const walkLowerClip = Shared.makePartialClip(clip, Shared.lowerBodyBones);
                            characterState.animationClips.set(Shared.ANIM_WALK_NAME_L, walkLowerClip);
                            characterState.animationActions.set(Shared.ANIM_WALK_NAME_L, mixer.clipAction(walkLowerClip));
                        }
                    // }
                });
            }
        });

        // Now safely add to your scene
        // rigArray.forEach(rig => Shared.rigGroup.add(rig));
        // scene.add(Shared.rigGroup);

        // Now process colliders
        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;

            if (child.name.startsWith("Collider_Kine_weapon")) {

                //local transforms of the object as exported from Blender, relative to its parent (or the world if it has no parent).
                const childquaternion = child.quaternion.clone();
                const childposition = child.position.clone();
                const childscale = child.scale.clone();

                // Compute bounding box and scale
                child.geometry.computeBoundingBox();
                const bbox = child.geometry.boundingBox.clone();
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const center = new THREE.Vector3(); //center of the mesh boundind box in object space
                bbox.getCenter(center);
                size.multiply(childscale);

                // Half extents for cuboid
                const halfExtents = {
                    x: size.x * 0.5,
                    y: size.y * 0.5,
                    z: size.z * 0.5,
                };

                const colliderDesc = RAPIER.ColliderDesc.cuboid(
                    halfExtents.x,
                    halfExtents.y,
                    halfExtents.z
                )

                //at this point its just a cuboid computed from object BB in local space
                //with 0 rotation and offset

                //rotate bbox center with the object rotation
                const rotatedCenter = center.clone().applyQuaternion(childquaternion.clone());
                const newCenterPosition = rotatedCenter.clone();
                newCenterPosition.x += childposition.x;
                newCenterPosition.y += childposition.y;
                newCenterPosition.z += childposition.z;

                let bodyHandle = null; // null is default for static collider


                const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
                    .setTranslation(newCenterPosition.x, newCenterPosition.y, newCenterPosition.z)
                    .setRotation(childquaternion); // must be a RAPIER.Quaternion
                bodyHandle = Shared.physWorld.createRigidBody(bodyDesc);
                bodyHandle.userData = { name: "Body_" + child.name };

                characterState.weaponBody = bodyHandle;

                //add corresponding mesh offset
                // const relatedName = child.name.substring(child.name.lastIndexOf("_") + 1);
                const [, relatedName] = child.name.match(/Collider_Kine_(.*)$/);
                // const relatedMesh = Shared.scene.getObjectByName(relatedName)
                const relatedMesh = gltf.scene.getObjectByName(relatedName)
                const p = relatedMesh.getWorldPosition(new THREE.Vector3());
                const q = relatedMesh.getWorldQuaternion(new THREE.Quaternion());
                // const offsetRootToBody = newCenterPosition.clone().sub(relatedMesh.position)
                const offsetRootToBody = newCenterPosition.clone().sub(p)
                bodyHandle.userData = {
                    name: (child.name + "_body"),
                    offsetRootToBody: offsetRootToBody,
                    colliderDesc: colliderDesc,
                };

                colliderDesc.setCollisionGroups(Shared.COL_MASKS.PLAYERWPN)
                // colliderDesc.setSensor(true);

                const colliderHandle = Shared.physWorld.createCollider(colliderDesc, bodyHandle);
                characterState.weaponCollider = colliderHandle;

                colliderHandle.userData = { name: child.name, characterState: characterState };
                Shared.colliderNameMap.set(child.name, colliderHandle);
                Shared.BodyNameMap.set(child.name, bodyHandle);
            }
        });


    } catch (err) {
        console.error("Failed to load GLB:", err);
    }
}
