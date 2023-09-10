import { int } from "@babylonjs/core";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SDFData } from "./sdfParser";


export function index2(x: int, y: int, z: int, resolution: Vector3): number {
    //console.log("Index " , x + resolution.x*(y + resolution.y*z))
    return x + resolution.x*(y + resolution.y*z)}

export function index(point: Vector3, bboxmin: Vector3, bboxmax: Vector3, cellSize: number, res: Vector3): number{
    const o = bboxmin;
    if (!inBox(point, bboxmin, bboxmax)) {
        return -1; // Nicht in BoundingBox, daher trivialer Fall
    }
    //console.log(" IN BOX: ", point)
    let calculatedPoint = point.subtract(o);
    calculatedPoint = calculatedPoint.divide(new Vector3(cellSize, cellSize, cellSize));
    const roundedPoint = new Vector3(
        Math.round(calculatedPoint.x),
        Math.round(calculatedPoint.y),
        Math.round(calculatedPoint.z)
        )
    // console.log("Berechneter Punkt ", calculatedPoint, " gerundet auf: " , roundedPoint)
    //return index2(calculatedPoint.x, calculatedPoint.y, calculatedPoint.z, sdfFile.res);
    return index2(roundedPoint.x, roundedPoint.y, roundedPoint.z, res);
}

export function pointFunction(x: int, y: int, z: int, sdfFile: SDFData): Vector3{
    const o = sdfFile.bbox.min;
    return o.add(new Vector3((x + 0.5) * sdfFile.cellSize, (y + 0.5) * sdfFile.cellSize, (z + 0.5) * sdfFile.cellSize));
}
/**
 * Ist im gegebenen Codeabschnitt aufgerufen, jedoch nicht dabei gewesen, daher selbst implementiert.
 * @param vector
 * @param bboxMin
 * @param bboxMax
 * @returns true, wenn Point: Vector3 in BoundingBox liegt, sonst false
 */
function inBox(vector: Vector3, bboxMin: Vector3, bboxMax: Vector3): boolean{
    return vector.x >= bboxMin.x && vector.y >= bboxMin.y && vector.z >= bboxMin.z && vector.x <= bboxMax.x && vector.y <= bboxMax.y && vector.z <= bboxMax.z;
}
export function inBoxCheck(vector: Vector3, bboxMin: Vector3, bboxMax: Vector3): boolean{
    return vector.x >= bboxMin.x && vector.y >= bboxMin.y && vector.z >= bboxMin.z && vector.x <= bboxMax.x && vector.y <= bboxMax.y && vector.z <= bboxMax.z;
}

/**
 *  Gegeben ein Punkt und ein Mesh, wird der Punkt in das lokale Koordinatensystem des Meshes transformiert,
 *  indem die WorldMatrix des Meshes invertiert wird und der Punkt mit der invertierten Matrix transformiert wird. 
 * @param point 
 * @param mesh 
 * @returns localpoint vom Mesh
 */
export function calculateLocalPoint(point: Vector3, mesh: Matrix): Vector3 {
    return Vector3.TransformCoordinates(point, mesh.invert());
}

export function distanceToWorldpoint(point: Vector3, bboxmin: Vector3, bboxmax: Vector3, cellSize: number, res: Vector3, mesh: Matrix): number {
    if(!inBox(point, bboxmin, bboxmax)){
        return -1;
    }
    const localPoint = calculateLocalPoint(point, mesh);
    const indexofPoint = index(localPoint, bboxmin, bboxmax, cellSize, res);
    if (indexofPoint === -1) {
        return -1;
    }
    return indexofPoint;
}   
