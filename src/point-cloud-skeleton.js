/* global PCA */
/* exported PointCloudSkeleton */

class PointCloudSkeleton {
   /**
    * @public
    * @param {{vertices:number[], colors:number[]}} pointCloud
    * @returns {{vertices:number[], colors:number[]}}
    */
   static pointCloudSkeleton(pointCloud) {
      const downSampling = 0.75;

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

      console.log({ vertexCount: vertices.length });

      const initialeNeighborhoodSize =
         PointCloudSkeleton.getInitialNeighborhoodSize(vertices);
      console.log({ initialeNeighborhoodSize });

      let medians = [];
      let vertexIndexesToDelete = [];
      let branchPointCandidates = [];

      let neighborhoodSize = initialeNeighborhoodSize;
      let medianDrag = initialeNeighborhoodSize;

      while (vertices.length > 0) {
         console.log({
            neighborhoodSize: neighborhoodSize,
            medianDrag: medianDrag,
            vertexCount: vertices.length,
         });

         medians = [];
         vertexIndexesToDelete = [];
         branchPointCandidates = [];

         vertices.forEach((vertexA, indexA) => {
            /** @type {{x:number,y:number,z:number}[]} */
            const neighbors = [];

            vertices.forEach((vertexB) => {
               const distance = Math.sqrt(
                  Math.pow(vertexA.x - vertexB.x, 2) +
                     Math.pow(vertexA.y - vertexB.y, 2) +
                     Math.pow(vertexA.z - vertexB.z, 2)
               );

               if (distance < neighborhoodSize && distance > 0) {
                  neighbors.push(vertexB);
               }
            });

            if (neighbors.length > 0) {
               const anisotropicDegree =
                  PointCloudSkeleton.getAnisotropicDegree(neighbors);
               if (anisotropicDegree > 0.9) {
                  branchPointCandidates.push({
                     vertex: vertexA,
                     anisotropicDegree: anisotropicDegree,
                  });
                  vertexIndexesToDelete.push(indexA);
               } else {
                  medians.push(PointCloudSkeleton.getMedian(neighbors));
               }
            }
         });

         vertexIndexesToDelete.forEach((index) => {
            vertices.splice(index);
         });

         if (medians.length > 0) {
            vertices.forEach((vertex, index) => {
               /** @type {{x:number, y:number, z:number}} */
               let closestMedian;
               let closestDistance = Number.MAX_VALUE;

               medians.forEach((median) => {
                  const distance = Math.sqrt(
                     Math.pow(vertex.x - median.x, 2) +
                        Math.pow(vertex.y - median.y, 2) +
                        Math.pow(vertex.z - median.z, 2)
                  );
                  if (distance < closestDistance) {
                     closestMedian = median;
                     closestDistance = distance;
                  }
               });

               if (closestMedian && closestDistance) {
                  const dragDirection = {
                     x: (closestMedian.x - vertex.x) / closestDistance,
                     y: (closestMedian.y - vertex.y) / closestDistance,
                     z: (closestMedian.z - vertex.z) / closestDistance,
                  };

                  vertices[index].x += dragDirection.x * medianDrag;
                  vertices[index].y += dragDirection.y * medianDrag;
                  vertices[index].z += dragDirection.z * medianDrag;
               }
            });
         } else {
            console.warn("no medians");
         }

         neighborhoodSize += neighborhoodSize / 2;
         medianDrag += neighborhoodSize / 2;
      }

      const skeletonVertices = [];
      const skeletonColors = [];
      vertices.forEach((vertex) => {
         skeletonVertices.push(vertex.x, vertex.y, vertex.z);
         skeletonColors.push(1, 0, 0);
      });

      branchPointCandidates.forEach((vertex) => {
         skeletonVertices.push(vertex.x, vertex.y, vertex.z);
         skeletonColors.push(0, 1, 0);
      });

      return { vertices: skeletonVertices, colors: skeletonColors };
   }

   /**
    * @private
    * @param {{x:number, y:number,z:number}[]} vertices
    * @returns {{x:number, y:number,z:number}}
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

   static getAnisotropicDegree(vertices) {
      const verticesArray = [];
      vertices.forEach((vertex) => {
         verticesArray.push([vertex.x, vertex.y, vertex.z]);
      });

      const eigenvalues = [];
      PCA.getEigenVectors(verticesArray).forEach((eigenVector) => {
         eigenvalues.push(eigenVector.eigenvalue);
      });

      const sum = eigenvalues[0] + eigenvalues[1] + eigenvalues[2];
      if (sum === 0) return 0;

      return eigenvalues[0] / sum;
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
