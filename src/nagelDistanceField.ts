import { SDFData } from "./sdfParser";


export function index2(x: number, y: number, z: number, resolution: number[]): number {
    return x + (resolution[0] * (y + (z * resolution[1])))
}

export function index(point: number[], bboxMin: number[], bboxMax: number[], cellSize: number, res: number[]): number{
    const o = bboxMin;
    if (!inBox(point, bboxMin, bboxMax)) {
        //console.log("Nicht in Box", point)
        return -1; // Nicht in BoundingBox, daher trivialer Fall
    }
    let calculatedPoint = [point[0] - o[0], point[1] - o[1], point[2] - o[2]];
    calculatedPoint = [calculatedPoint[0] / cellSize, calculatedPoint[1] / cellSize, calculatedPoint[2] / cellSize];
    const roundedPoint =[ // Runden auf nächste ganze Zahl
        Math.round(calculatedPoint[0]),
        Math.round(calculatedPoint[1]),
        Math.round(calculatedPoint[2])
];
    //return index2(calculatedPoint.x, calculatedPoint.y, calculatedPoint.z, sdfFile.res);
    return index2(roundedPoint[0], roundedPoint[1], roundedPoint[2], res);
}

export function number(x: number, y: number, z: number, sdfFile: SDFData): number[]{
    const o = sdfFile.bbox.min;
    return [(o[0] + x) * sdfFile.cellSize, (o[1] + y) * sdfFile.cellSize, (o[2] + z) * sdfFile.cellSize];
    //return o.add(new Vector3((x + 0.5) * sdfFile.cellSize, (y + 0.5) * sdfFile.cellSize, (z + 0.5) * sdfFile.cellSize));
}
/**
 * Ist im gegebenen Codeabschnitt aufgerufen, jedoch nicht dabei gewesen, daher selbst implementiert.
 * @param vector
 * @param bboxMin
 * @param bboxMax
 * @returns true, wenn Point: Vector3 in BoundingBox liegt, sonst false
 */
function inBox(vector: number[], bboxMin: number[], bboxMax: number[]): boolean{
    return vector[0] >= bboxMin[0] && vector[0] <= bboxMax[0] && vector[1] >= bboxMin[1] && vector[1] <= bboxMax[1] && vector[2] >= bboxMin[2] && vector[2] <= bboxMax[2];
}
/**
 *  Gegeben ein Punkt und ein Mesh, wird der Punkt in das lokale Koordinatensystem des Meshes transformiert,
 *  indem die WorldMatrix des Meshes invertiert wird und der Punkt mit der invertierten Matrix transformiert wird. 
 * @param point 
 * @param mesh 
 * @returns localpoint vom Mesh
 */

// export function calculateLocalPoint(point: Vector3, meshInvertedWorldMatrix: Matrix): Vector3 {
//     const localPoint = Vector3.TransformCoordinates(point, meshInvertedWorldMatrix);
//     return localPoint;
// }

// export function distanceToWorldpoint(point: Vector3, meshInvertedWorldMatrix: Matrix, sdfFile: SDFData): float {
//     let localPoint = new Vector3(0,0,0);
//     try{
//         const temppoint = new Vector3(point._x, point._y, point._z)
//         console.log("Point: ", temppoint.x)
//         const tempMatrix = meshInvertedWorldMatrix 
//         console.log("Eingabe : ", temppoint, tempMatrix)
//     const localPoint2 = Vector3.TransformCoordinates(temppoint, tempMatrix)
// }   catch (e) {
//     console.log("Fehler bei der Transformation des Punktes in das lokale Koordinatensystem des Meshes")
//     console.log(e)
// }
//     //console.log("localPoint: ", localPoint)
//     const indexofPoint = index(localPoint, sdfFile);
//     if (indexofPoint === -1) {
//         return -1;
//     }
//     return sdfFile.distances[indexofPoint];
// }   