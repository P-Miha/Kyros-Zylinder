import { Vector3 } from "@babylonjs/core";

export async function loadSDFFile(url: string): Promise<string> {
    try {
    const response = await fetch(url);
    const text = await response.text();
    return text;
    } catch (error) {
    console.error('Fehler beim Laden der SDF-Datei:', error);
    throw error;
    }
}

export interface SDFData {
  // Vector3 ist nicht in Woker nutzbar, daher wechsel zu number[]
    bbox: {
      min: number[],
      max: number[]
    },
    cellSize: number,
    res: number[],
    numCells: number,
    distances: number[]
  }
  
  export  function parseSDFFileContent(sdfContent: string): SDFData {
    const lines = sdfContent.trim().split('\n');
    const data: SDFData = {
      bbox: {
        min: [],
        max: []
      },
      cellSize: 0,
      res: [],
      numCells: 0,
      distances: []
    };
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Kommentare ignorieren
      const commentIndex = line.indexOf('#');
      if (commentIndex !== -1) {
        // Nur den Teil der Zeile vor dem Kommentar extrahieren
        const cleanedLine = line.substring(0, commentIndex).trim();
        
        if (cleanedLine.length === 0) {
          continue;
        }
  
        const values = cleanedLine.split(' ').map(parseFloat);
        
        if (values.length > 0) {
          if (i === 0) {
            data.bbox.min.push(...values)
          } else if (i === 1) {
            data.bbox.max.push(...values)
          } else if (i === 2) {
            data.cellSize = values[0];
          } else if (i === 3) {
            data.res.push(...values);
          } else if (i === 4) {
            data.numCells = values[0];
          } else {
            data.distances.push(...values);
          }
        }
      } else {
        const values = line.split(' ').map(parseFloat);
        
        if (values.length > 0) {
          if (i === 0) {
            data.bbox.min.push(...values)
          } else if (i === 1) {
            data.bbox.max.push(...values)
          } else if (i === 2) {
            data.cellSize = values[0];
          } else if (i === 3) {
            data.res.push(...values)
          } else if (i === 4) {
            data.numCells = values[0];
          } else {
            data.distances.push(...values);
          }
        }
      }
    }
  
    return data;
  }