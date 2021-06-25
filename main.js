//@ts-check
"use strict";

async function calculateNormalMap(polarAngleDeg = 35) {
   await NormalMapHelper.getPhotometricStereoNormalMap(
      PHOTOMETRIC_STEREO_IMAGE_000,
      PHOTOMETRIC_STEREO_IMAGE_045,
      PHOTOMETRIC_STEREO_IMAGE_090,
      PHOTOMETRIC_STEREO_IMAGE_135,
      PHOTOMETRIC_STEREO_IMAGE_180,
      PHOTOMETRIC_STEREO_IMAGE_225,
      PHOTOMETRIC_STEREO_IMAGE_270,
      PHOTOMETRIC_STEREO_IMAGE_315,
      polarAngleDeg,
      PHOTOMETRIC_STEREO_IMAGE_NONE,
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
   console.log("load images");
   await loadInputImages();
   console.log("images loaded");
   await calculateNormalMap();
   await calculateDepthMap();
}

/**
 * @returns {Promise<HTMLImageElement[]>}
 */
async function loadInputImages() {
   const imagePromises = [
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_000),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_045),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_090),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_135),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_180),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_225),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_270),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_315),
      loadHTMLImage(PHOTOMETRIC_STEREO_IMAGE_NONE),
   ];

   return await Promise.all(imagePromises);
}

/**
 * @param {HTMLImageElement} image
 * @returns {Promise<HTMLImageElement>}
 */
async function loadHTMLImage(image) {
   /**
    * @param {HTMLImageElement} image
    * @returns {boolean}
    */
   function isImageLoaded(image) {
      if (image.src.endsWith("null")) {
         return true;
      }
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

async function inputTypeChange() {
   WEBCAM_AREA.style.display = "none";
   FILE_BROWSE_INPUT.style.display = "none";
   WebcamDatasetHelper.purgeWebcamConnections();

   setInputImagesSourceFiles();

   if (INPUT_TYPE_SELECT.value === INPUT_TYPE.TEST) {
      setImagesToPhotometricStereoTest();
   } else if (INPUT_TYPE_SELECT.value === INPUT_TYPE.FILE) {
      setInputImagesSourceFiles(Array.from(FILE_BROWSE_INPUT.files));
      FILE_BROWSE_INPUT.style.display = "inherit";
   } else if (INPUT_TYPE_SELECT.value === INPUT_TYPE.WEBCAM) {
      WEBCAM_AREA.style.display = "inherit";
      setInputImages(
         await WebcamDatasetHelper.getPhotometricStereoDataset(
            WEBCAM_PREVIEW,
            WEBCAM_CAPTURE_BUTTON
         )
      );
   }

   calculateNormalAndDepthMap();
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
