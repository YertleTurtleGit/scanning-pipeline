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
   await loadInputImages();
   await calculateNormalMap();
   await calculateDepthMap();
}

/**
 * @returns {Promise<HTMLImageElement[]>}
 */
async function loadInputImages() {
   const imagePromises = [
      loadImage(PHOTOMETRIC_STEREO_IMAGE_000),
      loadImage(PHOTOMETRIC_STEREO_IMAGE_045),
      loadImage(PHOTOMETRIC_STEREO_IMAGE_090),
      loadImage(PHOTOMETRIC_STEREO_IMAGE_135),
      loadImage(PHOTOMETRIC_STEREO_IMAGE_180),
      loadImage(PHOTOMETRIC_STEREO_IMAGE_225),
      loadImage(PHOTOMETRIC_STEREO_IMAGE_270),
      loadImage(PHOTOMETRIC_STEREO_IMAGE_315),
   ];

   return await Promise.all(imagePromises);
}

/**
 * @param {HTMLImageElement} image
 * @returns {Promise<HTMLImageElement>}
 */
async function loadImage(image) {
   /**
    * @param {HTMLImageElement} image
    * @returns {boolean}
    */
   function isImageLoaded(image) {
      if (!image.complete || image.naturalWidth === 0) {
         return false;
      }
      return true;
   }

   if (isImageLoaded(image)) {
      return image;
   }

   return new Promise((resolve) => {
      setTimeout(() => {
         image.addEventListener("load", () => {
            resolve(image);
         });
      });
   });
}

function calculateNormalMapResolution() {
   const sizeFactor = Math.round(
      (NORMAL_MAP_IMAGE.width / PHOTOMETRIC_STEREO_IMAGE_000.naturalWidth) *
         100 +
         0.5
   );
   NORMAL_MAP_RESOLUTION_INPUT.value = String(sizeFactor);
   NORMAL_MAP_RESOLUTION_INPUT.min = String(sizeFactor);
}

function inputTypeChange() {
   if (INPUT_TYPE_SELECT.value === INPUT_TYPE.TEST) {
      FILE_BROWSE_INPUT.style.display = "none";
      setImagesToPhotometricStereoTest();
      calculateNormalAndDepthMap();
   } else if (INPUT_TYPE_SELECT.value === INPUT_TYPE.FILE) {
      setInputImagesSourceFiles(Array.from(FILE_BROWSE_INPUT.files));
      FILE_BROWSE_INPUT.style.display = "inherit";
      calculateNormalAndDepthMap();
   }
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

INPUT_TYPE_SELECT.addEventListener("change", inputTypeChange);
FILE_BROWSE_INPUT.addEventListener("change", () => {
   setInputImagesSourceFiles(Array.from(FILE_BROWSE_INPUT.files));
});

inputTypeChange();
//calculateNormalMapResolution();
