import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3} from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { HemisphericLight, PBRMaterial } from "@babylonjs/core";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/loaders/glTF";
// If you don't need the standard material you will still need to import it since the scene requires it.
// import "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import grassTextureUrl from "../../assets/grass.jpg";

// Import Highlights / Overlays for CyrusMesh

// Impport Cyrus Mesh

import UVCylinder from "../../assets/glb/LowPoly.glb"

// Baked Textures
import bakedTexture from "../../assets/Overlay.png"


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

        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera("Camera", -1.85, 1.2, 50, Vector3.Zero(), scene);


        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
         const light = new HemisphericLight(
             "light",
             new Vector3(0, 1, 0),
             scene
         );

        // // Default intensity is 1. Let's dim the light a small amount
        // light.intensity = 0.7;





        // // Import Cyrus-Cylinder Mesh
        // const cyrusCylinder = await SceneLoader.ImportMeshAsync("","",cyrus_cylinder,scene,undefined,".glb",);
        // // const cyrusCylinder = await SceneLoader.ImportMeshAsync("","",alternative_cylinder ,scene,undefined,".glb",);
        //const cyrusCylinder = await SceneLoader.ImportMeshAsync("","",split3CyrusCylinder ,scene,undefined,".glb",);
        // [0] = Root
        // [1] = Backside
        // [2] = Bottom
        // [3] = Frontside
        // [4] = Top

        const cyrusCylinder = await SceneLoader.ImportMeshAsync("","", UVCylinder,scene,undefined,".glb",);
        // Cast Material to PRBMaterial
        const cyrusCylinderMaterial = cyrusCylinder.meshes[1].material as PBRMaterial;
        // Set Casted Material to Mesh
        cyrusCylinder.meshes[1].material = cyrusCylinderMaterial;

        // // Modifing cyrusCylinder mesh
        cyrusCylinder.meshes[0].position.y = 2; // Floating
        console.log("Material: ", cyrusCylinder.meshes[1].material )
        const altTexture = new Texture(bakedTexture, scene, false, false);
        const altMaterial = new PBRMaterial("altMaterial", scene);
        altMaterial.albedoTexture = altTexture;
        altMaterial.transparencyMode = 0;
        altMaterial.roughness = 0.5;
        //cyrusCylinder.meshes[1].material = altMaterial;
        cyrusCylinder.meshes[1].material.backFaceCulling = false;
        cyrusCylinderMaterial.albedoTexture = altTexture;

       



        //camera.setTarget(cyrusCylinder.meshes[0]);
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

        //const light = new DirectionalLight(
         //   "light",
         //   new Vector3(0, -1, 1),
         //   scene
        //);
        light.intensity = 0.5;
        //light.position.y = 10;

        //const shadowGenerator = new ShadowGenerator(512, light)
        //shadowGenerator.useBlurExponentialShadowMap = true;
        //shadowGenerator.blurScale = 2;
        //shadowGenerator.setDarkness(0.2);

        //shadowGenerator.getShadowMap()!.renderList!.push();
        const onPointerDown = function (evt: PointerEvent) {
            if (evt.button !== 0) {
				return;
			}
            const pick = scene.pick(scene.pointerX, scene.pointerY, )
            if (pick.hit){
                console.log(pick.getNormal(true))
            }
        }

        canvas.addEventListener("pointerdown", onPointerDown, false);

        return scene;
    };
}

export default new DefaultSceneWithTexture();
