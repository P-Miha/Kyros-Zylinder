import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";
import { Axis, BoundingInfo, Color3, HighlightLayer, Mesh, MeshBuilder, Nullable, SceneLoader, WebXRControllerComponent } from "@babylonjs/core";
// If you don't need the standard material you will still need to import it since the scene requires it.
// import "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import grassTextureUrl from "../../assets/grass.jpg";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/loaders/STL/stlFileLoader";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

// Custom Importe / 
import { calculateLocalPoint, index, index2, pointFunction, distanceToWorldpoint } from "../nagelDistanceField";
import { cDelta, qDelta, calculateBoundingBoxDiagonalLength, ccDelta, qqDelta } from "../contactForce";
import { STLFileLoader } from "@babylonjs/loaders/STL/stlFileLoader";
// Laden und Parsen von SDF Dateien
import { loadSDFFile, parseSDFFileContent } from '../sdfParser';
import { SDFData } from '../sdfParser';
import { loadOffFile, parseOffFileContent } from '../offParser';
import NagelPuzzleStatic from "../../assets/meshes/Nagel1.stl";



export class DefaultSceneWithTexture implements CreateSceneClass {
    createScene = async (
        engine: Engine,
        canvas: HTMLCanvasElement
    ): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);

        void Promise.all([
            import("@babylonjs/core/Debug/debugLayer"),
            import("@babylonjs/inspector"),
        ]).then((_values) => {
            console.log(_values);
            scene.debugLayer.show({
                handleResize: true,
                overlay: true,
                globalRoot: document.getElementById("#root") || undefined,
            });
        });
        STLFileLoader.DO_NOT_ALTER_FILE_COORDINATES = true;
        // Import Nagel Puzzle Mesh via STL
        const nagelPuzzleStaticLoad = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPuzzleStatic,
            scene, 
            undefined,
            ".stl"
        );
        const nagelPuzzleStatic = nagelPuzzleStaticLoad.meshes[0] as Mesh;

        // Scale z Axis mit -1 um Koordinatensystem an Babylon's anzupassen
        nagelPuzzleStatic.scaling = new Vector3(1, 1, -1);

        const nagelPuzzleMoveableLoad = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPuzzleStatic,
            scene,
            undefined,
            ".stl"
            
        );
        const nagelPuzzleMoveable = nagelPuzzleMoveableLoad.meshes[0] as Mesh;
        nagelPuzzleMoveable.name = "NagelPuzzleMoveable";
        nagelPuzzleMoveable.visibility = 1;
        // Scale z Axis mit -1 um Koordinatensystem an Babylon's anzupassen
        nagelPuzzleMoveable.scaling = new Vector3(1, 1, -1);
        
        // Erstelle leere Mesh um die Punkte zu speichern
        // dabei sind die Punkte, die Punkte der Oberfläche des moveable Meshes
        const nagelPunkte = new Mesh("NagelPunkte", scene);
        nagelPunkte.parent = nagelPuzzleMoveableLoad.meshes[0];
        const punkteInfo: Promise<string> = loadOffFile("https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.noff");
        const offInfo = parseOffFileContent(await punkteInfo);
        const punkte = offInfo.vertices
        const normals = offInfo.normals


        // Erstelle ein leeres Mesh an jeden dieser Punkte und parente diesen an nagelPunkte 
        // Vorerst sichbar 
        for (let i = 0; i < punkte.length; i++) {
            const punkt = new Mesh("Punkt" + i, scene)
            punkt.position = punkte[i];
            punkt.parent = nagelPunkte;
            punkt.visibility = 0;
        }
        nagelPuzzleMoveable.position = new Vector3(-0.5, 1, 0);
        nagelPuzzleStatic.position = new Vector3(0, 1, 0);

        // Drehe Moveable Mesh um 180°
        nagelPuzzleMoveable.rotationQuaternion = Quaternion.FromEulerVector( new Vector3(Math.PI / 2, Math.PI, 0));

        // Scaling der Meshe für WebXr
        nagelPuzzleMoveable.scaling = new Vector3(0.01, 0.01, 0.01);
        nagelPuzzleStatic.scaling = new Vector3(0.01, 0.01, 0.01);

  
        // Die URL der SDF-Datei
        const sdfFileUrl = 'https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.sdf';
        // Definiert in einer ausgelagerten Datei
        // Laded die SDF-Datei aus dem Internet und Parset diese in ein SDFData-Objekt
        const loadFile = loadSDFFile(sdfFileUrl);
        const sdfContent = parseSDFFileContent(await loadFile);
  
        // //Print SDF-Data
        // console.log("SDF-Data: ", sdfContent);
        
        // Erstelle empty mesh um eine Custom boundingbox zu erstellen
        const boundingBox = new Mesh("boundingBox", scene);
        boundingBox.setBoundingInfo(new BoundingInfo(sdfContent.bbox.min, sdfContent.bbox.max));
        boundingBox.showBoundingBox = true;
        
        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera(
            "my first camera",
            0,
            Math.PI / 3,
            10,
            new Vector3(0, 0, 0),
            scene
        );

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        // const light = new HemisphericLight(
        //     "light",
        //     new Vector3(0, 1, 0),
        //     scene
        // );

        // // Default intensity is 1. Let's dim the light a small amount
        // light.intensity = 0.7;

        // Our built-in 'ground' shape.
        const ground = CreateGround(
            "ground",
            { width: 6, height: 6 },
            scene
        );

        // Load a texture to be used as the ground material
        const groundMaterial = new StandardMaterial("ground material", scene);
        groundMaterial.diffuseTexture = new Texture(grassTextureUrl, scene);

        ground.material = groundMaterial;
        ground.receiveShadows = true;

        const light = new DirectionalLight(
            "light",
            new Vector3(0, -1, 1),
            scene
        );
        light.intensity = 0.5;
        light.position.y = 10;

        const shadowGenerator = new ShadowGenerator(512, light)
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurScale = 2;
        shadowGenerator.setDarkness(0.2);

        //shadowGenerator.getShadowMap()!.renderList!.push(sphere);
        //Erstelle Material für Kollision mit Farbe Rot und Kollisionsfrei mit Farbe Grün
        const collisionMaterial = new StandardMaterial("collisionMaterial", scene);
        collisionMaterial.diffuseColor = new Color3(1, 0, 0);

        const noCollisionMaterial = new StandardMaterial("noCollisionMaterial", scene);
        noCollisionMaterial.diffuseColor = new Color3(0, 1, 0);
        
        const moveableNagelPunkte = nagelPunkte.getChildMeshes()
        // Checke jeden Frame ob die Kugel im Nagel ist
        // scene.onBeforeRenderObservable.add(() => {
        //     const collided = Array<Vector3>();
        //     // Checke jeden Punkt von NagelPunkte ob die SDF Distanz kleiner als 0 ist
        //     for (let i = 0; i < moveableNagelPunkte.length; i++) {
        //         const currentPunkt = moveableNagelPunkte[i];
        //         const distance = distanceToWorldpoint(currentPunkt.absolutePosition, nagelPuzzleStatic, sdfContent)
        //         // Wenn Distanz = -1 ist, ist der Punkt nicht in der SDF, daher ignorieren
        //         if (distance < 0 && distance != -1.0) {
        //             collided.push(currentPunkt.absolutePosition);
        //             //console.log("Collision mit Punkt", currentPunkt.absolutePosition, " and NormalVector: ", distanceAndOriantationDelta(currentPunkt.absolutePosition, sdfContent))
        //         }
        //     }
        //     if (collided.length == 0) {
        //         nagelPuzzleStatic.material = noCollisionMaterial;
        //     } else {
        //         nagelPuzzleStatic.material = collisionMaterial;
        //     }
        // }
        // );
       
        // DEBUG 
        // const sphere = MeshBuilder.CreateSphere(
        //     "sphere",
        //     { diameter: 1 },
        //     scene
        // );
        // sphere.position = moveableNagelPunkte[0].absolutePosition;
        // const hl = new HighlightLayer("hl1", scene);
        // hl.addMesh(sphere, Color3.Green());
        // Erstelle Pfeil
        // const direction = new Vector3(0, 0, 1);
        // const arrow = MeshBuilder.CreateTube('arrow', {
        //     path: [new Vector3(0, 0, 0), direction.scale(2)],
        //     radius: 0.05,
        //     tessellation: 16,
        //     updatable: true
        //   }, scene);      
          
        // VR-Integration, "WebXR"
        const xr = await scene.createDefaultXRExperienceAsync({ floorMeshes: [ground] });

        // XR-Sitzung abrufen
        const xrSession = xr.baseExperience.sessionManager.session;
        
        const targetMesh = nagelPuzzleMoveable; // Hier musst du den Code zum Erstellen oder Laden deines Ziel-Meshs einfügen

        // Vorherigen Status des Controllers speichern
        let previousPosition: Nullable<Vector3> = null;
        let previousRotation: Nullable<Quaternion> = null;

        // Controller-Status für "Dragging" speichern
        let isDragging = false;

        // Event-Handler für den rechten Controller hinzufügen
        xr.input.onControllerAddedObservable.add((controller) => {
        // Überprüfen, ob der Controller der rechte Controller ist
        if (controller.inputSource.handedness === 'right') {
            // Event-Handler für den Trigger hinzufügen
            controller.onMotionControllerInitObservable.add(() => {
            // Event-Handler für den Trigger
            const triggerComponent = controller.motionController?.getComponent('xr-standard-trigger');

            if (triggerComponent) {
                triggerComponent.onButtonStateChangedObservable.add((buttonValue) => {
                if (buttonValue.value > 0.5) {
                    // Trigger ist gedrückt
                    isDragging = true;
                } else {
                    // Trigger ist nicht gedrückt
                    isDragging = false;
                    previousPosition = null;
                    previousRotation = null;
                }
                });
            }
            });
        }
        });        


        // Checke Punkte per Frame
        scene.onBeforeRenderObservable.add(() => { 
        const currentPunkt = moveableNagelPunkte;
        let distance = 1
        let index = 0
        // Controller Movement
 // Überprüfen, ob der Trigger gedrückt ist und "Dragging" aktiv ist
 if (isDragging) {
    // Controller abrufen
    const controller = xr.input.controllers.find((c) => c.inputSource.handedness === 'right');

    // Überprüfen, ob der Controller gefunden wurde und die Komponenten vorhanden sind
    if (controller && controller.grip && controller.grip.position && controller.grip.rotationQuaternion) {
      // Aktuelle Position und Rotation des Controllers abrufen
      const currentPosition = controller.grip.position;
      const currentRotation = controller.grip.rotationQuaternion;

      // Prüfen, ob die Position und Rotation definiert sind und der vorherige Status vorhanden ist
      if (currentPosition && currentRotation && previousPosition && previousRotation) {
        // Skalierung und Rotation des Ziel-Meshes berücksichtigen
        // const scaledPositionDelta = currentPosition.subtract(previousPosition).divide(targetMesh.scaling);

    // Rotation des Controllers in das Koordinatensystem des Weltursprungs umwandeln
    const worldOriginRotation = Quaternion.Identity();
    const controllerRotation = worldOriginRotation.multiply(currentRotation).multiply(previousRotation.conjugate());

    // Berechne die Änderung der Position und Rotation des Controllers im Vergleich zum vorherigen Frame
    const positionDelta = currentPosition.subtract(previousPosition);
    const rotationDelta = controllerRotation;

    // Skalierung und Rotation des Ziel-Meshes berücksichtigen
    const scaledPositionDelta = positionDelta.divide(targetMesh.scaling);

    // Ziel-Mesh transformieren
    targetMesh.position.addInPlace(scaledPositionDelta.scaleInPlace(0.01)); // Skaliere die Bewegung nach Bedarf
    targetMesh.rotationQuaternion!.multiplyInPlace(rotationDelta);
    }

      // Vorherigen Status aktualisieren
      previousPosition = currentPosition.clone();
      previousRotation = currentRotation.clone();
    }
  }
        
        // Controller Movement Ende

        for (let i = 0; i < moveableNagelPunkte.length; i++) {
            // Schaue ob wir eine Kollision haben, und wenn ja, ob diese Tiefer drinne ist als unsere bereits gespeicherte
            
            const currentPointDistance = distanceToWorldpoint(currentPunkt[i].absolutePosition, nagelPuzzleStatic, sdfContent)
            //Wenn wir keine debugvalue haben(-1) und die Distanz eine kollision wiederspiegelt (kleiner 0), speichere diese wenn diese tiefer ist als die bereits gespeicherte
            if (currentPointDistance < distance && currentPointDistance != -1.0 && currentPointDistance < 0) {
                console.log("KOLLISSION")
                distance = currentPointDistance
                index = i
            }
        }
        // // eslint-disable-next-line no-constant-condition
        // if (true){
        if (distance > 0 ) {
            nagelPuzzleStatic.material = noCollisionMaterial;
        } else {
            // Kollision, daher Material ändern
            nagelPuzzleStatic.material = collisionMaterial;
            // Starte cDelta und qDelta Berechnung
            
            // Tiefster Punkt umgerechnet zum lokalen Koordinatensystem
            const currentPoint = currentPunkt[index].absolutePosition
            // Momentaner Root Node des NagelPuzzles als Lokaler Punkt
            const rootPoint = nagelPuzzleMoveable.absolutePosition;

            // Invertiere Normalenvektor, da er in die andere Richtung zeigt als für die Berechnung benötigt
            // ---> zu <-----
            const normalVector = new Vector3(normals[index].x, normals[index].y, normals[index].z);

            // const NagelPuzzleMoveableWorldMatrix = nagelPuzzleMoveable.getWorldMatrix();
            let transformedNormal = Vector3.TransformNormal(normalVector, nagelPuzzleMoveable.getWorldMatrix());
            transformedNormal = transformedNormal.multiply(new Vector3(-1, -1, -1));

            // Kollision wurde erkannt, daher berechne die benötigte Änderung in Position und Orientierung
            const radius = calculateBoundingBoxDiagonalLength(sdfContent.bbox.min, sdfContent.bbox.max);
            //const positionOffset = cDelta(nagelPuzzleMoveable, currentPoint, transformedNormal, distance, radius, 1);
            const positionOffset = ccDelta(distance, sdfContent.bbox.min, sdfContent.bbox.max, currentPoint, rootPoint, nagelPuzzleStatic, transformedNormal);
            console.log("Offset: ", positionOffset)
            console.log("CurrentPoint: ", currentPoint)
            // const orientationOffset = qDelta(nagelPuzzleMoveable, currentPoint, transformedNormal, distance, radius, 1);
            const orientationOffset = qqDelta(distance, sdfContent.bbox.min, sdfContent.bbox.max, currentPoint, rootPoint, nagelPuzzleStatic, transformedNormal, nagelPuzzleMoveable);
            // Berechne neue Position und Orientierung (c + cDelta, q + qDelta)

            // const newPosition = currentPoint.add(positionOffset);
            const newPosition = nagelPuzzleMoveable.absolutePosition.add(positionOffset);
            console.log("NewPosition: ", newPosition)
            const currentOrientation = nagelPuzzleMoveable.rotationQuaternion as Quaternion;
            const newOrientation = currentOrientation.add(orientationOffset);
            // Setze neue Position und Orientierung
            nagelPuzzleMoveable.position = new Vector3(newPosition.x, newPosition.y, newPosition.z);
            nagelPuzzleMoveable.rotationQuaternion = newOrientation;
        }
        });

        return scene;
    };
}

export default new DefaultSceneWithTexture();

