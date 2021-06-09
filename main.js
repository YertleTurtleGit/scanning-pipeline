//@ts-check
"use strict";

/**
 * @returns {Promise<HTMLImageElement>}
 */
async function calculateNormalMap() {
   const normalMap = await NormalMapHelper.getPhotometricStereoNormalMap(
      PHOTOMETRIC_STEREO_IMAGE_000,
      PHOTOMETRIC_STEREO_IMAGE_045,
      PHOTOMETRIC_STEREO_IMAGE_090,
      PHOTOMETRIC_STEREO_IMAGE_135,
      PHOTOMETRIC_STEREO_IMAGE_180,
      PHOTOMETRIC_STEREO_IMAGE_225,
      PHOTOMETRIC_STEREO_IMAGE_270,
      PHOTOMETRIC_STEREO_IMAGE_315,
      35
   );
   NORMAL_MAP_IMAGE.src = normalMap.src;
   return normalMap;
}

/**
 * @param {HTMLImageElement} normalMap
 * @returns {Promise<HTMLImageElement>}
 */
async function calculateDepthMap(normalMap) {
   return DepthMapHelper.getDepthMap(normalMap, 0.01, true, DEPTH_MAP_IMAGE);
}

async function calculate() {
   const normalMap = await calculateNormalMap();
   await calculateDepthMap(normalMap);
}

calculate();

NORMAL_MAP_RESOLUTION_INPUT.addEventListener("change", calculate);
// NORMAL_MAP_RESOLUTION_INPUT.addEventListener("input", calculate);
