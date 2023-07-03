import { SDFData} from "./sdfParser";
import { index } from "./nagelDistanceField";

// Worker-Thread

let savedSDFData: SDFData;
let savedMatrix: Float32Array;

/**
 *  Transformiert einen Punkt von World-Koordinaten in lokale Koordinaten eines Meshes via seines gegebenen Float32Arrays (Worldmatrix-Array zu Float32Array)
 *  Nutzt number-Array, da Worker kein Zugriff auf Vector3 von BabylonJS hat [x,y,z] -> [0,1,2]
 * @param worldPoint 
 * @param localMatrixValues 
 * @returns localPoint
 */
function transformPoint(worldPoint: number[], localMatrixValues: Float32Array) {
  // Extrahiere die Komponenten der Matrix
  const m = localMatrixValues;

  // Berechne die Umrechnung auf lokale Koordinaten
  const localX = worldPoint[0] * m[0] + worldPoint[1] * m[1] + worldPoint[2] * m[2] + m[3];
  const localY = worldPoint[0] * m[4] + worldPoint[1] * m[5] + worldPoint[2] * m[6] + m[7];
  const localZ = worldPoint[0] * m[8] + worldPoint[1] * m[9] + worldPoint[2] * m[10] + m[11];

  // Erstelle und gib den Punkt in den lokalen Koordinaten zurück
  return [localX, localY, localZ];
}
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
self.onmessage = function(event) {
  const { type, data } = event.data;

  if (type ==='point' && savedSDFData && savedMatrix) {
    // console.log("Point: ", data)
    // console.log("Matrix: ", savedMatrix)
    // console.log("SDFData: ", savedSDFData)
    //const result = distanceToWorldpoint(data as Vector3, savedMatrix, savedSDFData);
    let localPoint = transformPoint(data, savedMatrix);
    // Check via SDF if the point is inside the mesh
    const indexResult = index(localPoint, savedSDFData.bbox.min, savedSDFData.bbox.max, savedSDFData.cellSize, savedSDFData.res);
    if (indexResult === -1) { // Send back -1 and don't calculate the distance
      self.postMessage(-1);
    } else{
      // Send the result back to the main thread
      self.postMessage(savedSDFData.distances[indexResult]);
      }

    
  }
  if (type === 'sdfContent') {
    savedSDFData = data as SDFData;
  }

  if (type === 'meshInvertedWorldMatrix') {
    savedMatrix = data as Float32Array;
  }

  // Perform calculations when a point comes in and SDFData and matrix are available
 
};
