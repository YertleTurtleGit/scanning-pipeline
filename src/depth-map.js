/* global GLSL, scale, createImageArray, scaleImageArray, pyramidUp, pyramidDown */
/* exported depthMap */

////https://github.com/NewProggie/Uncalibrated-Photometric-Stereo/blob/master/src/main.cpp

/**
 * @global
 * @typedef {{x: number, y: number}} Pixel
 */
class DepthMapHelper {
   /**
    * This functions calculates a depth mapping by a given
    * normal mapping.
    *
    * @public
    * @param {ImageBitmap} normalMap The normal mapping
    * that is used to calculate the depth mapping.
    * @param {number} qualityPercent The quality in percent
    * defines how many anisotropic integrals are taken into
    * account to archive a higher quality depth mapping.
    * @returns {Promise<ImageBitmap>} A depth mapping
    * according to the input normal mapping.
    */
   static async depthMap(normalMap, qualityPercent) {
      const pyramidLevels = 4;
      const iterations = 700;

      /** @type {ImageBitmap[]} */
      const normalMapPyramid = [normalMap];
      for (let i = 0; i < pyramidLevels; i++) {
         normalMapPyramid.push(await pyramidDown(normalMapPyramid[i]));
      }

      let depthMap = await createImageBitmap(
         new ImageData(
            normalMapPyramid[pyramidLevels].width,
            normalMapPyramid[pyramidLevels].height
         )
      );

      for (let i = normalMapPyramid.length - 1; i > 0; i--) {
         console.log(
            "processing resolution: " +
               normalMapPyramid[i].width +
               " x " +
               normalMapPyramid[i].height
         );
         depthMap = await DepthMapHelper.updateHeights(
            normalMapPyramid[i],
            depthMap,
            iterations
         );

         depthMap = await pyramidUp(depthMap);
         console.log(
            "depth resolution: " + depthMap.width + " x " + depthMap.height
         );
      }

      return depthMap;
   }

   /**
    * @private
    * @param {ImageBitmap} normalMap
    * @param {ImageBitmap} depthMap
    * @param {number} iterations
    * @returns {Promise<ImageBitmap>}
    */
   static async updateHeights(normalMap, depthMap, iterations) {
      const Z = createImageArray(depthMap);
      const normals = createImageArray(normalMap);
      const bitDepth = 8;
      const maxValue = Math.pow(2, bitDepth) - 1;

      console.log(normalMap);
      console.log(depthMap);

      for (let i = 0; i < iterations; i++) {
         for (let x = 0; x < depthMap.width; x++) {
            for (let y = 0; y < depthMap.height; y++) {
               const indexC = x + y * depthMap.width;
               const indexU = indexC + depthMap.width;
               const indexD = indexC - depthMap.width;
               const indexL = indexC - 1;
               const indexR = indexC + 1;

               const colorIndexC = indexC * 4;
               const colorIndexU = indexU * 4;
               const colorIndexD = indexD * 4;
               const colorIndexL = indexL * 4;
               const colorIndexR = indexR * 4;

               const zU = Z[colorIndexU];
               const zD = Z[colorIndexD];
               const zL = Z[colorIndexL];
               const zR = Z[colorIndexR];

               const nxC = normals[colorIndexC + 0];
               const nyC = normals[colorIndexC + 1];
               const nxU = normals[colorIndexU + 0];
               const nyU = normals[colorIndexU + 1];
               const nxD = normals[colorIndexD + 0];
               const nyD = normals[colorIndexD + 1];
               const nxL = normals[colorIndexL + 0];
               const nyL = normals[colorIndexL + 1];
               const nxR = normals[colorIndexR + 0];
               const nyR = normals[colorIndexR + 1];

               const up = nxU == 0 && nyU == 0 ? 0 : 1;
               const down = nxD == 0 && nyD == 0 ? 0 : 1;
               const left = nxL == 0 && nyL == 0 ? 0 : 1;
               const right = nxR == 0 && nyR == 0 ? 0 : 1;

               if (up > 0 && down > 0 && left > 0 && right > 0) {
                  const depth =
                     (1 / 4) * (zD + zU + zR + zL + nxU - nxC + nyL - nyC);
                  Z[colorIndexC + 0] = depth;
                  Z[colorIndexC + 1] = depth;
                  Z[colorIndexC + 2] = depth;
                  Z[colorIndexC + 3] = maxValue;

                  /*Z[colorIndexC + 0] = (x / depthMap.width) * 255;
                  Z[colorIndexC + 1] = (y / depthMap.height) * 255;
                  Z[colorIndexC + 2] = 0;*/
               }
            }
         }
      }
      const imageData = new ImageData(depthMap.width, depthMap.height);
      imageData.data.set(Z, 0);
      return createImageBitmap(imageData);
   }

   /** @deprecated */
   constructor() {}
}

// @ts-ignore
// eslint-disable-next-line no-unused-vars
const depthMap = DepthMapHelper.depthMap;
