import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import "@babylonjs/core/Physics/physicsEngineComponent";
// Needed for .glb import support via SceneLoader
import "@babylonjs/loaders/glTF";
// If you don't need the standard material you will still need to import it since the scene requires it.
import "@babylonjs/core/Materials/standardMaterial";
import { CreateSceneClass } from "../createScene";
import { havokModule } from "../externals/havok";
import { PhysicsShapeBox, PhysicsShapeConvexHull, PhysicsShapeSphere } from "@babylonjs/core/Physics/v2/physicsShape";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { Color3, CreateBox, CreateIcoSphere, CreateTorus, SceneLoader, Sound, StandardMaterial } from "@babylonjs/core";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

// Meshes
import MoveablePiece from "../../assets/glb/AlphaPuzzleMoveablePiece.glb";

class Collisions implements CreateSceneClass {
    preTasks = [havokModule];

    // eslint-disable-next-line no-undef
    createScene = async (engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> => {
        // Boilerplate Code
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

        // MeshCreation Code
        // Our built-in 'sphere' shape.
        //const sphere = CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);

        // Move the sphere upward at 4 units
        //sphere.position.y = 4;
        // Sphere body
        //const sphereBody = new PhysicsBody(sphere, PhysicsMotionType.DYNAMIC, false, scene);
        // Set shape material properties
        //sphereShape.material = { friction: 0.2, restitution: 0.6 };
        // Associate shape and body
        //sphereBody.shape = sphereShape;
        // And body mass
        //sphereBody.setMassProperties({ mass: 1 });

        // Our built-in 'ground' shape.
        const ground = CreateGround("ground", { width: 10, height: 10 }, scene);
        
        // PHYSICS!
        const physicsPlugin = new HavokPlugin(true, await havokModule);
        scene.enablePhysics(null, physicsPlugin);
        // Create a sphere shape
        // const sphereShape = new PhysicsShapeSphere(new Vector3(0, 0, 0)
        //     , 1
        //     , scene);
    


        // Preparing Sounds for collisions
        const buzzer = new Sound("buzzer", "sounds/Buzzer.wav", scene);
        buzzer.play();

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

        // Settin up list for objects to check collisions with
        const objectsToCollideWith: Mesh[] = [];

        const icoSphere = CreateIcoSphere("icoSphere")
        icoSphere.position = new Vector3(0, 2, 0);
        icoSphere.showBoundingBox = true;
        objectsToCollideWith.push(icoSphere);

        const torusMesh = CreateTorus("torusMesh")
        torusMesh.position = new Vector3(0, 2, 3);
        torusMesh.showBoundingBox = true;
        objectsToCollideWith.push(torusMesh);

        const stick = CreateBox("stick", { width: 0.25, height: 2, depth: 0.25 }, scene);
        stick.position = new Vector3(0, 2, -3);
        stick.showBoundingBox = true;
        objectsToCollideWith.push(stick);

        // Detecting Collisions of Meshes with PhysicsBodys
        // Create Mesh
        const stickPhysic = CreateBox("stickPhysic", { width: 0.25, height: 2, depth: 0.25 }, scene);
        stickPhysic.position = new Vector3(0, 2, -6);
        stickPhysic.showBoundingBox = true;
        const stickPhysicBody = new PhysicsBody(stickPhysic, PhysicsMotionType.DYNAMIC, false, scene);
        // Set to Floating / disable Gravity for this object
        stickPhysicBody.setMassProperties({ mass: 0 });
        // Overwrite default shape to the shape of a single line of the mesh
        stickPhysicBody.shape = new PhysicsShapeBox(stickPhysic.absolutePosition, stickPhysic.absoluteRotationQuaternion, new Vector3(0.25, 2, 0.25), scene);

        const moveablePieceLoad = await SceneLoader.ImportMeshAsync("","", MoveablePiece, scene, undefined);
        // Casting Loadresult (ISceneLoaderAsyncResult) to Mesh for easier handling and enabling useage of updateFacetData()
        // [0] is the rootnode of the mesh (Empty Parent), [1] is the actual mesh)
        const moveablePiece = moveablePieceLoad.meshes[1] as Mesh;
        moveablePiece.scaling = new Vector3(0.02, 0.02, 0.02);
        //moveablePiece.position = new Vector3(0, 2, -9);
        // Physics boilerplate for moveablePiece, setting shape and linking
        const moveablePiecePhysicsShape = new PhysicsShapeConvexHull(moveablePiece, scene); 
        const moveablePiecePhysics = new PhysicsBody(moveablePiece, PhysicsMotionType.DYNAMIC, false, scene)
        
        moveablePiecePhysics.shape = moveablePiecePhysicsShape;
        // Physics Properties
        moveablePiecePhysics.setMassProperties({ mass: 0 });
        const toDraw = physicsPlugin.getBoundingBox(moveablePiecePhysicsShape);
        //toDraw.showBoundingBox = true;
        /**
         * Function to check for collisions between objectsToCollideWith and stickPhysic
         * where objectsToCollideWith is an array of Meshes, previously defined and filled with meshes which should be checked for collisions
         */
        function checkForCollision(){
            const currentlyColliding: Mesh[] = []
            for(let i = 0; i < objectsToCollideWith.length; i++){
                
                objectsToCollideWith.forEach((mesh) => {
                    if (objectsToCollideWith[i] != mesh && objectsToCollideWith[i].intersectsMesh(mesh, true)){
                            objectsToCollideWith[i].material = materialCollision
                            mesh.material = materialCollision
                            console.log(objectsToCollideWith[i].name, mesh.name)
                            currentlyColliding.push(objectsToCollideWith[i], mesh)
                        }

                    else{
                        // Currently not colliding with compared Mesh
                        // If Object has already collided with something, but not with the currently compared mesh, do not change color again
                        if (currentlyColliding.includes(objectsToCollideWith[i])){
                            null;
                        }
                        // If Object has not collided with anything, change color back to green (not anymore colliding)
                        else{
                            objectsToCollideWith[i].material = materialNoCollision
                        }
                        // Check if objectsToCollideWith[i] is no longer colliding with anything

                    }
                })
            }  
        }
        // Collision checking logic
        // Prepare materials for colorchange based on collision
        const materialCollision = new StandardMaterial("materialCollision", scene);
        materialCollision.diffuseColor = Color3.Red();

        const materialNoCollision = new StandardMaterial("materialNoCollision", scene);
        materialNoCollision.diffuseColor = Color3.Green();
        // if Object A collides with Object B, and A != B then play sound and change color
        
        scene.onBeforeRenderObservable.add(() => {
            checkForCollision();
        });


        // WebXR Code
        const options = {
            floorMeshes: [ground],
        }
        const xrHelper = await scene.createDefaultXRExperienceAsync(options);
        


        return scene;
    };
}

export default new Collisions();
