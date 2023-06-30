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
    const result = distanceToWorldpoint(data as Vector3, savedMatrix, savedSDFData);
    // Send the result back to the main thread
    self.postMessage(result);
  }
};
    // Je nach Typ, speichere Daten in entsprechende Variable
    // Wenn alle Daten vorhanden sind, berechne Distanz und sende zurück (wird angenommen das der Punkt zuletzt gesendet wird)
    


