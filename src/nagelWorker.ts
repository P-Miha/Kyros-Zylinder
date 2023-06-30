import { Mesh, Vector3} from "@babylonjs/core";
import { SDFData} from "./sdfParser";
import { distanceToWorldpoint } from "./nagelDistanceField";

let sdfData: SDFData
let meshData: Mesh
let pointsData: Vector3


// Worker-Thread
/**
 * Nagel-Worker für die Kollisionserkennung
 * Erhält die Position des zu prüfenden Punktes als Vector3 (Serialized)
 * Erhält die SDF Daten als SDFData (Serialized)
 * Erhält das Mesh als Mesh (Serialized)
 * 
 * Dabei muss jeder Input als eigene Message erfolgen, da wir am ende nur Punkte erhalten wollen
 * Damit muss auch am anfang(erste Anfrage nach Distanz) der Punkt die letzte Message sein um direkt die Distanz zurückzugeben
 * 
 * Gibt die Distanz des Punktes zur SDF zurück
 * @param position
 * @returns Distanz des Punktes zur SDF
 */
self.addEventListener("message", (event) => {
    // Splitte Nachricht in Typ und Daten
    const {type , data} = event.data;
    const deserializedData = JSON.parse(data);
    // Je nach Typ, speichere Daten in entsprechende Variable
    // Wenn alle Daten vorhanden sind, berechne Distanz und sende zurück (wird angenommen das der Punkt zuletzt gesendet wird)
    switch (type) {
        case "sdf":
            sdfData = deserializedData;
            break;
        case "mesh":
            meshData = deserializedData;
            break;
        case "points":
            pointsData = new Vector3(deserializedData.x, deserializedData.y, deserializedData.z);
            if (sdfData != null && meshData != null && pointsData != null) {
                // Erstelle SDF Distanz Funktionscall und sende Ergebnis zurück
                const result = distanceToWorldpoint(pointsData, meshData, sdfData);
                self.postMessage({type: 'distanz', data: result});
            }
            break;
        }
});