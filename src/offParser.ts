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

export function parseOffFileContent(offContent: string): { vertices: Vector3[], normals: Vector3[] } {
    const lines = offContent.trim().split('\n');
    const vertices: Vector3[] = [];
    const normals: Vector3[] = [];
  
    // Zeile 1: OFF
    // Zeile 2: Anzahl der Vertices, Anzahl der Faces, Anzahl der Kanten (nicht benötigt)
  
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      const values = line.split(' ').map(parseFloat);
  
      if (values.length >= 3) {
        const vertex = Vector3.FromArray(values.slice(0, 3));
        vertices.push(vertex);
  
        if (values.length >= 6) {
          const normal = Vector3.FromArray(values.slice(3, 6));
          normals.push(normal);
        }
      }
    }
  
    return { vertices, normals };
  }