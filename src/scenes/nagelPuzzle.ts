import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";

// If you don't need the standard material you will still need to import it since the scene requires it.
// import "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import grassTextureUrl from "../../assets/grass.jpg";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

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

        /**
         * Function to read information out of a given SDL file.
         * Read bbox.min, bbox.max, cellcize, res & numcells
         * 
         * @param  - LocalURL to the SDL file
         * @returns - Returns special Array in the form of [bbox.min, bbox.max, cellsize, res, numcells, [distances]]
         *          Where distances is an array of all distances in the SDL file, bbox.min is the minimum point of the bounding box, bbox.max is the maximum point of the bounding box, cellsize is the size of each cell, 
         *          res is the resolution of the SDL file, and numcells is the number of cells in the SDL file.
         *          bbox.min, bbox.max of type Vector3, cellsize of type float, res of type Vector3, numcells of type number, distances of type Array<float>
         * 
         */
        const readSDL = async (url: string) => {
            const response = await fetch(url);
            const data = await response.text();
            const lines = data.split("\n");
            const bbox = {
                min: new Vector3(0, 0, 0),
                max: new Vector3(0, 0, 0),
            };
            let cellsize = 0;
            const res = new Vector3(0, 0, 0);
            let numcells = 0;
            const distances: number[] = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith("bbox.min")) {
                    const values = line.split(" ");
                    bbox.min = new Vector3(
                        parseFloat(values[1]),
                        parseFloat(values[2]),
                        parseFloat(values[3])
                    );
                } else if (line.startsWith("bbox.max")) {
                    const values = line.split(" ");
                    bbox.max = new Vector3(
                        parseFloat(values[1]),
                        parseFloat(values[2]),
                        parseFloat(values[3])
                    );
                } else if (line.startsWith("cellsize")) {
                    const values = line.split(" ");
                    cellsize = parseFloat(values[1]);
                } else if (line.startsWith("res")) {
                    const values = line.split(" ");
                    res.x = parseFloat(values[1]);
                    res.y = parseFloat(values[2]);
                    res.z = parseFloat(values[3]);
                } else if (line.startsWith("numcells")) {
                    const values = line.split(" ");
                    numcells = parseFloat(values[1]);
                } else if (line.startsWith("distances")) {
                    const values = line.split(" ");
                    for (let j = 1; j < values.length; j++) {
                        distances.push(parseFloat(values[j]));
                    }
                }
            }
            return [bbox.min, bbox.max, cellsize, res, numcells, distances];
        };
        console.log(await readSDL("https://github.com/P-Miha/Kyros-Zylinder/blob/master/assets/SDFInformation/Nagel1.sdf"));


   

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

        return scene;
    };
}

export default new DefaultSceneWithTexture();

