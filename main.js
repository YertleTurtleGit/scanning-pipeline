//@ts-check
"use strict";

async function calculateNormalMap() {
   await NormalMapHelper.getPhotometricStereoNormalMap(
      PHOTOMETRIC_STEREO_IMAGE_000,
      PHOTOMETRIC_STEREO_IMAGE_045,
      PHOTOMETRIC_STEREO_IMAGE_090,
      PHOTOMETRIC_STEREO_IMAGE_135,
      PHOTOMETRIC_STEREO_IMAGE_180,
      PHOTOMETRIC_STEREO_IMAGE_225,
      PHOTOMETRIC_STEREO_IMAGE_270,
      PHOTOMETRIC_STEREO_IMAGE_315,
      35,
      true,
      NORMAL_MAP_IMAGE,
      Number(NORMAL_MAP_RESOLUTION_INPUT.value)
   );
}

async function calculateDepthMap() {
   await DepthMapHelper.getDepthMap(
      NORMAL_MAP_IMAGE,
      Number(DEPTH_MAP_QUALITY_INPUT.value),
      true,
      DEPTH_MAP_IMAGE
   );
}

async function calculateNormalAndDepthMap() {
   await calculateNormalMap();
   await calculateDepthMap();
}

//calculateNormalMapResolution();
calculateNormalAndDepthMap();

function calculateNormalMapResolution() {
   const sizeFactor = Math.round(
      (NORMAL_MAP_IMAGE.width / PHOTOMETRIC_STEREO_IMAGE_000.naturalWidth) *
         100 +
         0.5
   );
   NORMAL_MAP_RESOLUTION_INPUT.value = String(sizeFactor);
   NORMAL_MAP_RESOLUTION_INPUT.min = String(sizeFactor);
}

NORMAL_MAP_RESOLUTION_INPUT.addEventListener(
   "change",
   calculateNormalAndDepthMap
);
NORMAL_MAP_RESOLUTION_INPUT.addEventListener(
   "input",
   calculateNormalAndDepthMap
);

DEPTH_MAP_QUALITY_INPUT.addEventListener("change", calculateDepthMap);
DEPTH_MAP_QUALITY_INPUT.addEventListener("input", calculateDepthMap);
