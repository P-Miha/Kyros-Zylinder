import { Matrix, Mesh, Vector3, Vector4, float } from "@babylonjs/core";
import { SDFData } from "./sdfParser";
import { index } from "./nagelDistanceField";

/**
 * Berechnet die benötigte änderung in Position und Orientierung, um von einer überschneideten Kollision zu einer an der Oberfläche berührenden Kollision zu kommen.
 * Dabei wird der Kontaktpunkt der Kollision über den Gradienten bestimmt
 */
export function distanceAndOriantationDelta(collisionPoint: Vector3, sdfFile: SDFData,){
    // Bestimmte Kontaktpunkt durch Gradienten der Distanzwerte
    const dDelta = new Vector3(
        (sdfFile.distances[index(collisionPoint.add(new Vector3(sdfFile.cellSize, 0, 0)), sdfFile)] - sdfFile.distances[index(collisionPoint.subtract(new Vector3(sdfFile.cellSize, 0, 0)), sdfFile)]) / 2, 
        (sdfFile.distances[index(collisionPoint.add(new Vector3(0, sdfFile.cellSize, 0)), sdfFile)] - sdfFile.distances[index(collisionPoint.subtract(new Vector3(0, sdfFile.cellSize, 0)), sdfFile)]) / 2,
        (sdfFile.distances[index(collisionPoint.add(new Vector3(0, 0, sdfFile.cellSize)), sdfFile)] - sdfFile.distances[index(collisionPoint.subtract(new Vector3(0, 0, sdfFile.cellSize)), sdfFile)]) / 2);
    const normalVector = dDelta.divide(new Vector3(dDelta.length(), dDelta.length(), dDelta.length()));

    return normalVector;
}
export function inertiaMatrix(radius: float, mass: float): Matrix {
    const inertia: float = (2 / 5) * mass * radius * radius;
    const values = [inertia, 0, 0,
                    0, inertia, 0,
                    0, 0, inertia];

    return Matrix.FromArray(values);
}

export function invertedIneratiaMatrix(radius: float, mass: float): Matrix {
    const inertia: float = 5 /( 2 * mass * radius * radius);
    const values = [inertia, 0, 0,
                    0, inertia, 0,
                    0, 0, inertia];

    return Matrix.FromArray(values);
}

function lambda(movingMesh: Mesh, contactPoint: Vector3, normal: Vector3, distance: float, radius: float, mass: float){
    const vector =(contactPoint.cross(normal)).asArray()
    const firstMultp = [0, 0, 0]
    const matrix = invertedIneratiaMatrix(radius, mass).asArray()
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            firstMultp[i] += vector[j] * matrix[j * 3 + i];
        }
      }
    const result = (firstMultp[0] * vector[0] + firstMultp[1] * vector[1] + firstMultp[2] * vector[3])
      
    const lamda = (distance) / ((1 / mass) + result) 
    return lamda
}

