import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import "@babylonjs/core/Physics/physicsEngineComponent";
import "@babylonjs/loaders/glTF";
// If you don't need the standard material you will still need to import it since the scene requires it.
import "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";
import { havokModule } from "../externals/havok";
import { PhysicsShapeBox } from "@babylonjs/core/Physics/v2/physicsShape";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

// Import AlphaPuzzle Pieces
import MoveablePiece from "../../assets/glb/AlphaPuzzleMoveablePiece.glb";
import StaticPiece from "../../assets/glb/AlphaPuzzleStaticPiece.glb";
import {Color3, FloatArray, HighlightLayer, IndicesArray, Mesh, MeshBuilder, SceneLoader, StandardMaterial, VertexBuffer, float } from "@babylonjs/core";

class AlphaPuzzle implements CreateSceneClass {
    preTasks = [havokModule];

    createScene = async (engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);
         // Enable Inspector and Scene Exlporer
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
        // Inspector and Scene Explorer End

        // Generate both Meshes via Sceneloader
      
        // function generatePhysicsContainer(): PhysicsBody{
        //     // Placeholder for now
        //     return new PhysicsBody(ground, PhysicsMotionType.STATIC, false, scene);
        // }
        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 3, 10, new Vector3(0, 0, 0), scene);

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Our built-in 'ground' shape.
        const ground = CreateGround("ground", { width: 10, height: 10 }, scene);
        
        // PHYSICS!
        scene.enablePhysics(null, new HavokPlugin(true, await havokModule));

        // Create a static box shape
        const groundShape = new PhysicsShapeBox(new Vector3(0, 0, 0)
            , Quaternion.Identity()
            , new Vector3(10, 0.1, 10)
            , scene);

        // Create a body and attach it to the ground. Set it as Static.
        const groundBody = new PhysicsBody(ground, PhysicsMotionType.STATIC, false, scene);

        // Set material properties
        groundShape.material = { friction: 0.2, restitution: 0.8 };

        // Associate the body and the shape
        groundBody.shape = groundShape;

        // Set the mass to 0
        groundBody.setMassProperties({ mass: 0 });

        function importedMeshSettings(meshes: Mesh){
            // Preparing material for colouring
            const materialLightGreen = new StandardMaterial("material", scene);
            materialLightGreen.diffuseColor = new Color3(0.5, 1, 0.5);
            const materialLightGray = new StandardMaterial("material", scene);
            materialLightGray.diffuseColor = new Color3(0.5, 0.5, 0.5);

            // Setting Colour based in Childname (since Rootnode is in both called __root__)
            if (meshes.name === "moveable") {
                meshes.material = materialLightGreen;
            } else {
                meshes.material = materialLightGray;
            }
            // Setting Scaling for both meshes
            meshes.scaling = new Vector3(0.08, 0.08, 0.08);
            // Translating Mesh out of ground
            meshes.position = new Vector3(0, 2, 0);
            // Setting new Camera Focus
            const initCameraPosition = new Vector3(0, 0, 0);
            initCameraPosition.addInPlace(meshes.position);
            camera.setTarget(initCameraPosition);
        }
        function randomInt(min: number, max: number){
            return Math.floor(Math.random() * (max - min + 1)) + min;
         }
         
        /**
         * Generates small Meshboxes on multiple facets of the mesh, as a visual indicator / highlight
         * this SHOULD NOT be included in the final version, since it is only for debugging purposes and creates
         * a lot of overhead!
         * 
        */ 
        function createFacetHightlights(mesh: Mesh, percentage: float) {
            // Getting position of facets
            const facetPositions = mesh.getFacetLocalPositions();
            // Saving location for already used facet positions, to avoid duplicates at the same location
            const usedFacetNumbers: number[] = []
            let generatedBoxes = 0;
            // Preparing Material for Highlighting
            const materialHighlight = new StandardMaterial("material", scene);
            materialHighlight.diffuseColor = Color3.Yellow();
            console.log("Before for loop")
            while (generatedBoxes <= mesh.facetNb * percentage) {
                const randomIndex = randomInt(0, mesh.facetNb);
                if (randomIndex in usedFacetNumbers) {
                    console.log("in if Branch")
                    continue;
                } else {
                    //usedFacetNumbers.push(randomIndex)
                    console.log("in else Branch")
                    const box = MeshBuilder.CreateSphere("sphere", { diameter: 0.5 }, scene);
                    box.material = materialHighlight;
                    box.position = facetPositions[generatedBoxes];
                    box.parent = mesh;
                    generatedBoxes++;
                }
            }
        }
        /**
         * Function in order to find out if a given point is inside a facet of a mesh
         * where the facet is in form of a triangle.
         * 
         * @param p Point to check
         * @param a First point of triangle
         * @param b Second point of triangle
         * @param c Third point of triangle
         * dependend on (helper)functions: sign, dot, dot2, clamp
         * 
         * @return positive float if outside, negative float if inside
         * 
         * Math taken from https://iquilezles.org/articles/distfunctions/ and rewritten to work in typescript & babylonjs
         */
        function udTriangle(p: Vector3, a: Vector3, b: Vector3, c: Vector3 ){
            // Definitions and Vectorcombinations
            const ba: Vector3 = b.subtract(a); 
            const cb: Vector3 = c.subtract(b); 
            const ac: Vector3 = a.subtract(c); 
            const nor: Vector3 = ba.cross(ac);

            const pa: Vector3 = p.subtract(a);
            const pb: Vector3 = p.subtract(b);
            const pc: Vector3 = p.subtract(c);
            return Math.sqrt(
                (sign(dot(ba.cross(nor),pa)) +
                sign(dot(cb.cross(nor),pb)) +
                sign(dot(ac.cross(nor),pc)) < 2.0)
                ?
                Math.min( Math.min(
                dot2((ba.scale(clamp(dot(ba,pa)/dot2(ba),0.0,1.0))).subtract(pa)),
                dot2((cb.scale(clamp(dot(cb,pb)/dot2(cb),0.0,1.0))).subtract(pb))),
                dot2((ac.scale(clamp(dot(ac,pc)/dot2(ac),0.0,1.0))).subtract(pc)))
                :
                dot(nor,pa) * dot(nor,pa) / dot2(nor) );
        }

        /**
         * Helperfunctions to calculate the dotproduct of a vector with another vector
        */
        function dot(a: Vector3, b: Vector3){
            return a.x*b.x + a.y*b.y + a.z*b.z;
        }

        function dot2(a: Vector3){
            return dot(a,a);
        }

        /**
         * Helperfunctions to "extract the sign of the parameter" source-definition: https://registry.khronos.org/OpenGL-Refpages/gl4/html/sign.xhtml
         * own implementation in typescript, since the glsl function is not available in typescript
         * 
         * @param x float to check
         * @return -1 if x < 0, 0 if x == 0, 1 if x > 0
         */
        function sign(x: float){
            if (x < 0.0) {
                return -1;
            } else if (x == 0.0) {
                return 0;
            } else {
                return 1;
            }
        }
        function clamp(x: float, min: float, max: float){
            return Math.min(Math.max(x, min), max);
        }

        /**
         * Function to get the facet vertices in world coordinates in form of an Vector3 array
         * @param mesh
         * @return Vector3 array of facet vertices
         */
        function getFacetVertices(mesh: Mesh){
            const returnArray: Vector3[] = [];
            const vertexInfo = mesh.getVerticesData(VertexBuffer.PositionKind) as FloatArray;
            for (let i = 0; i < mesh.facetNb; i++) {
                returnArray.push(Vector3.FromArray(vertexInfo, i * 3));
            }
            return returnArray;
        }


        // Loading Meshes
        const moveablePieceLoad = await SceneLoader.ImportMeshAsync("","", MoveablePiece, scene, undefined);
        const staticPieceLoad = await SceneLoader.ImportMeshAsync("","", StaticPiece, scene, undefined, ".glb");
        // Casting Loadresult (ISceneLoaderAsyncResult) to Mesh for easier handling and enabling useage of updateFacetData()
        // [0] is the rootnode of the mesh (Empty Parent), [1] is the actual mesh
        const moveablePiece = moveablePieceLoad.meshes[1] as Mesh;
        const staticPiece = staticPieceLoad.meshes[1] as Mesh;
        importedMeshSettings(moveablePiece);
        importedMeshSettings(staticPiece);
        moveablePiece.updateFacetData();
        staticPiece.updateFacetData();
        // Creating Highlight Layer
        const hl = new HighlightLayer("hl1", scene);
        // Highlighting Current Debug Facet
        // hl.addMesh(moveablePiece, Color3.Green());

        //createFacetHightlights(moveablePiece, 0.99);

        // Saving Facets Coordinates of Staticpiece for later use
        //const staticPieceFacetCoordinates = staticPiece.getFacetPosition();
        const staticPieceIndices = staticPiece.getIndices() as IndicesArray;
        
        // Pre-Rendering, called once before the first frame
        const moveablePieceNbFacets = moveablePiece.facetNb;
        //console.log("Temp ", staticPositions);
        //console.log("facetNb ", staticPiece.facetNb);
        //console.log("indices ", staticPieceIndices?.length);
        // Getting all Facet Positions of the static piece
        const staticPieceFacetPositions = getFacetVertices(staticPiece);
        //console.log("staticFacetPositions ", staticPieceFacetPositions);

        // Placeholder, to be used to be overwritten per frame with the current position of the moving piece of the to be checked facet
        const currentFacetPosition = moveablePiece.getFacetPosition(0); 
        // Renderfunction, called every frame
        // scene.onBeforeRenderObservable.add(() => {
        //     // Get current position of facets of moveablePiece
        //     // Check if any of the points of the moving Piece is inside a facet of the static piece
        //     // Currently we "place" a point to check for collision at the center of each facet of the moving piece
        //      for(let i = 0; i < (moveablePieceNbFacets - 800); i++){
        //         // Check if the currently selected facet-middle is inside of one of the staticPiece facets
        //         moveablePiece.getFacetPositionToRef(i, currentFacetPosition);
        //         for (let j = 0; j < staticPiece.facetNb; j++){
        //             const staticIndex = staticPieceIndices[j * 3];
        //             if (udTriangle(currentFacetPosition, staticPieceFacetPositions[staticIndex], staticPieceFacetPositions[staticIndex + 1], staticPieceFacetPositions[staticIndex + 2]) < 0){
        //                 console.log("Collision");
        //             }
        //         }
        //      }
        // });
        
        return scene;
    };
}

export default new AlphaPuzzle();
