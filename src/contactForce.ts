import { Matrix, Mesh, Quaternion, Vector3, Vector4, float } from "@babylonjs/core";
import { SDFData } from "./sdfParser";
import { calculateLocalPoint, index } from "./nagelDistanceField";

//DEBUG Konstante!
// Normalerweise 1
const cDeltaMultiplier = 1;
const scaling = 1;



/**
 * Berechnet die benötigte änderung in Position und Orientierung, um von einer überschneideten Kollision zu einer an der Oberfläche berührenden Kollision zu kommen.
 * Dabei wird der Kontaktpunkt der Kollision über den Gradienten bestimmt
 */
// export function distanceAndOriantationDelta(collisionPoint: Vector3, sdfFile: SDFData,){
//     // Bestimmte Kontaktpunkt durch Gradienten der Distanzwerte
//     const dDelta = new Vector3(
//         (sdfFile.distances[index(collisionPoint.add(new Vector3(sdfFile.cellSize, 0, 0)), sdfFile)] - sdfFile.distances[index(collisionPoint.subtract(new Vector3(sdfFile.cellSize, 0, 0)), sdfFile)]) / 2, 
//         (sdfFile.distances[index(collisionPoint.add(new Vector3(0, sdfFile.cellSize, 0)), sdfFile)] - sdfFile.distances[index(collisionPoint.subtract(new Vector3(0, sdfFile.cellSize, 0)), sdfFile)]) / 2,
//         (sdfFile.distances[index(collisionPoint.add(new Vector3(0, 0, sdfFile.cellSize)), sdfFile)] - sdfFile.distances[index(collisionPoint.subtract(new Vector3(0, 0, sdfFile.cellSize)), sdfFile)]) / 2);
//     const normalVector = dDelta.divide(new Vector3(dDelta.length(), dDelta.length(), dDelta.length()));

//     return normalVector;
// }
// export function inertiaMatrix(radius: float, mass: float): Matrix {
//     const inertia: float = (2 / 5) * mass * radius * radius;
//     const values = [inertia, 0, 0,
//                     0, inertia, 0,
//                     0, 0, inertia];
//     return Matrix.FromArray(values);
// }

// export function invertedIneratiaMatrix(radius: float, mass: float): Matrix {
//     const inertia: float = 5 /( 2 * mass * radius * radius);
//     const values = [inertia, 0, 0, 
//                     0, inertia, 0,
//                     0, 0, inertia];
//     console.log("DEBUG: inertiaMatrix: ", Matrix.FromArray(values))

//     return Matrix.FromArray(values);
// }

export function calculateBoundingBoxDiagonalLength(minBox: Vector3, maxBox: Vector3): number {
    const diffX = maxBox.x - minBox.x;
    const diffY = maxBox.y - minBox.y;
    const diffZ = maxBox.z - minBox.z;
  
    const diagonalLength = Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ);
  
    return diagonalLength / 2;
  }

export function localRadius(contactPoint: Vector3, rootPoint: Vector3, staticMesh: Mesh){
    const localContactPoint = calculateLocalPoint(contactPoint, staticMesh)
    const localRootPoint = calculateLocalPoint(rootPoint, staticMesh)
    return localContactPoint.subtract(localRootPoint)

}

export function lambdaAlt(minBox: Vector3, maxBox: Vector3, contactPoint: Vector3, normalVector: Vector3, distance: float, rootPoint: Vector3){
    // Diagonale Berechnen und ^2
    const g = (maxBox.subtract(minBox).length()) / 2
    // r ist der Abstand des Kontaktpunktes zum Schwerpunkts-mittelpunkt da wir vom Center als Schwerpunkt ausgehen ist der Vektor: R - Schwerpunkt, mit schwerpunkt = 0,0,0 => R
    const r = contactPoint.subtract(rootPoint)
    // NormalenVektor muss umgedreht werden, da er momentan in Kollisionsrichtung zeigt
    // const n = normalVector.scale(-1)
    const n = new Vector3(normalVector.x, normalVector.y, normalVector.z)

    return (distance * scaling) / (1 + (5 / (2 * Math.pow(g, 2))) * Math.pow((r.cross(n)).length(), 2)) 
}
export function ccDelta(distance: float, minBox: Vector3, maxBox: Vector3, contactPoint: Vector3, normalVector: Vector3, rootPoint: Vector3){
    const lambda = lambdaAlt(minBox, maxBox, contactPoint, normalVector, distance, rootPoint)
    // return normalVector.scale(distance / (1 + (5 / (2 * Math.pow(calculateBoundingBoxDiagonalLength(minBox, maxBox), 2))) * Math.pow(((contactPoint.subtract(rootPoint)).cross(normalVector)).length(), 2)))
    // Wieder den normalVektor umdrehen
    // const n = normalVector.scale(-1)
    const n = new Vector3(normalVector.x, normalVector.y, normalVector.z)
    // cDeltaMultiplier ist dafür da, um die Kraft beliebig zu Skalieren, Variable am Anfang dieser Datei. Damit kann man testweise nur 1/2 der "Kraft" anwenden oder das Doppelte
    return (n.multiply(new Vector3(lambda, lambda, lambda))).multiply(new Vector3(0.5, 0.5, 0.5))
}

export function qqDelta(distance: float, minBox: Vector3, maxBox: Vector3, contactPoint: Vector3, rootPoint: Vector3, staticMesh: Mesh, normalVector: Vector3, movingMesh: Mesh, quaternion: Quaternion){
//     // 5 geteilt durch 2*radius^2 * lambda'

    
    // Diagonale Berechnen und ^2
    const g = maxBox.subtract(minBox).length() / 2
    const R = contactPoint.subtract(rootPoint)
    const RxN = R.cross(normalVector)
    const constantPart = 5/(2*Math.pow(g, 2)) * lambdaAlt(minBox, maxBox, contactPoint, normalVector, distance, rootPoint)
    const wTimesDeltaT = RxN.multiply(new Vector3(constantPart, constantPart, constantPart))

    const q = quaternion // Momentane Orientierung
    // Skalare Komponente ist in Babylon anscheinend die letzte Komponente
    const wQuaternion = new Quaternion(wTimesDeltaT.x / 2, wTimesDeltaT.y / 2, wTimesDeltaT.z / 2, 0) // Durch 2 da * 1/2
    return wQuaternion.multiply(q)

}
