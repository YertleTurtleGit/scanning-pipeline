//@ts-check
"use strict";

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

async function calculateDepthMap(normalMap) {
   const depthMap = await DepthMapHelper.getDepthMap(normalMap);
   DEPTH_MAP_IMAGE.src = depthMap.src;
   return depthMap;
}

async function calculate() {
   const normalMap = await calculateNormalMap();
   setTimeout(calculateDepthMap.bind(null, normalMap));
}

setTimeout(calculate);
