import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";
import { BoundingInfo, Color3, Mesh, MeshBuilder, SceneLoader } from "@babylonjs/core";
// If you don't need the standard material you will still need to import it since the scene requires it.
// import "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import grassTextureUrl from "../../assets/grass.jpg";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/loaders/STL/stlFileLoader";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

// Custom Importe / 
import { calculateLocalPoint, index, index2, point } from "../nagelDistanceField";
import { STLFileLoader } from "@babylonjs/loaders/STL/stlFileLoader";
// Laden und Parsen von SDF Dateien
import { loadSDFFile, parseSDFFileContent } from '../sdfParser';
import { SDFData } from '../sdfParser';

import NagelPuzzleStatic from "../../assets/meshes/Nagel1.stl";
import NagelPuzzleMoveable from "../../assets/meshes/NagelmitPunkten.stl";
import NagelPunkte from "../../assets/meshes/2700 Punkte auf Nageloberfläche.stl";



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


        nagelPuzzleStatic.scaling = new Vector3(1, 1, -1);

        const nagelPuzzleMoveableLoad = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPuzzleMoveable,
            scene,
            undefined,
            ".stl"
            
        );
        const nagelPunkteLoad = await SceneLoader.ImportMeshAsync(
            "",
            "",
            NagelPunkte,
            scene,
            undefined,
            ".stl"
        );
        const nagelPunkte = nagelPunkteLoad.meshes[0] as Mesh;
        nagelPunkte.name = "NagelPunkte";
        console.log("nagelPunkte", nagelPunkte.getVerticesData("position"));

        nagelPuzzleMoveableLoad.meshes[0].name = "NagelPuzzleMoveable";
        nagelPuzzleMoveableLoad.meshes[0].visibility = 0;
        console.log(nagelPuzzleMoveableLoad.meshes[0]);

        // Erstelle Kugelmesh
        const sphere2 = MeshBuilder.CreateSphere(
            "sphere",
            { diameter: 0.5 },
            scene
        );
        sphere2.position = new Vector3(-5,0,2);
        sphere2.visibility = 1;
  

        // Die URL der SDF-Datei
        const sdfFileUrl = 'https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.sdf';
        // Definiert in einer ausgelagerten Datei
        // Laded die SDF-Datei aus dem Internet und Parset diese in ein SDFData-Objekt
        const loadFile = loadSDFFile(sdfFileUrl);
        const sdfContent = parseSDFFileContent(await loadFile);
        // Sphere Test

        // Sphere2 Test (inside)
        // Point -> calculateLocalPoint -> index (-> index2)
        const calculatedPointinLocal2  = calculateLocalPoint(sphere2.absolutePosition, nagelPuzzleStatic)
        console.log("2: Spherelocation World: ", sphere2.absolutePosition, "2: Spherelocation Local: ", calculatedPointinLocal2)
        const temp2 = new Vector3(calculatedPointinLocal2.x, calculatedPointinLocal2.y, calculatedPointinLocal2.z * -1)
        const calculatedIndex2 = index(temp2, sdfContent);
        console.log("2: Index in SDF: ", calculatedIndex2)
        console.log("2: Distanze vom Punkt zum Mesh laut SDF: ", sdfContent.distances[calculatedIndex2])

        //Print SDF-Data
        console.log("SDF-Data: ", sdfContent);
        
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
        
        // Checke jeden Frame ob die Kugel im Nagel ist
        scene.onBeforeRenderObservable.add(() => {
            // Point -> calculateLocalPoint -> index (-> index2)
            const calculatedPointinLocal  = calculateLocalPoint(sphere2.absolutePosition, nagelPuzzleStatic)
            //console.log("Spherelocation World: ", sphere2.absolutePosition, "Spherelocation Local: ", calculatedPointinLocal)
            const temp = new Vector3(calculatedPointinLocal.x, calculatedPointinLocal.y, calculatedPointinLocal.z * -1)
            const calculatedIndex = index(temp, sdfContent);
            if (sdfContent.distances[calculatedIndex] < 0.5) {
                console.log("Kugel ist im Nagel")
                nagelPuzzleStatic.material = collisionMaterial;
            }
            else{
                console.log("Kugel ist nicht im Nagel")
                nagelPuzzleStatic.material = noCollisionMaterial;
            }
        }
        );


        return scene;
    };
}

export default new DefaultSceneWithTexture();

