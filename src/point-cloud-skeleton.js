/* exported PointCloudSkeleton */

class PointCloudSkeleton {
   /**
    * @public
    * @param {{vertices:number[], colors:number[]}} pointCloud
    * @returns {{vertices:number[], colors:number[]}}
    */
   static pointCloudSkeleton(pointCloud) {
      const vertices = pointCloud.vertices;
      const bounds = {
         x: { min: Number.MAX_VALUE, max: -Number.MAX_VALUE },
         y: { min: Number.MAX_VALUE, max: -Number.MAX_VALUE },
         z: { min: Number.MAX_VALUE, max: -Number.MAX_VALUE },
      };

      for (let i = 0; i < vertices.length; i += 3) {
         const x = vertices[i + 0];
         const y = vertices[i + 1];
         const z = vertices[i + 2];

         if (x < bounds.x.min) bounds.x.min = x;
         if (x > bounds.x.max) bounds.x.max = x;
         if (y < bounds.y.min) bounds.y.min = y;
         if (y > bounds.y.max) bounds.y.max = y;
         if (z < bounds.z.min) bounds.z.min = z;
         if (z > bounds.z.max) bounds.z.max = z;
      }

      const density = 


      console.log(bounds);

      const colors = new Array(vertices.length).fill(1);

      let skeletonVertices = vertices;

      let medians = [];

      for (
         let neighborhoodSize = 1;
         neighborhoodSize < 10;
         neighborhoodSize += 1
      ) {
         for (let medianDrag = 0.1; medianDrag < 0.5; medianDrag += 0.1) {
            medians = [];

            for (let i = 0; i < skeletonVertices.length; i += 3) {
               const vertexA = {
                  x: skeletonVertices[i + 0],
                  y: skeletonVertices[i + 1],
                  z: skeletonVertices[i + 2],
               };
               const neighbors = [];

               for (let j = 0; j < skeletonVertices.length; j += 3) {
                  const vertexB = {
                     x: skeletonVertices[j + 0],
                     y: skeletonVertices[j + 1],
                     z: skeletonVertices[j + 2],
                  };
                  const distance = Math.sqrt(
                     Math.pow(vertexA.x - vertexB.x, 2) +
                        Math.pow(vertexA.y - vertexB.y, 2) +
                        Math.pow(vertexA.z - vertexB.z, 2)
                  );

                  if (distance < neighborhoodSize && j !== i) {
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

                  medians.push(median);
               }
            }
            console.log({
               neighborhoodSize: neighborhoodSize,
               mediansCount: medians.length,
            });

            if (medians.length > 0) {
               for (let k = 0; k < skeletonVertices.length; k += 3) {
                  /** @type {{x:number, y:number, z:number}} */
                  let closestMedian;
                  let closestDistance = Number.MAX_VALUE;

                  medians.forEach((median) => {
                     const distance = Math.sqrt(
                        Math.pow(skeletonVertices[k + 0] - median.x, 2) +
                           Math.pow(skeletonVertices[k + 1] - median.y, 2) +
                           Math.pow(skeletonVertices[k + 2] - median.z, 2)
                     );
                     if (distance < closestDistance) {
                        closestMedian = median;
                        closestDistance = distance;
                     }
                  });

                  if (closestMedian && closestDistance) {
                     const dragDirection = {
                        x:
                           (closestMedian.x - skeletonVertices[k + 0]) /
                           closestDistance,
                        y:
                           (closestMedian.y - skeletonVertices[k + 1]) /
                           closestDistance,
                        z:
                           (closestMedian.z - skeletonVertices[k + 2]) /
                           closestDistance,
                     };

                     skeletonVertices[k + 0] +=
                        dragDirection.x * (medianDrag * closestDistance);
                     skeletonVertices[k + 1] +=
                        dragDirection.y * (medianDrag * closestDistance);
                     skeletonVertices[k + 2] +=
                        dragDirection.z * (medianDrag * closestDistance);
                  }
               }
            }
         }
      }

      const skeletonColors = [];
      for (let i = 0; i < skeletonVertices.length; i += 3) {
         skeletonColors.push(1, 0, 0);
      }

      return { vertices: skeletonVertices, colors: skeletonColors };
   }

   /**
    * @private
    * @deprecated
    */
   constructor() {}
}

// eslint-disable-next-line no-unused-vars
const pointCloudSkeleton = PointCloudSkeleton.pointCloudSkeleton;
