/* global PCA */
/* exported PointCloudSkeleton */

class PointCloudSkeleton {
   /**
    * @public
    * @param {{vertices:number[], colors:number[]}} pointCloud
    * @returns {{vertices:number[], colors:number[]}}
    */
   static pointCloudSkeleton(pointCloud) {
      const MAX_ITERATIONS = 5;

      const downSampling = 0.9;

      /** @type {{x:number, y:number, z:number}[]} */
      const vertices = [];

      /** @type {{x:number, y:number, z:number}[]} */
      const branchPoints = [];

      for (let i = 0, count = pointCloud.vertices.length; i < count; i += 3) {
         if (Math.random() > downSampling) {
            vertices.push({
               x: pointCloud.vertices[i + 0],
               y: pointCloud.vertices[i + 1],
               z: pointCloud.vertices[i + 2],
            });
         }
      }

      const initialNeighborhoodSize =
         PointCloudSkeleton.getInitialNeighborhoodSize(vertices);
      const initialMedianDrag = 0.5;

      let neighborhoodSize = initialNeighborhoodSize;
      let medianDrag = initialMedianDrag;

      let iteration = 0;

      while (iteration < MAX_ITERATIONS) {
         medianDrag = Math.abs(medianDrag);
         medianDrag = Math.min(medianDrag, 1);

         console.log({
            neighborhoodSize: neighborhoodSize,
            medianDrag: medianDrag,
            vertexCount: vertices.length,
            iteration: iteration,
         });
         iteration++;

         /** @type {{vertex:{x:number, y:number, z:number}, alignment:number, direction:{x:number, y:number, z:number}}[]} */
         const branchPointCandidates = [];
         let highestAlignmentVertex = {
            vertex: {},
            alignment: 0,
            direction: {},
         };

         vertices.forEach((vertexA, indexA) => {
            /** @type {{x:number, y:number, z:number}[]} */
            const neighbors = [];

            vertices.forEach((vertexB) => {
               const isInNeighborhoodCube =
                  vertexB.x > vertexA.x - neighborhoodSize &&
                  vertexB.x < vertexA.x + neighborhoodSize &&
                  vertexB.y > vertexA.y - neighborhoodSize &&
                  vertexB.y < vertexA.y + neighborhoodSize &&
                  vertexB.z > vertexA.z - neighborhoodSize &&
                  vertexB.z < vertexA.z + neighborhoodSize;

               if (isInNeighborhoodCube) {
                  const distance = Math.sqrt(
                     Math.pow(vertexA.x - vertexB.x, 2) +
                        Math.pow(vertexA.y - vertexB.y, 2) +
                        Math.pow(vertexA.z - vertexB.z, 2)
                  );
                  const isInNeighborhoodSphere = distance < neighborhoodSize;

                  if (isInNeighborhoodSphere && distance > 0) {
                     neighbors.push(vertexB);
                  }
               }
            });

            if (neighbors.length > 0) {
               const PCAs = PointCloudSkeleton.getPCAs(neighbors);
               const alignment = PCAs.alignment;
               const direction = PCAs.direction;

               if (alignment > 0.9) {
                  const degreeVertex = {
                     vertex: vertexA,
                     alignment: alignment,
                     direction: direction,
                  };
                  if (highestAlignmentVertex.alignment < alignment) {
                     highestAlignmentVertex = degreeVertex;
                  }
                  branchPointCandidates.push(degreeVertex);
               }

               const median = PointCloudSkeleton.getMedian(neighbors);

               const distanceToMedian = Math.sqrt(
                  Math.pow(vertexA.x - median.x, 2) +
                     Math.pow(vertexA.y - median.y, 2) +
                     Math.pow(vertexA.z - median.z, 2)
               );

               const dragDirection = {
                  x: (median.x - vertexA.x) / distanceToMedian,
                  y: (median.y - vertexA.y) / distanceToMedian,
                  z: (median.z - vertexA.z) / distanceToMedian,
               };

               vertices[indexA].x +=
                  dragDirection.x * (medianDrag / distanceToMedian);
               vertices[indexA].y +=
                  dragDirection.y * (medianDrag / distanceToMedian);
               vertices[indexA].z +=
                  dragDirection.z * (medianDrag / distanceToMedian);

               /** @type {{x:number, y:number, z:number}[]} */
               const branchCandidates = [
                  {
                     x: highestAlignmentVertex.vertex.x,
                     y: highestAlignmentVertex.vertex.y,
                     z: highestAlignmentVertex.vertex.z,
                  },
               ];

               branchPointCandidates.forEach((candidate) => {
                  if (
                     highestAlignmentVertex.vertex.x !== candidate.vertex.x ||
                     highestAlignmentVertex.vertex.y !== candidate.vertex.y ||
                     highestAlignmentVertex.vertex.z !== candidate.vertex.z
                  ) {
                     const angle = Math.cos(
                        highestAlignmentVertex.vertex.x * candidate.vertex.x +
                           highestAlignmentVertex.vertex.y *
                              candidate.vertex.y +
                           highestAlignmentVertex.vertex.z * candidate.vertex.z
                     );
                     if (angle < 1.5 && angle > -1.5) {
                        branchCandidates.push({
                           x: candidate.vertex.x,
                           y: candidate.vertex.y,
                           z: candidate.vertex.z,
                        });
                     }
                  }
               });

               if (branchCandidates.length >= 5) {
                  branchPoints.push(...branchCandidates);
               }
            }
         });

         neighborhoodSize += initialNeighborhoodSize / 2;
         //medianDrag += initialMedianDrag / 2;
      }

      console.log({ verticesLeft: vertices.length });

      const skeletonVertices = [];
      const skeletonColors = [];
      vertices.forEach((vertex) => {
         skeletonVertices.push(vertex.x, vertex.y, vertex.z);
         skeletonColors.push(1, 0, 0);
      });

      branchPoints.forEach((vertex) => {
         skeletonVertices.push(vertex.x, vertex.y, vertex.z);
         skeletonColors.push(0, 1, 0);
      });

      return { vertices: skeletonVertices, colors: skeletonColors };
   }

