//@ts-check
"use strict";

async function calculateNormalMap() {
   NORMAL_MAP_AREA.classList.add("mainAreaLoading");
   DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   POINT_CLOUD_AREA.classList.add("mainAreaLoading");

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
      PHOTOMETRIC_STEREO_IMAGE_NONE,
      true,
      NORMAL_MAP_IMAGE,
      Number(NORMAL_MAP_RESOLUTION_INPUT.value)
   );
   NORMAL_MAP_AREA.classList.remove("mainAreaLoading");
   await calculateDepthMap();
}

async function calculateDepthMap() {
   DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   await DepthMapHelper.getDepthMap(
      NORMAL_MAP_IMAGE,
      Number(DEPTH_MAP_QUALITY_INPUT.value),
      true,
      DEPTH_MAP_IMAGE
   );
   DEPTH_MAP_AREA.classList.remove("mainAreaLoading");
   await calculatePointCloud();
}

async function calculatePointCloud() {
   POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   await PointCloudHelper.calculatePointCloud(
      DEPTH_MAP_IMAGE,
      POINT_CLOUD_CANVAS,
      Number(POINT_CLOUD_DEPTH_FACTOR_INPUT.value)
   );
   POINT_CLOUD_AREA.classList.remove("mainAreaLoading");
}

async function calculateEverything() {
   console.log("load images");
   await loadInputImages();
   console.log("images loaded");
   await calculateNormalMap();
}

/**
 * @returns {Promise<HTMLImageElement[]>}
 */
async function loadInputImages() {
   INPUT_AREA.classList.add("mainAreaLoading");
   NORMAL_MAP_AREA.classList.add("mainAreaLoading");
   DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   POINT_CLOUD_AREA.classList.add("mainAreaLoading");

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
   const images = await Promise.all(imagePromises);
   INPUT_AREA.classList.remove("mainAreaLoading");
   return images;
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

   calculateEverything();
}

NORMAL_MAP_RESOLUTION_INPUT.addEventListener("change", calculateNormalMap);
NORMAL_MAP_RESOLUTION_INPUT.addEventListener("input", calculateNormalMap);

DEPTH_MAP_QUALITY_INPUT.addEventListener("change", calculateDepthMap);
DEPTH_MAP_QUALITY_INPUT.addEventListener("input", calculateDepthMap);

POINT_CLOUD_DEPTH_FACTOR_INPUT.addEventListener("change", calculatePointCloud);
POINT_CLOUD_DEPTH_FACTOR_INPUT.addEventListener("input", calculatePointCloud);

INPUT_TYPE_SELECT.addEventListener("change", inputTypeChange);
FILE_BROWSE_INPUT.addEventListener("change", () => {
   setInputImagesSourceFiles(Array.from(FILE_BROWSE_INPUT.files));
});

inputTypeChange();
//calculateNormalMapResolution();
