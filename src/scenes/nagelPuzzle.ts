import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";
import { BoundingInfo, Color3, DeepImmutable, Mesh, MeshBuilder, SceneLoader } from "@babylonjs/core";
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
        // Notwendig aufgrund verschiedener Koordinatensysteme
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
        nagelPuzzleStatic.name = "NagelPuzzleStatic";

        // Skaliere Mesh um -1 in Z-Achse, da STL-Loader Mesh um 180° dreht
        nagelPuzzleStatic.scaling = new Vector3(1, 1, -1);
        nagelPuzzleStatic.position = new Vector3(3, -2, 1);

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
        
        // Erstelle leere Mesh um die Punkte zu speichern
        // dabei sind die Punkte, die Punkte der Oberfläche des moveable Meshes
        const nagelPunkte = new Mesh("NagelPunkte", scene);
        nagelPunkte.parent = nagelPuzzleMoveableLoad.meshes[0];
        const punkteInfo: Promise<string> = loadOffFile("https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.off");
        const punkte: Vector3[] = parseOffFileContent(await punkteInfo);
        // Erstelle ein leeres Mesh an jeden dieser Punkte und parente diesen an nagelPunkte 
        // Vorerst sichbar 
        for (let i = 0; i < punkte.length; i++) {
            const punkt = new Mesh("Punkt" + i, scene)
            punkt.position = punkte[i];
            punkt.parent = nagelPunkte;
            punkt.visibility = 1;
        }
        // Drehe Moveable Mesh um 180°
        nagelPuzzleMoveable.rotation = new Vector3(0, Math.PI, 0);

        // Die URL der SDF-Datei
        const sdfFileUrl = 'https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.sdf';
        // Definiert in einer ausgelagerten Datei
        // Laded die SDF-Datei aus dem Internet und Parset diese in ein SDFData-Objekt
        const loadFile = loadSDFFile(sdfFileUrl);
        const sdfContent = parseSDFFileContent(await loadFile);
        
        // Erstelle empty mesh um eine Custom boundingbox zu erstellen
        const boundingBox = new Mesh("boundingBox", scene);
        boundingBox.setBoundingInfo(new BoundingInfo(new Vector3().fromArray(sdfContent.bbox.min), new Vector3().fromArray(sdfContent.bbox.max)));
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
     
        // Erstelle 1-Time bevor Render Loop
        // Erhalte Worldmatrix von NagelPuzzleStatic und invertiere dieses um später Punkte in das lokale Koordinatensystem zu transformieren
        const worldMatrix = nagelPuzzleStatic.getWorldMatrix();
        const invertedWorldMatrix = new Matrix();
        worldMatrix.invertToRef(invertedWorldMatrix);
        // Konvertiere Matrix zu Float32Array
        const matrixArray = Array.from(invertedWorldMatrix.toArray());
        const float32Array = new Float32Array(matrixArray);

        // Erstelle Worker
        const nagelWorker = new Worker(new URL('../nagelWorker.ts', import.meta.url))
        // Gebe Konstanten Daten an Worker weiter
        nagelWorker.postMessage({ type: 'sdfContent', data: sdfContent });
        nagelWorker.postMessage({ type: 'meshInvertedWorldMatrix', data: float32Array });


        // Speichere alle Punkte von NagelPunkte in Array
        const moveableNagelPunkte = nagelPunkte.getChildMeshes()

        scene.onBeforeRenderObservable.add(() => {
            // Checke jeden Punkt von NagelPunkte ob die SDF Distanz kleiner als 0 ist
            for (let i = 0; i < moveableNagelPunkte.length; i++) {
                const currentPunkt = moveableNagelPunkte[i];
                const currentPosition = currentPunkt.absolutePosition;
                //const currentPosition = currentPunkt.absolutePosition;
                // Serialize Vector3 zu JSON zum übertragen an Worker
                //let currentPunktPositionSerialized = [currentPosition.x, currentPosition.y, currentPosition.z];
                nagelWorker.postMessage({type: 'point', data: [currentPosition.x, currentPosition.y, currentPosition.z]})
            }
        }
        )
        nagelWorker.onmessage = function(event) {
            const result = event.data;
            // Wenn Distanz = -1 ist, ist der Punkt nicht in der SDF, daher ignorieren
            if (result < 0 && result != -1) {
                nagelPuzzleStatic.material = collisionMaterial;
            }
          };
        


        
        // Checke jeden Frame ob die Kugel im Nagel ist
        // scene.onBeforeRenderObservable.add(() => {
        //     const collided = Array<Vector3>();
        //     // Checke jeden Punkt von NagelPunkte ob die SDF Distanz kleiner als 0 ist
        //     for (let i = 0; i < moveableNagelPunkte.length; i++) {
        //         const currentPunkt = moveableNagelPunkte[i];
        //         const distance = distanceToWorldpoint(currentPunkt.absolutePosition, nagelPuzzleStatic, sdfContent)
        //         // Wenn Distanz = -1 ist, ist der Punkt nicht in der SDF, daher ignorieren
        //         if (distance < 0 && distance != -1) {
        //             collided.push(currentPunkt.absolutePosition);
        //         }
        // }
        // if (collided.length == 0) {
        //     nagelPuzzleStatic.material = noCollisionMaterial;
        // } else {
        //     nagelPuzzleStatic.material = collisionMaterial;
        // }
    // }
    //     );


        return scene;
    };
}

export default new DefaultSceneWithTexture();

