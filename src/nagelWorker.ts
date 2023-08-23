import { Matrix, Mesh, Vector3} from "@babylonjs/core";
import { SDFData, loadSDFFile, parseSDFFileContent} from "./sdfParser";
import { distanceToWorldpoint } from "./nagelDistanceField";
import { loadOffFile, parseOffFileContent } from "./offParser";

let sdfData: SDFData
let meshData: Mesh
let pointsData: Vector3


// Worker-Thread
/**
 * Nagel-Worker für die Kollisionserkennung
 * Erhält die Worldmatrix des Meshes und die Punkte des Meshes
 * 
 * Gibt die Distanz des Punktes zur SDF zurück, 
 * @param position
 * @returns Distanz des Punktes zur SDF
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
    // Kriege Mesh-Worldmatrix als Matrix
    const meshWorldMatrix = event.data[0];
    const newPositions = CalculatePoints(offInfo.vertices, meshWorldMatrix);
    const distance = CalculateDistance(newPositions, sdfContent);
    if (distance < 0.1) {
        self.postMessage(distance);
    }
    else {
        self.postMessage(1);
    }
});

//Funktionen

// Berechne die aktuelle Position der Punkte basirend auf der Worldmatrix des Meshes
function CalculatePoints(points: Vector3[], meshWorldMatrix: Matrix) {
    const newPositions: Vector3[] = [];
    points.forEach((point) => {
        newPositions.push(Vector3.TransformCoordinates(point, meshWorldMatrix));
    });
    return newPositions;
}
// Berechne die Distanz des Punktes zur SDF um zu prüfen ob Kollisionen vorliegen
function CalculateDistance(points: Vector3[], sdfData: SDFData): number {
    let lowestDistance = 1;
    points.forEach((point) => {
        const distance = distanceToWorldpoint(point, sdfData);
        if (distance < lowestDistance) {
            lowestDistance = distance;
        }
    })
    return lowestDistance;
}