   /**
    * @private
    * @param {{x:number, y:number,z:number}[]} vertices
    * @returns {{x:number, y:number, z:number}}
    */
   static getMedian(vertices) {
      // TODO Median not average.

      const average = { x: 0, y: 0, z: 0 };

      vertices.forEach((vertex) => {
         average.x += vertex.x;
         average.y += vertex.y;
         average.z += vertex.z;
      });

      average.x /= vertices.length;
      average.y /= vertices.length;
      average.z /= vertices.length;

      return average;
   }

   /**
    * @private
    * @param {{x:number, y:number, z:number}[]} vertices
    * @returns {{alignment: number, direction:{x:number, y:number, z:number}}}
    */
   static getPCAs(vertices) {
      const verticesArray = [];
      vertices.forEach((vertex) => {
         verticesArray.push([vertex.x, vertex.y, vertex.z]);
      });

      const eigenvalues = [];
      // @ts-ignore
      const eigenVectors = PCA.getEigenVectors(verticesArray);
      eigenVectors.forEach((eigenVector) => {
         eigenvalues.push(eigenVector.eigenvalue);
      });

      const sum = eigenvalues[0] + eigenvalues[1] + eigenvalues[2];
      let alignment = 0;
      if (sum !== 0) alignment = eigenvalues[0] / sum;

      const direction = {
         x: (eigenVectors[0][0] + eigenVectors[1][0] + eigenVectors[2][0]) / 3,
         y: (eigenVectors[0][1] + eigenVectors[1][1] + eigenVectors[2][1]) / 3,
         z: (eigenVectors[0][2] + eigenVectors[1][2] + eigenVectors[2][2]) / 3,
      };

      return { alignment: alignment, direction: direction };
   }

   /**
    * @private
    * @param {{x:number, y:number,z:number}[]} vertices
    * @returns {number}
    */
   static getInitialNeighborhoodSize(vertices) {
      const boundingBox = {
         x: { min: Number.MAX_VALUE, max: -Number.MAX_VALUE },
         y: { min: Number.MAX_VALUE, max: -Number.MAX_VALUE },
         z: { min: Number.MAX_VALUE, max: -Number.MAX_VALUE },
      };

      vertices.forEach((vertex) => {
         if (vertex.x < boundingBox.x.min) boundingBox.x.min = vertex.x;
         if (vertex.x > boundingBox.x.max) boundingBox.x.max = vertex.x;

         if (vertex.y < boundingBox.y.min) boundingBox.y.min = vertex.y;
         if (vertex.y > boundingBox.y.max) boundingBox.y.max = vertex.y;

         if (vertex.z < boundingBox.z.min) boundingBox.z.min = vertex.z;
         if (vertex.z > boundingBox.z.max) boundingBox.z.max = vertex.z;
      });

      const diagonal = {
         x: boundingBox.x.min - boundingBox.x.max,
         y: boundingBox.y.min - boundingBox.x.max,
         z: boundingBox.z.min - boundingBox.x.max,
      };
      const diagonalLength = Math.sqrt(
         Math.pow(diagonal.x, 2) +
            Math.pow(diagonal.y, 2) +
            Math.pow(diagonal.z, 2)
      );

      return (2 * diagonalLength) / Math.pow(Math.abs(vertices.length), 1 / 3);
   }

   /**
    * @private
    * @deprecated
    */
   constructor() {}
}

// eslint-disable-next-line no-unused-vars
const pointCloudSkeleton = PointCloudSkeleton.pointCloudSkeleton;
