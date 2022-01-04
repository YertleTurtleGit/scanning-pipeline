/* exported PointCloudSkeleton */

class PointCloudSkeleton {
   /**
    * @public
    * @param {{vertices:number[], colors:number[]}} pointCloud
    * @returns {{vertices:number[], colors:number[]}}
    */
   static pointCloudSkeleton(pointCloud) {
      const downscaleFactor = 0.1;
      const vertices = pointCloud.vertices;

      const sampledVertices = [];
      for (let i = 0; i < vertices.length; i += 3) {
         if (Math.random() < downscaleFactor) {
            sampledVertices.push(
               vertices[i + 0],
               vertices[i + 1],
               vertices[i + 2]
            );
         }
      }

      const colors = new Array(sampledVertices.length).fill(1);

      const skeletonVertices = [];
      const skeletonColors = [];

      const maxDistanceThreshold = 20;

      for (
         let distanceThreshold = 0.5;
         distanceThreshold <= maxDistanceThreshold;
         distanceThreshold += 0.25
      ) {
         for (let i = 0; i < sampledVertices.length; i += 3) {
            const vertexA = {
               x: sampledVertices[i + 0],
               y: sampledVertices[i + 1],
               z: sampledVertices[i + 2],
            };
            const neighbors = [];

            for (let j = 0; j < sampledVertices.length; j += 3) {
               const vertexB = {
                  x: sampledVertices[j + 0],
                  y: sampledVertices[j + 1],
                  z: sampledVertices[j + 2],
               };
               const distance = Math.sqrt(
                  Math.pow(vertexA.x - vertexB.x, 2) +
                     Math.pow(vertexA.y - vertexB.y, 2) +
                     Math.pow(vertexA.z - vertexB.z, 2)
               );

               if (distance < distanceThreshold && j !== i) {
                  neighbors.push(vertexB);
               }
            }

            const median = { x: 0, y: 0, z: 0 };
            if (neighbors.length > 0) {
               neighbors.forEach((vertex) => {
                  median.x += vertex.x;
                  median.y += vertex.y;
                  median.z += vertex.z;
               });
               median.x /= neighbors.length;
               median.y /= neighbors.length;
               median.z /= neighbors.length;

               if (distanceThreshold === maxDistanceThreshold) {
                  skeletonVertices.push(median.x, median.y, median.z);
                  skeletonColors.push(1, 0, 0);
               }
            }
         }
         console.log(distanceThreshold);
      }

      sampledVertices.push(...skeletonVertices);
      colors.push(...skeletonColors);

      return { vertices: sampledVertices, colors: colors };
   }

   /**
    * @private
    * @deprecated
    */
   constructor() {}
}

// eslint-disable-next-line no-unused-vars
const pointCloudSkeleton = PointCloudSkeleton.pointCloudSkeleton;
