import { Vector3 } from "@babylonjs/core";

export async function loadOffFile(url: string): Promise<string> {
    try {
    const response = await fetch(url);
    const text = await response.text();
    return text;
    } catch (error) {
    console.error('Fehler beim Laden der Off-Datei:', error);
    throw error;
    }
}

export  function parseOffFileContent(offContent: string): Array<Vector3> {
    const lines = offContent.trim().split('\n');
    const data = new Array<Vector3>();
    // Überspringen von Zeilen 1 und 2
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        const values = line.split(' ').map(parseFloat);
        // Solange Daten vorhanden sind, diese in das Array einfügen
        if (values.length > 0) {
            data.push(Vector3.FromArray(values));
        }
    }
    return data
}