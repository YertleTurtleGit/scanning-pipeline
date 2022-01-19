/* global GLSL, FunctionWorker, sample */
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
      const normalMapPyramid = [];
      for (let i = 0; i < pyramidLevels; i++) {
         const pyramidLevelResolution = {
            width: normalMap.width / ((i + 1) * 2),
            height: normalMap.height / ((i + 1) * 2),
         };
         normalMapPyramid.push(await sample(normalMap, pyramidLevelResolution));
      }

      normalMapPyramid.forEach((pyramidLevel) => {
         DepthMapHelper.updateHeights(pyramidLevel);
      });
   }

   /**
    * @private
    * @param {ImageBitmap} normalMap
    * @param {*} z
    * @param {number} iterations
    */
   static updateHeights(normalMap, z, iterations) {
      for (let i = 0; i < iterations; i++) {
         const heightShader = new GLSL.Shader({
            height: normalMap.height,
            width: normalMap.width,
         });
         heightShader.bind();

         const glslNormalMap = new GLSL.Image(normalMap);
         const normalCurrent = glslNormalMap.getNeighborPixel(0, 0);
         const normalUp = glslNormalMap.getNeighborPixel(0, -1);
         const normalDown = glslNormalMap.getNeighborPixel(0, 1);
         const normalLeft = glslNormalMap.getNeighborPixel(-1, 0);
         const normalRight = glslNormalMap.getNeighborPixel(1, 0);

         heightShader.purge();
      }
   }

   /** @deprecated */
   constructor() {}
}

function onClose() {
   DepthMapHelper.functionWorkers.forEach((functionWorker) => {
      functionWorker.terminate();
   });
   self.close();
}

// @ts-ignore
// eslint-disable-next-line no-unused-vars
const depthMap = DepthMapHelper.depthMap;
