//@ts-check
"use strict";

async function calculateNormalMap() {
   NORMAL_MAP_AREA.classList.add("mainAreaLoading");
   DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   POINT_CLOUD_AREA.classList.add("mainAreaLoading");

   if (CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
      await NormalMapHelper.getPhotometricStereoNormalMap(
         Number(POLAR_ANGLE_DEG_INPUT.value),
         PHOTOMETRIC_STEREO_IMAGE_000,
         PHOTOMETRIC_STEREO_IMAGE_045,
         PHOTOMETRIC_STEREO_IMAGE_090,
         PHOTOMETRIC_STEREO_IMAGE_135,
         PHOTOMETRIC_STEREO_IMAGE_180,
         PHOTOMETRIC_STEREO_IMAGE_225,
         PHOTOMETRIC_STEREO_IMAGE_270,
         PHOTOMETRIC_STEREO_IMAGE_315,
         PHOTOMETRIC_STEREO_IMAGE_NONE,
         true,
         NORMAL_MAP_IMAGE,
         Number(NORMAL_MAP_RESOLUTION_INPUT.value)
      );
   } else if (
      CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.RAPID_GRADIENT
   ) {
      await NormalMapHelper.getRapidGradientNormalMap(
         RAPID_GRADIENT_IMAGE_000,
         RAPID_GRADIENT_IMAGE_090,
         RAPID_GRADIENT_IMAGE_180,
         RAPID_GRADIENT_IMAGE_270,
         RAPID_GRADIENT_IMAGE_ALL,
         RAPID_GRADIENT_IMAGE_FRONT,
         RAPID_GRADIENT_IMAGE_NONE,
         true,
         NORMAL_MAP_IMAGE,
         Number(NORMAL_MAP_RESOLUTION_INPUT.value)
      );
   }

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

   let imagePromises;

   if (CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
      PHOTOMETRIC_STEREO_IMAGE_AREA.style.display = "inherit";
      RAPID_GRADIENT_IMAGE_AREA.style.display = "none";

      imagePromises = [
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
   } else if (
      CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.RAPID_GRADIENT
   ) {
      PHOTOMETRIC_STEREO_IMAGE_AREA.style.display = "none";
      RAPID_GRADIENT_IMAGE_AREA.style.display = "inherit";

      imagePromises = [
         loadHTMLImage(RAPID_GRADIENT_IMAGE_000),
         loadHTMLImage(RAPID_GRADIENT_IMAGE_090),
         loadHTMLImage(RAPID_GRADIENT_IMAGE_180),
         loadHTMLImage(RAPID_GRADIENT_IMAGE_270),
         loadHTMLImage(RAPID_GRADIENT_IMAGE_ALL),
         loadHTMLImage(RAPID_GRADIENT_IMAGE_FRONT),
         loadHTMLImage(RAPID_GRADIENT_IMAGE_NONE),
      ];
   }

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

async function inputOrCalculationTypeChange() {
   WEBCAM_AREA.style.display = "none";
   FILE_BROWSE_INPUT.style.display = "none";
   WebcamDatasetHelper.purgeWebcamConnections();

   setInputImagesSourceFiles();

   if (INPUT_TYPE_SELECT.value === INPUT_TYPE.TEST) {
      if (
         CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.PHOTOMETRIC_STEREO
      ) {
         setImagesToPhotometricStereoTest();
      } else if (
         CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.RAPID_GRADIENT
      ) {
         setImagesToRapidGradientTest();
      }
   } else if (INPUT_TYPE_SELECT.value === INPUT_TYPE.FILE) {
      setInputImagesSourceFiles(Array.from(FILE_BROWSE_INPUT.files));
      FILE_BROWSE_INPUT.style.display = "inherit";
   } else if (INPUT_TYPE_SELECT.value === INPUT_TYPE.WEBCAM) {
      WEBCAM_AREA.style.display = "inherit";
      if (
         CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.PHOTOMETRIC_STEREO
      ) {
         setPhotometricStereoInputImages(
            await WebcamDatasetHelper.getPhotometricStereoDataset(
               WEBCAM_PREVIEW,
               WEBCAM_CAPTURE_BUTTON
            )
         );
      } else if (
         CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.RAPID_GRADIENT
      ) {
         setRapidGradientInputImages(
            await WebcamDatasetHelper.getRapidGradientDataset(
               WEBCAM_PREVIEW,
               WEBCAM_CAPTURE_BUTTON
            )
         );
      }
   }

   if (CALCULATION_TYPE_SELECT.value === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
      POLAR_ANGLE_DEG_INPUT.disabled = false;
   } else {
      POLAR_ANGLE_DEG_INPUT.disabled = true;
   }

   calculateEverything();
}

NORMAL_MAP_RESOLUTION_INPUT.addEventListener("change", calculateNormalMap);
NORMAL_MAP_RESOLUTION_INPUT.addEventListener("input", calculateNormalMap);

POLAR_ANGLE_DEG_INPUT.addEventListener("change", calculateNormalMap);
POLAR_ANGLE_DEG_INPUT.addEventListener("input", calculateNormalMap);

DEPTH_MAP_QUALITY_INPUT.addEventListener("change", calculateDepthMap);
DEPTH_MAP_QUALITY_INPUT.addEventListener("input", calculateDepthMap);

POINT_CLOUD_DEPTH_FACTOR_INPUT.addEventListener("change", calculatePointCloud);
POINT_CLOUD_DEPTH_FACTOR_INPUT.addEventListener("input", calculatePointCloud);

INPUT_TYPE_SELECT.addEventListener("change", inputOrCalculationTypeChange);
CALCULATION_TYPE_SELECT.addEventListener(
   "change",
   inputOrCalculationTypeChange
);
FILE_BROWSE_INPUT.addEventListener("change", () => {
   setInputImagesSourceFiles(Array.from(FILE_BROWSE_INPUT.files));
   calculateEverything();
});

inputOrCalculationTypeChange();
//calculateNormalMapResolution();
