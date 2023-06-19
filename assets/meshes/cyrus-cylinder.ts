import { AbstractMesh, BaseTexture, Color3, ISceneLoaderAsyncResult, Mesh, MeshBuilder, Nullable, PBRMaterial, Scene, SceneLoader, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";

import bakedTexture from "../../assets/Overlay.png"
import UVCylinder from "../../assets/glb/LowPoly.glb"

class cyrusCylinder {
    cylinderMesh!: AbstractMesh;
    overlayTexture: Texture;
    cylinderOriginalTexture!: Nullable<BaseTexture>;
    activeOverlay: boolean;
    cylinderMeshMaterial: PBRMaterial;
    public constructor(scene: Scene){
        this.setup(scene);
        //this.settings();
        this.cylinderMesh;
        this.cylinderOriginalTexture;
        this.cylinderMeshMaterial = this.cylinderMesh.material as PBRMaterial;
        this.overlayTexture = new Texture(bakedTexture, scene);
        this.activeOverlay = false;
    }
    
    public async setup(scene: Scene){
        const cyrusCylinder = await SceneLoader.ImportMeshAsync("","", UVCylinder,scene,undefined,".glb",);
        this.cylinderMesh = cyrusCylinder.meshes[1];
        // Cast Material to PRBMaterial
        const cyrusCylinderMaterial = cyrusCylinder.meshes[1].material as PBRMaterial;
        // Set Casted Material to Mesh
        this.cylinderMesh.material = cyrusCylinderMaterial;
        this.cylinderOriginalTexture = cyrusCylinderMaterial.albedoTexture;
    }

    public activateOverlay(bool: boolean){
        const cyrusCylinderMaterial = this.cylinderMesh.material as PBRMaterial;
        switch(bool){ 
            case true:
                cyrusCylinderMaterial.albedoTexture = this.overlayTexture;
                break;
            case false:
                cyrusCylinderMaterial.albedoTexture = this.cylinderOriginalTexture;
        }
    }
    // public settings(){

    // 
    public getCylinderMesh(){
        return this.cylinderMesh;
    }

}