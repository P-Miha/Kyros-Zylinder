import { Matrix, Mesh, Scene, Vector3} from "@babylonjs/core";
import { SDFData} from "./sdfParser";
import { distanceToWorldpoint } from "./nagelDistanceField";

let sdfData: SDFData
let meshData: Matrix
let deserializedPoint: Vector3


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
self.addEventListener("message", (event) => {
    //console.log("Worker hat Nachricht erhalten");
    // Splitte Nachricht in Typ und Daten
    const {type , data} = event.data;
    switch (type) {
        case "sdf":
            // Deserialisiere Daten
            const deserializedSDF = JSON.parse(data);
            sdfData = deserializedSDF;
            break;
        case "worldMatrix":
            // Matrixdaten sind in Float32Array gespeichert, daher muss diese wieder in Matrix umgewandelt werden
            const matrixData = new Float32Array(data)
            const matrix = Matrix.FromArray(matrixData); 
            meshData = matrix;
            break;
        case "point":
            // Deserialisiere Daten
            //console.log("Worker hat Punkt erhalten");
            let deserializedPoint = Vector3.FromArray(data)
                // Erstelle SDF Distanz Funktionscall und sende Ergebnis zurück
                //console.log("Worker berechnet Distanz");
                let result = distanceToWorldpoint(deserializedPoint, meshData, sdfData);
                //console.log("Aufruf von distanceToWorldpoint" , deserializedPoint, meshData, sdfData);
                //console.log(result)
                if (result === -1) {
                    //console.log("Worker hat Distanz -1");
                    break;
                } else{
                console.log("Worker hat Distanz " , result)
                self.postMessage({type: 'distanz', data: result});
            }
            break;
        }
    // Je nach Typ, speichere Daten in entsprechende Variable
    // Wenn alle Daten vorhanden sind, berechne Distanz und sende zurück (wird angenommen das der Punkt zuletzt gesendet wird)
    
});


