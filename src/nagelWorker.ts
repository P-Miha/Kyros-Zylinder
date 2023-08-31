import { Matrix, Mesh, Quaternion, Vector3, float, int} from "@babylonjs/core";
import { SDFData, loadSDFFile, parseSDFFileContent} from "./sdfParser";
import { distanceToWorldpoint } from "./nagelDistanceField";
import { loadOffFile, parseOffFileContent } from "./offParser";
import { ccDelta, qqDelta } from "./contactForce";


// Worker-Thread
/**
 * Nagel-Worker für die Kollisionserkennung
 * Erhält Worldmatrix, Worldposition und oriantation des Meshes
 * Zieht Punkte und SDF von Internet bei erstellung des Workers
 * 
 * Berechnet die Distanz der Punkte zur SDF, und schickt gegebenfalls Delta-Werte zurück
 *  
 * @param position
 * @returns Delta-Werte
 */

// Setup and getting Files
const punkteInfo: Promise<string> = loadOffFile("https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.noff");
const offInfo = parseOffFileContent(await punkteInfo);

const sdfFileUrl = 'https://raw.githubusercontent.com/P-Miha/Kyros-Zylinder/master/assets/SDFInformation/Nagel1.sdf';
const loadFile = loadSDFFile(sdfFileUrl);

const sdfContent = parseSDFFileContent(await loadFile);

// OffInfo = Punkte auf beweglichem Objekt
// SDFContent = SDF Daten des statischen Objekts

//Listener für die Nachrichten
self.addEventListener("message", (event) => {
    // Kriege Input in Form:
    // [MeshWorldMatrix, WorldPosition, Orientation]
    const worldMatrixMoveable: Matrix = Matrix.FromArray(event.data[0]);
    const worldMatrixStatic: Matrix = Matrix.FromArray(event.data[1]);

    console.log("WorldMatrixMoveable: ", worldMatrixMoveable);
    const worldPositionMoveable = new Vector3(0, 0, 0);
    const orientationMoveable = new Quaternion(0, 0, 0, 0);
    const scalingMoveable = new Vector3(0, 0, 0);

    // decompose WorldMatrixStatic and updates given parameters
    worldMatrixMoveable.decompose(undefined, orientationMoveable, worldPositionMoveable);

    // decompose WorldMatrix
    const worldPositionStatic = new Vector3(0, 0, 0);
    const orientationStatic = new Quaternion(0, 0, 0, 0);
    const scalingStatic = new Vector3(0, 0, 0);

    worldMatrixStatic.decompose(scalingStatic, orientationStatic, worldPositionStatic);
    
    const newPositions = CalculatePoints(offInfo.vertices, worldMatrixMoveable);
    const newPositionsLocal = CalculateLocalPoints(newPositions, worldMatrixMoveable);
    const distanceResult = CalculateDistance(newPositionsLocal, sdfContent);

    const distance = distanceResult[0];
    const index = distanceResult[1];

    //Update Normalenvektor
    const normalVector = new Vector3(offInfo.normals[index].x, offInfo.normals[index].y, offInfo.normals[index].z);
    let transformedNormal = Vector3.TransformNormal(normalVector, worldMatrixMoveable);
    transformedNormal = transformedNormal.multiply(new Vector3(1, 1, 1));

    if (distance < 0.1) {
        console.log("Kollision");
        //self.postMessage(distance, index);
        // Distance kleiner gleich 0, daher Kollision
        // Berechne Delta
        const positionDelta = ccDelta(distance, sdfContent.bbox.min, sdfContent.bbox.max, 
            newPositions[index], transformedNormal, worldPositionMoveable);
        const orientationDelta = qqDelta(distance, sdfContent.bbox.min, sdfContent.bbox.max, 
            newPositions[index], worldPositionMoveable, transformedNormal, orientationMoveable);
        // Above should send the orientation of the moveable object 
        // Send Info back to Main Thread
        console.log("PositionDelta: ", positionDelta);
        console.log("OrientationDelta: ", orientationDelta);
        self.postMessage([positionDelta, orientationDelta]);
    }
});

//Funktionen
// Berechne die Punktposition wo diese im lokalen Koordinatensystem des Meshes liegen, basierend auf der Worldmatrix des Meshes
function CalculateLocalPoints(points: Vector3[], meshWorldMatrix: Matrix) {
    const newPositions: Vector3[] = [];
    const meshWorldMatrixInvert = meshWorldMatrix.invert();
    points.forEach((point) => {
        newPositions.push(Vector3.TransformCoordinates(point, meshWorldMatrixInvert));
    });
    return newPositions;
}

// Berechne die aktuelle Position der Punkte basierend auf der Worldmatrix des Meshes
function CalculatePoints(points: Vector3[], meshWorldMatrix: Matrix) {
    const newPositions: Vector3[] = [];
    points.forEach((point) => {
        newPositions.push(Vector3.TransformCoordinates(point, meshWorldMatrix));
    });
    return newPositions;
}
// Berechne die Distanz des Punktes zur SDF um zu prüfen ob Kollisionen vorliegen
function CalculateDistance(points: Vector3[], sdfData: SDFData) {
    let lowestDistance = 1;
    let pointIndex = 0;
    points.forEach((point) => {
        const distance = distanceToWorldpoint(point, sdfData);
        if (distance < lowestDistance) {
            lowestDistance = distance;
            pointIndex = points.indexOf(point);
        }
    });

    // return Distance , Index
    return [lowestDistance, pointIndex];
}
