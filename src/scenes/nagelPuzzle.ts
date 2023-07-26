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
import { calculateBoundingBoxDiagonalLength, ccDelta, qqDelta } from "../contactForce";
import { STLFileLoader } from "@babylonjs/loaders/STL/stlFileLoader";
// Laden und Parsen von SDF Dateien
import { loadSDFFile, parseSDFFileContent } from '../sdfParser';
import { SDFData } from '../sdfParser';
import { loadOffFile, parseOffFileContent } from '../offParser';
import NagelPuzzleStatic from "../../assets/meshes/Nagel1.stl";
import { AdvancedDynamicTexture, Button } from "@babylonjs/gui";



export class DefaultSceneWithTexture implements CreateSceneClass {
    createScene = async (
        engine: Engine,
        canvas: HTMLCanvasElement
    ): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);
        /*********************************************************
         * Anzeigen von Debug-Layern
         *********************************************************/
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

        /**
         * Berechnet den Mittelpunkt eines Meshes, um diesen zum Pivotverschiebung zu nutzen
         * @param mesh 
         * @returns centerpoint in global coordinates
         */
        function calculateCenter(mesh: Mesh): Vector3 {
            const boundingInfo = mesh.getBoundingInfo();
            const boundingBox = boundingInfo.boundingBox;
            const center = boundingBox.center;
            console.log("Center: ", center)
            return center;
        }

        /*********************************************************
         * Einlesen von SDF & OFF Datein, sowie loaden von Meshes und deren Properties 
         *********************************************************/
        STLFileLoader.DO_NOT_ALTER_FILE_COORDINATES = true;
        /*******************************************************************
         * Neue Implementations-Idee:
         * Anstatt einfach zu Skalieren nutzen wir 2 paar Meshes
         * 1. Paar: Nicht Skalierte Meshes (moveable & Static) mit welche wir Berechnungen
         *          und Kollisionsabfragen und erkennung durchführen
         * 2. Paar: Skalierte Meshes (moveable & Static) welche wir zur Darstellung nutzen
         * 
         * Dabei wird das 1. Paar als Hidden Meshes gesetzt und das 2. Paar als Visible
         * 2te Paar wird geparented an das 1te Paar um die Positionen und Rotationen zu übernehmen
         * evnt muss dies "manuell" gemacht werden, da die Skalierung auch auf die bewegte Strecke
         * angewendet werden muss.
         *******************************************************************/
        // Import Nagel Puzzle Mesh via STL
        
        // Visible wird zur Darstellung genutzt und runter skaliert
        // Hidden wird für die Kollisionsabfrage genutzt und bleibt in Originalgröße
        
        // Visible:
        const nagelPuzzleStaticLoadVisible = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPuzzleStatic,
            scene, 
            undefined,
            ".stl"
        );

        const nagelPuzzleStaticVisible = nagelPuzzleStaticLoadVisible.meshes[0] as Mesh;

        // Hidden: 
        const nagelPuzzleStaticLoadVisibleHidden = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPuzzleStatic,
            scene, 
            undefined,
            ".stl"
        );
        const nagelPuzzleStaticHidden = nagelPuzzleStaticLoadVisibleHidden.meshes[0] as Mesh;

        // Scale z Axis mit -1 um Koordinatensystem an Babylon's anzupassen
        // nagelPuzzleStatic.scaling = new Vector3(1, 1, -1);

        // Visible wird zur Darstellung genutzt und runter skaliert
        // Hidden wird für die Kollisionsabfrage genutzt und bleibt in Originalgröße
        // Visible:
        const nagelPuzzleMoveableLoadVisible = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPuzzleStatic,
            scene,
            undefined,
            ".stl"
            
        );
        
        const nagelPuzzleMoveableVisible = nagelPuzzleMoveableLoadVisible.meshes[0] as Mesh;
        nagelPuzzleMoveableVisible.name = "MoveableVisible";
        nagelPuzzleMoveableVisible.visibility = 1;
        // Scale z Axis mit -1 um Koordinatensystem an Babylon's anzupassen
        //nagelPuzzleMoveableVisible.scaling = new Vector3(1, 1, 1);

        // Hidden:
        const nagelPuzzleMoveableLoadHidden = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPuzzleStatic,
            scene,
            undefined,
            ".stl"
            
        );
        const nagelPuzzleMoveableHidden = nagelPuzzleMoveableLoadHidden.meshes[0] as Mesh;
        nagelPuzzleMoveableHidden.name = "MoveableHidden";
        nagelPuzzleMoveableHidden.visibility = 1; // Temp visible for Debugging
        


        // Erstelle leere Mesh um die Punkte zu speichern
        // dabei sind die Punkte, die Punkte der Oberfläche des moveable Meshes
        // Hierachie von Kind zu Parent Notiert: nagelPuzzleMoveableHidden <- nagelPunkte <-- Punkt0, Punkt1, Punkt2,
        const nagelPunkte = new Mesh("NagelPunkte", scene);
        nagelPunkte.parent = nagelPuzzleMoveableHidden;
        const punkteInfo: Promise<string> = loadOffFile("https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.noff");
        const offInfo = parseOffFileContent(await punkteInfo);
        const punkte = offInfo.vertices
        const normals = offInfo.normals


        // Erstelle ein leeres Mesh an jeden dieser Punkte und parente diesen an nagelPunkte  
        for (let i = 0; i < punkte.length; i++) {
            const punkt = new Mesh("Punkt" + i, scene)
            punkt.position = punkte[i];
            punkt.parent = nagelPunkte;
            punkt.visibility = 0;
        }
        //nagelPuzzleMoveableVisible.position = new Vector3(-0.5, 1, 0); // Wird von Renderloop überschrieben
        nagelPuzzleStaticVisible.position = new Vector3(0, 0, 0);

        // Drehe Moveable Mesh um 180°
        nagelPuzzleMoveableVisible.rotationQuaternion = Quaternion.FromEulerVector( new Vector3(Math.PI / 2, Math.PI, 0));
        nagelPuzzleMoveableHidden.rotationQuaternion = Quaternion.FromEulerVector( new Vector3(Math.PI / 2, Math.PI, 0));


        // Scaling der Meshe für WebXr
        nagelPuzzleMoveableVisible.scaling = new Vector3(0.01, 0.01, 0.01);
        nagelPuzzleStaticVisible.scaling = new Vector3(0.01, 0.01, 0.01);

        // let temp = nagelPuzzleMoveableHidden.absolutePosition;
        nagelPuzzleMoveableHidden.setPivotPoint(calculateCenter(nagelPuzzleMoveableHidden));
        // nagelPuzzleMoveableHidden.position = temp;

        // temp = nagelPuzzleMoveableVisible.position;
        nagelPuzzleMoveableVisible.setPivotPoint(calculateCenter(nagelPuzzleMoveableVisible));
        // nagelPuzzleMoveableVisible.position = temp  

        // temp = nagelPuzzleStaticVisible.position;
        nagelPuzzleStaticHidden.setPivotPoint(calculateCenter(nagelPuzzleStaticHidden));
        // nagelPuzzleStaticHidden.position = temp;

        // temp = nagelPuzzleStaticVisible.position;
        nagelPuzzleStaticVisible.setPivotPoint(calculateCenter(nagelPuzzleStaticVisible));
        // nagelPuzzleStaticVisible.position = temp
        
        // Fix positioning
        nagelPuzzleMoveableVisible.position = new Vector3(-41, -11, -5);

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

        // Our built-in 'ground' shape.
        const ground = CreateGround(
            "ground",
            { width: 6, height: 6 },
            scene
        );
        ground.position.y = -0.5;
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

        /************************************************************
         * GUI-Interface zum setzen der Kollisionsvariable zum Debug
         *************************************************************/
        // Button Textur & Properties
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const button = Button.CreateSimpleButton("toggleCollisionCorrection", "Toggle Collision Correction");
        button.width = "150px";
        button.height = "40px";
        button.background = "red"; // Startzustand
        button.color = "white";
        button.left = "35%"; 
        button.top = "-45%"; 

        // Var für Kollisionsabfrage
        let collisionCorrectionEnabled = false;
        
        // Funktion für den Button
        function toggleCollisionCorrection() {
            collisionCorrectionEnabled = !collisionCorrectionEnabled;
            // Update Button-Background
            if (collisionCorrectionEnabled) {
                button.background = "green";
            } else {
                button.background = "red";
            }
        }
        // Button Event-Handler
        button.onPointerClickObservable.add(() => {
            toggleCollisionCorrection();
        })
        // Hinzufügen vom Button zur GUI-Texture
        advancedTexture.addControl(button);


        /*********************************************************
         * VR Implementation (Variablen sowie Event-Handler für den Controller) 
         *********************************************************/
        // VR-Integration, "WebXR"
        const xr = await scene.createDefaultXRExperienceAsync({ floorMeshes: [ground] });

        // XR-Sitzung abrufen
        const xrSession = xr.baseExperience.sessionManager.session;
        
        const targetMesh = nagelPuzzleMoveableVisible;

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

        /*******************************************************************
         * Each Frame Check: (2)Beinhaltet Kollisionserkennung und behebung
         *                   (1)sowie das Bewegen des Moveable Meshes durch VR
         *******************************************************************/
        // (1)
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
        /**********************************************************************
         * Kollisionsabfrage und Behebung (2)
        **********************************************************************/
        for (let i = 0; i < moveableNagelPunkte.length; i++) {
            // Schaue ob wir eine Kollision haben, und wenn ja, ob diese Tiefer drinne ist als unsere bereits gespeicherte
            
            const currentPointDistance = distanceToWorldpoint(currentPunkt[i].absolutePosition, nagelPuzzleStaticVisible, sdfContent)
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
            nagelPuzzleStaticVisible.material = noCollisionMaterial;
        } else {
            // Kollision, daher Material ändern
            nagelPuzzleStaticVisible.material = collisionMaterial;
            // An-Aus Steuerbar über Button
            if(collisionCorrectionEnabled){
                // Starte cDelta und qDelta Berechnung
                // Tiefster Punkt umgerechnet zum lokalen Koordinatensystem
                const currentPoint = currentPunkt[index].absolutePosition
                // Momentaner Root Node des NagelPuzzles als Lokaler Punkt
                const rootPoint = nagelPuzzleMoveableVisible.absolutePosition;

                // Invertiere Normalenvektor, da er in die andere Richtung zeigt als für die Berechnung benötigt
                // ---> zu <-----
                const normalVector = new Vector3(normals[index].x, normals[index].y, normals[index].z);
                let transformedNormal = Vector3.TransformNormal(normalVector, nagelPuzzleMoveableVisible.getWorldMatrix());
                transformedNormal = transformedNormal.multiply(new Vector3(-1, -1, -1));
                console.log(transformedNormal)

                // Kollision wurde erkannt, daher berechne die benötigte Änderung in Position und Orientierung
                const radius = calculateBoundingBoxDiagonalLength(sdfContent.bbox.min, sdfContent.bbox.max);
                //const positionOffset = cDelta(nagelPuzzleMoveable, currentPoint, transformedNormal, distance, radius, 1);
                const positionOffset = ccDelta(distance, sdfContent.bbox.min, sdfContent.bbox.max, currentPoint, rootPoint, nagelPuzzleStaticVisible, transformedNormal);

                const orientationOffset = qqDelta(distance, sdfContent.bbox.min, sdfContent.bbox.max, currentPoint, rootPoint, nagelPuzzleStaticVisible, transformedNormal, nagelPuzzleMoveableVisible);
                // Berechne neue Position und Orientierung (c + cDelta, q + qDelta)

                const newPosition = nagelPuzzleMoveableVisible.absolutePosition.add(positionOffset);
                console.log("CurrentPosition: ", nagelPuzzleMoveableVisible.absolutePosition)
                console.log("PositionOffset: ", positionOffset)
                console.log("NewPosition: ", newPosition)

                const currentOrientation = nagelPuzzleMoveableVisible.rotationQuaternion as Quaternion;
                // console.log("CurrentOrientation: ", currentOrientation)
                // console.log("OrientationOffset: ", orientationOffset)
                // console.log("NewOrientation: ", currentOrientation.add(orientationOffset))
                const newOrientation = (currentOrientation.add(orientationOffset));

                // Setze neue Position und Orientierung
                // Orientierung zuerst, da diese die Position eventuell beeinflusst,
                // dannach Position um die geänderte Position von der Rotation zu überschreiben
                nagelPuzzleMoveableVisible.rotationQuaternion = newOrientation;
                nagelPuzzleMoveableVisible.position = new Vector3(newPosition.x, newPosition.y, newPosition.z);
        }
    }
    // Setze Visible Mesh's Position und Rotation auf Hidden Mesh's Position und Rotation skaliert mit dem Scaling des Visible Meshes
    nagelPuzzleMoveableVisible.position = (nagelPuzzleMoveableHidden.position).multiply(nagelPuzzleMoveableVisible.scaling);
    nagelPuzzleMoveableVisible.rotationQuaternion = nagelPuzzleMoveableHidden.rotationQuaternion;
}) // Ende onBeforeRenderObservable
        ;

        return scene;
    };
}

export default new DefaultSceneWithTexture();

