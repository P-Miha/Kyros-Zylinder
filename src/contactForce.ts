import { Matrix, Mesh, Quaternion, Vector3, Vector4, float } from "@babylonjs/core";
import { SDFData } from "./sdfParser";
import { calculateLocalPoint, index } from "./nagelDistanceField";

//DEBUG Konstante!
// Normalerweise 1
const cDeltaMultiplier = 1;

/**
 * Liefert das Ergebnis von einer Multiplikation von einer 3x3 Matrix und einem Vector3 (Matrix * Vector3)
 * Als Funktion implementiert, da Babylon nur Punkttransformationen aber nicht basic Matrix berechnung hat
 * @param matrix 
 * @param vector 
 * @returns vector3
 */
function multiplyMatrix3x3WithVector3(matrix: Matrix, vector: Vector3): Vector3 {
  const result = new Vector3();

  result.x = matrix.m[0] * vector.x + matrix.m[1] * vector.y + matrix.m[2] * vector.z;
  result.y = matrix.m[3] * vector.x + matrix.m[4] * vector.y + matrix.m[5] * vector.z;
  result.z = matrix.m[6] * vector.x + matrix.m[7] * vector.y + matrix.m[8] * vector.z;

  return result;    
}

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
    console.log("DEBUG: inertiaMatrix: ", Matrix.FromArray(values))

    return Matrix.FromArray(values);
}

export function calculateBoundingBoxDiagonalLength(minBox: Vector3, maxBox: Vector3): number {
    const diffX = maxBox.x - minBox.x;
    const diffY = maxBox.y - minBox.y;
    const diffZ = maxBox.z - minBox.z;
  
    const diagonalLength = Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ);
  
    return diagonalLength / 2;
  }

function lambda(movingMesh: Mesh, contactPoint: Vector3, normal: Vector3, distance: float, radius: float, mass: float){
    const vector =(contactPoint.cross(normal)).asArray()
    console.log("DEBUG: vector: ", vector)
    const firstMultp = [0, 0, 0]
    const matrix = invertedIneratiaMatrix(radius, mass).asArray()
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            firstMultp[i] += vector[j] * matrix[j * 3 + i];
        }
      }
    const result = (firstMultp[0] * vector[0] + firstMultp[1] * vector[1] + firstMultp[2] * vector[2])
    const lamda = (distance) / ((1 / mass) + result) 
    return lamda
}

export function cDelta(movingMesh: Mesh, contactPoint: Vector3, normal: Vector3, distance: float, radius: float, mass: float) : Vector3{
    const factor = ((1/mass)*lambda(movingMesh, contactPoint, normal, distance, radius, mass))
    return normal.multiply(new Vector3(factor, factor, factor))
}
export function localRadius(contactPoint: Vector3, rootPoint: Vector3, staticMesh: Mesh){
    const localContactPoint = calculateLocalPoint(contactPoint, staticMesh)
    const localRootPoint = calculateLocalPoint(rootPoint, staticMesh)
    return localContactPoint.subtract(localRootPoint)

}

export function lambdaAlt(minBox: Vector3, maxBox: Vector3, contactPoint: Vector3, normalVector: Vector3){
    // Diagonale Berechnen und ^2
    const g = Math.pow(maxBox.subtract(minBox).length(), 2) / 2
    // r ist der Abstand des Kontaktpunktes zum Schwerpunkts-mittelpunkt da wir vom Center als Schwerpunkt ausgehen ist der Vektor: R - Schwerpunkt, mit schwerpunkt = 0,0,0 => R
    const r = contactPoint
    // NormalenVektor muss umgedreht werden, da er momentan in Kollisionsrichtung zeigt
    // const n = normalVector.scale(-1)
    const n = new Vector3(normalVector.x, normalVector.y, normalVector.z)

    return (1 + (5 / (2 * g)) * Math.pow((r.cross(n)).length(), 2)) 
}
export function ccDelta(distance: float, minBox: Vector3, maxBox: Vector3, contactPoint: Vector3, rootPoint: Vector3, staticMesh: Mesh, normalVector: Vector3){
    const lambda = lambdaAlt(minBox, maxBox, contactPoint, normalVector)
    // return normalVector.scale(distance / (1 + (5 / (2 * Math.pow(calculateBoundingBoxDiagonalLength(minBox, maxBox), 2))) * Math.pow(((contactPoint.subtract(rootPoint)).cross(normalVector)).length(), 2)))
    // Wieder den normalVektor umdrehen
    // const n = normalVector.scale(-1)
    const n = new Vector3(normalVector.x, normalVector.y, normalVector.z)
    return (n.multiply(new Vector3(lambda, lambda, lambda))).multiply(new Vector3(cDeltaMultiplier, cDeltaMultiplier, cDeltaMultiplier))
}

export function qqDelta(distance: float, minBox: Vector3, maxBox: Vector3, contactPoint: Vector3, rootPoint: Vector3, staticMesh: Mesh, normalVector: Vector3, movingMesh: Mesh){
//     // 5 geteilt durch 2*radius^2 * lambda'
//    const constantPart = (5 / (2 * Math.pow(calculateBoundingBoxDiagonalLength(minBox, maxBox), 2)) * 
//                     distance / (1 + (5 / (2 * Math.pow(calculateBoundingBoxDiagonalLength(minBox, maxBox), 2))) * Math.pow(((contactPoint.subtract(rootPoint)).cross(normalVector)).length(), 2))) 
//    const wTimesT = (contactPoint.subtract(rootPoint)).cross(normalVector).scale(constantPart)
//    const tempQ = new Quaternion(wTimesT.x, wTimesT.y, wTimesT.z, 0)
//    const deltaQ = (tempQ.multiply(movingMesh.rotationQuaternion as Quaternion)).scale(1/2)
//    return deltaQ
    
    // Diagonale Berechnen und ^2
    const g = Math.pow(maxBox.subtract(minBox).length(), 2) / 2
    const RxN = contactPoint.cross(normalVector)
    const constantPart = 5/(2*g) * lambdaAlt(minBox, maxBox, contactPoint, normalVector)
    const wTimesDeltaT = RxN.multiply(new Vector3(constantPart, constantPart, constantPart))

    const q = movingMesh.rotationQuaternion as Quaternion // Momentane Orientierung
    // Skalare Komponente ist in Babylon anscheinend die letzte Komponente
    const wQuaternion = new Quaternion(wTimesDeltaT.x / 2, wTimesDeltaT.y / 2, wTimesDeltaT.z / 2, 0) // Durch 2 da * 1/2
    return wQuaternion.multiply(q)

}
export function qDelta(movingMesh: Mesh, contactPoint: Vector3, normal: Vector3, distance: float, radius: float, mass: float){
    const lambaTimesInverse = invertedIneratiaMatrix(radius, mass).scale(lambda(movingMesh, contactPoint, normal, distance, radius, mass))
    const radiusCrossNormal = contactPoint.cross(normal)
    const quaterionChange = multiplyMatrix3x3WithVector3(lambaTimesInverse, radiusCrossNormal).scale(1/2)
    // Momentanes Quaterion vom Mesh
    const currentQuaterion = movingMesh.rotationQuaternion as Quaternion
    const quaterionChangeCast = new Quaternion(quaterionChange.x, quaterionChange.y, quaterionChange.z, 0)
    // Mutliplikation von Quaterionen
    // Dabei Skalarkomponente ist hier die 4te Komponente, und 0 da wir von Vektor3 umwandeln
    const newQuaterion = currentQuaterion.multiply(quaterionChangeCast)

    //return (0, quaterionChange) 
    return newQuaterion
}