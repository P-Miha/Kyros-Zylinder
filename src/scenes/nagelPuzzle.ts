import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";
import { Axis, BoundingInfo, Color3, HighlightLayer, Mesh, MeshBuilder, Nullable, SceneLoader, TransformNode, WebXRControllerComponent } from "@babylonjs/core";
// If you don't need the standard material you will still need to import it since the scene requires it.
// import "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import grassTextureUrl from "../../assets/grass.jpg";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/loaders/STL/stlFileLoader";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

// Custom Importe / 
import { STLFileLoader } from "@babylonjs/loaders/STL/stlFileLoader";
// Laden und Parsen von SDF Dateien
import { loadSDFFile, parseSDFFileContent } from '../sdfParser';
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
     * @returns centerpoint in local coordinates
     */
    function calculateCenter(mesh: Mesh): Vector3 {
        const boundingInfo = mesh.getBoundingInfo();
        const boundingBox = boundingInfo.boundingBox;
        const center = boundingBox.center;
        //debug
        const centerMesh = MeshBuilder.CreateBox("centerMesh", {size: 0.1})
        centerMesh.position = center;
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
    // const punkteInfo: Promise<string> = loadOffFile("https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.noff");
    // const offInfo = parseOffFileContent(await punkteInfo);
    // const punkte = offInfo.vertices
    // const normals = offInfo.normals



    //nagelPuzzleMoveableVisible.position = new Vector3(-0.5, 1, 0); // Wird von Renderloop überschrieben
    nagelPuzzleStaticVisible.position = new Vector3(0, 0, 0);

    // Drehe Moveable Mesh um 180°
    nagelPuzzleMoveableVisible.rotationQuaternion = Quaternion.FromEulerVector( new Vector3(Math.PI / 2, Math.PI, 0));


    // Scaling der Meshe für WebXr
    // Dabei hier sind dies die Darstellungsstücke und nicht die Kollisionsstücke,
    // welche zur Berechnung genutzt werden
    nagelPuzzleMoveableVisible.scaling = new Vector3(0.01, 0.01, 0.01);
    nagelPuzzleStaticVisible.scaling = new Vector3(0.01, 0.01, 0.01);

    function placeMeshInCenter(mesh: Mesh): TransformNode {
        // Schritt 1: Neue TransformNode erstellen
        const centerNode = new TransformNode('CenterNode', mesh.getScene());
      
        // Schritt 2: Den Mittelpunkt des Meshes berechnen
        const boundingInfo = mesh.getBoundingInfo();
        const meshCenter = boundingInfo.boundingBox.center.clone();
      
        // Schritt 3: Das Mesh zum Ursprung verschieben
        const meshToOrigin = meshCenter.scaleInPlace(-1);
        mesh.position.addInPlace(meshToOrigin);
      
        // Schritt 4: Das Mesh als Kind zur TransformNode hinzufügen
        //mesh.parent = centerNode;
      
        // Schritt 5: Die TransformNode zum ursprünglichen Mittelpunkt des Meshes zurückverschieben
        centerNode.position = meshCenter;
      
        // Schritt 6: Optional - Den falschen Center des Meshes zurücksetzen
        mesh.setPivotMatrix(Matrix.Identity());
      
        // Die TransformNode zurückgeben, falls du sie später noch verwenden möchtest
        return centerNode;
      }

    const npmvTransformNode = placeMeshInCenter(nagelPuzzleMoveableHidden);
    const temp = nagelPuzzleMoveableHidden.getBoundingInfo().boundingBox;
    // const temp2 = temp.maximum.subtract(temp.minimum);
    //npmvTransformNode.position = new Vector3(temp2.x, temp2.y, temp2.z)
    nagelPuzzleMoveableHidden.parent = npmvTransformNode;

    npmvTransformNode.rotationQuaternion = Quaternion.FromEulerVector( new Vector3(Math.PI / 2, Math.PI, 0));

    // ******************** Fix positioning **********************//
    npmvTransformNode.position = new Vector3(59.047, 0.126, -10.105);

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

    // Setzen der Kamera initally auf den Ursprung des NagelPuzzles (Visible),
    // Manuell, damit die Kamera noch "Panning" kann
    // camera.setTarget(new Vector3(21.27, 9.95, 0));
    camera.alpha = 4.735
    camera.beta = 1.284
    camera.inertia = 0.01

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // Our built-in 'ground' shape.
    const ground = CreateGround(
        "ground",
        { width: 6, height: 6 },
        scene
    );
    //ground.position = new Vector3(21.33, 9.27, 0);
    ground.position.y = -0.5
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
    const xrCamera = xr.baseExperience.camera;
    xrCamera.position = new Vector3(0, 0, 0);
    
    const targetMesh = nagelPuzzleMoveableHidden;

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
        // Wird ausgelöst, wenn wir in WebXR bzw VR sind, daher die großen Modelle zum Berechnen ausblenden
        // und kleine Modelle zum Anzeigen einblenden
        nagelPuzzleMoveableHidden.isVisible = false;
        nagelPuzzleStaticHidden.isVisible = false;

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

    // erstelle Worker
    let workerHasJob = false;
    const worker = new Worker(new URL('../nagelWorker.ts', import.meta.url))
    const fps = engine.getFps();
    console.log("FPS: ", fps)
    let workerTimer = 0; // Assuming 60 FPS
    function checkIfWorkerMessageLost(workerHasJob: boolean){
       if (workerHasJob){
           workerTimer++;
           // if 2 seconds passed, reset workerHasJob aka send new message
           if (workerTimer > 144 * 5){
                console.log("Worker Message lost, sending new Message")
                workerHasJob = false;
                workerTimer = 0;
           }
       }
       if (!workerHasJob){
           workerTimer = 0;
       }
       return workerHasJob;
       
    }
    /*******************************************************************
     * Each Frame Check: (2)Beinhaltet Kollisionserkennung und behebung
     *                   (1)sowie das Bewegen des Moveable Meshes durch VR
     *******************************************************************/
    // (1)
    // Checke Punkte per Frame
    let frameCounter = 0;
    scene.onBeforeRenderObservable.add(() => { 
        frameCounter++;
        const fps = engine.getFps();
        // Controller Movement
        // Überprüfen, ob der Trigger gedrückt ist und "Dragging" aktiv ist
        if (isDragging) {
            // Controller infos abrufen und unter controller speichern
            const controller = xr.input.controllers.find((c) => c.inputSource.handedness === 'right');

            // Überprüfen, ob der Controller gefunden wurde und die Komponenten vorhanden sind
            if (controller && controller.grip && controller.grip.position && controller.grip.rotationQuaternion) {
                // Aktuelle Position und Rotation des Controllers abrufen
                const currentPosition = controller.grip.absolutePosition;
                const currentRotation = controller.grip.rotationQuaternion;

                // Prüfen, ob die Position und Rotation definiert sind und der vorherige Status vorhanden ist
                if (currentPosition && currentRotation && previousPosition && previousRotation) {
                    // Skalierung und Rotation des Ziel-Meshes berücksichtigen
                    // const scaledPositionDelta = currentPosition.subtract(previousPosition).divide(targetMesh.scaling);

                    // Erstelle TransformNode und appliere Orientierung der VR Camera
                    const xrTransformNode = new TransformNode("xrTransformNode", scene);
                    xrTransformNode.position = nagelPuzzleMoveableHidden.getBoundingInfo().boundingBox.centerWorld;
                    xrTransformNode.rotationQuaternion = new Quaternion(0, 0, 0, 0); // Standart, prevent null
                    xrTransformNode.rotationQuaternion = controller.grip.rotationQuaternion;
                    // Setze XrTransformNode als Parent des Moveable Meshes(TransformNode)

                    // Rotation des Controllers in das Koordinatensystem des Weltursprungs umwandeln
                    const worldOriginRotation = Quaternion.Identity();
                    const controllerRotation = worldOriginRotation.multiply(currentRotation).multiply(previousRotation.conjugate());

                    // Berechne die Änderung der Position und Rotation des Controllers im Vergleich zum vorherigen Frame
                    const positionDelta = currentPosition.subtract(previousPosition);
                    //const rotationDelta = currentRotation.multiply(previousRotation.conjugate());
                    let rotationDelta = previousRotation.conjugate().multiply(currentRotation);
                    rotationDelta = rotationDelta.invert();
                    // Apply Parent, Move(Scaled), Rotate(Scaled), Remove Parent-Link, dispose TransformNode
                    // TransformNode wird für jede Beweung neu erstellt, da sonst perspektive der Rotation nicht stimmt(XR Camera-Ansicht)
                    npmvTransformNode.setParent(xrTransformNode)
                    //console.log(xrCamera.absoluteRotation)

                    npmvTransformNode.position = npmvTransformNode.position.addInPlace(positionDelta.scaleInPlace(50));
                    xrTransformNode.rotationQuaternion = xrTransformNode.rotationQuaternion.multiply(rotationDelta.conjugate())
                    //npmvTransformNode.setParent(null)
                    // Setze Visible Mesh's Position und Rotation auf Hidden Mesh's Position und Rotation skaliert mit dem Scaling des Visible Meshes
                    nagelPuzzleMoveableVisible.position = (nagelPuzzleMoveableHidden.absolutePosition).multiply(nagelPuzzleMoveableVisible.scaling);
                    //nagelPuzzleMoveableVisible.rotationQuaternion = npmvTransformNode.rotationQuaternion;
                    npmvTransformNode.setParent(null)
                    xrTransformNode.dispose()
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
        // Kollisionsabfrage und Behebung via Worker
        // Checke ob worker bereits am updaten ist
        workerHasJob = checkIfWorkerMessageLost(workerHasJob);
        if (!workerHasJob && fps / 50 < frameCounter) {
            frameCounter = 0;
            const worldMatrixStatic = nagelPuzzleStaticHidden.getWorldMatrix();
            const worldMatrixMoveble = nagelPuzzleMoveableHidden.getWorldMatrix();
            // Send Message, if Worker is not busy
            //console.log("Sending Message to Worker", workerHasJob)
            worker.postMessage([worldMatrixMoveble.asArray(), worldMatrixStatic.asArray()]);
            // update workerHasJob
            workerHasJob = true;
        }
     

    // Setze Visible Mesh's Position und Rotation auf Hidden Mesh's Position und Rotation skaliert mit dem Scaling des Visible Meshes
    nagelPuzzleMoveableVisible.position = (nagelPuzzleMoveableHidden.absolutePosition).multiply(nagelPuzzleMoveableVisible.scaling);
    nagelPuzzleMoveableVisible.rotationQuaternion = npmvTransformNode.rotationQuaternion;

    //Safty Check: Setze Scaling auf 1,1,1 falls es sich verändert hat
    // bzw 0,01 für die kleinen Modelle
    nagelPuzzleMoveableVisible.scaling = new Vector3(0.01, 0.01, 0.01);
    nagelPuzzleStaticVisible.scaling = new Vector3(0.01, 0.01, 0.01);
    nagelPuzzleMoveableHidden.scaling = new Vector3(1, 1, 1);
    nagelPuzzleStaticHidden.scaling = new Vector3(1, 1, 1);
    npmvTransformNode.scaling = new Vector3(1, 1, 1);

    }) // Ende onBeforeRenderObservable
        ;

    // Worker Event-Handler
    worker.onmessage = (event) => {
        const errorFlag = event.data[2];
        //console.log("Worker Message received", errorFlag)
        if (errorFlag === 1 || errorFlag === -1) {
            workerHasJob = false;
        }

        // Apply Result to Mesh
        if (collisionCorrectionEnabled && errorFlag === 1) {
            const positionDelta = Vector3.FromArray(event.data[0]);
            const orientationDelta = Quaternion.FromArray(event.data[1]);
            const currentPosition = npmvTransformNode.position;
            // Kollision
            //console.log("Enter Collision");
            nagelPuzzleMoveableHidden.material = collisionMaterial;
            // Rotate anc Move via transformNode
            const newPosition = currentPosition.add(positionDelta);

            npmvTransformNode.position = newPosition
            npmvTransformNode.rotationQuaternion = npmvTransformNode.rotationQuaternion!.add(orientationDelta);
        }
        };
    
        return scene;
    };
}

export default new DefaultSceneWithTexture();

