import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SDFData} from "./sdfParser";
import { distanceToWorldpoint } from "./nagelDistanceField";

let sdfData: SDFData
let meshData: Matrix


// Worker-Thread
/**
 * Nagel-Worker für die Kollisionserkennung
 * Erhält die Position des zu prüfenden Punktes als Vector3 (Serialized)
 * Erhält die SDF Daten als SDFData (Serialized)
 * Erhält das Mesh's Worldmatrix als Matrix(invertiert) bzw Matrix zu Float32Array (non-Serialized)
 * 
 * Dabei muss jeder Input als eigene Message erfolgen, da wir am ende nur Punkte erhalten wollen
 * Damit muss auch am anfang(erste Anfrage nach Distanz) der Punkt die letzte Message sein um direkt die Distanz zurückzugeben
 * 
 * Gibt die Distanz des Punktes zur SDF zurück
 * @param position
 * @returns Distanz des Punktes zur SDF
 */
let savedSDFData: SDFData;
let savedMatrix: Matrix;

self.onmessage = function(event) {
  const { type, data } = event.data;

  if (type === 'sdfContent') {
    savedSDFData = data as SDFData;
    console.log("SDFData: ", savedSDFData);
  }

  if (type === 'meshInvertedWorldMatrix') {
    savedMatrix = data as Matrix;
    console.log("Matrix: ", savedMatrix);
  }

  // Perform calculations when a point comes in and SDFData and matrix are available
  if (type ==='point' && savedSDFData && savedMatrix) {
    console.log("Point: ", data)
    console.log("Matrix: ", savedMatrix)
    console.log("SDFData: ", savedSDFData)
    //const result = distanceToWorldpoint(data as Vector3, savedMatrix, savedSDFData);
    const localPoint = Vector3.TransformCoordinates(data as Vector3, savedMatrix);
    console.log("WORKER::::: Localpointcall: ", localPoint)
    // Send the result back to the main thread
    //self.postMessage(result);
  }
};
function transformPoint(worldPoint: Vector3, localMatrixValues: Float32Array) {
  // Extrahiere die Komponenten der Matrix
  const m = localMatrixValues;

  // Koordinaten des Punktes in World-Koordinaten
  const x = worldPoint.x;
  const y = worldPoint.y;
  const z = worldPoint.z;

  // Berechne die Umrechnung auf lokale Koordinaten
  const localX = x * m[0] + y * m[1] + z * m[2] + m[3];
  const localY = x * m[4] + y * m[5] + z * m[6] + m[7];
  const localZ = x * m[8] + y * m[9] + z * m[10] + m[11];

  // Erstelle und gib den Punkt in den lokalen Koordinaten zurück
  return { x: localX, y: localY, z: localZ };
} 