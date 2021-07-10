/* global DOM, DOM_ELEMENT, TYPE, NormalMapHelper, DepthMapHelper, PointCloudHelper, WebcamDatasetHelper */

/** */
async function calculateNormalMap() {
   NormalMapHelper.cancelRenderJobs();
   DepthMapHelper.cancelRenderJobs();
   PointCloudHelper.cancelRenderJobs();

   DOM_ELEMENT.NORMAL_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.display = "none";

   if (
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
      TYPE.CALCULATION_TYPE.PHOTOMETRIC_STEREO
   ) {
      await NormalMapHelper.getPhotometricStereoNormalMap(
         Number(DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.value),
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_000,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_045,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_090,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_135,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_180,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_225,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_270,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_315,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_NONE,
         DOM_ELEMENT.NORMAL_MAP_IMAGE,
         Number(DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.value),
         DOM_ELEMENT.INPUT_TYPE_SELECT.value === TYPE.INPUT_TYPE.WEBCAM,
         Number(DOM_ELEMENT.MASK_THRESHOLD_INPUT.value)
      );
   } else if (
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
      TYPE.CALCULATION_TYPE.RAPID_GRADIENT
   ) {
      await NormalMapHelper.getRapidGradientNormalMap(
         DOM_ELEMENT.RAPID_GRADIENT_IMAGE_000,
         DOM_ELEMENT.RAPID_GRADIENT_IMAGE_090,
         DOM_ELEMENT.RAPID_GRADIENT_IMAGE_180,
         DOM_ELEMENT.RAPID_GRADIENT_IMAGE_270,
         DOM_ELEMENT.RAPID_GRADIENT_IMAGE_ALL,
         DOM_ELEMENT.RAPID_GRADIENT_IMAGE_FRONT,
         DOM_ELEMENT.RAPID_GRADIENT_IMAGE_NONE,
         DOM_ELEMENT.NORMAL_MAP_IMAGE,
         Number(DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.value)
      );
   }

   DOM_ELEMENT.NORMAL_MAP_AREA.classList.remove("mainAreaLoading");
   await calculateDepthMap();
}

/** */
async function calculateDepthMap() {
   DepthMapHelper.cancelRenderJobs();
   PointCloudHelper.cancelRenderJobs();

   DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.display = "none";
   await DepthMapHelper.getDepthMap(
      DOM_ELEMENT.NORMAL_MAP_IMAGE,
      Number(DOM_ELEMENT.DEPTH_MAP_QUALITY_INPUT.value),
      DOM_ELEMENT.DEPTH_MAP_IMAGE
   );
   DOM_ELEMENT.DEPTH_MAP_AREA.classList.remove("mainAreaLoading");
   await calculatePointCloud();
}

/** */
async function calculatePointCloud() {
   PointCloudHelper.cancelRenderJobs();

   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.display = "none";
   await PointCloudHelper.calculatePointCloud(
      DOM_ELEMENT.DEPTH_MAP_IMAGE,
      DOM_ELEMENT.POINT_CLOUD_CANVAS,
      Number(DOM_ELEMENT.POINT_CLOUD_DEPTH_FACTOR_INPUT.value)
   );
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.remove("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.display = "inherit";
}

/** */
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
   DOM_ELEMENT.INPUT_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.NORMAL_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.display = "none";

   let imagePromises;

   if (
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
      TYPE.CALCULATION_TYPE.PHOTOMETRIC_STEREO
   ) {
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_AREA.style.display = "inherit";
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_AREA.style.display = "none";

      imagePromises = [
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_000),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_045),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_090),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_135),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_180),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_225),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_270),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_315),
         loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_NONE),
      ];
   } else if (
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
      TYPE.CALCULATION_TYPE.RAPID_GRADIENT
   ) {
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_AREA.style.display = "none";
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_AREA.style.display = "inherit";

      imagePromises = [
         loadHTMLImage(DOM_ELEMENT.RAPID_GRADIENT_IMAGE_000),
         loadHTMLImage(DOM_ELEMENT.RAPID_GRADIENT_IMAGE_090),
         loadHTMLImage(DOM_ELEMENT.RAPID_GRADIENT_IMAGE_180),
         loadHTMLImage(DOM_ELEMENT.RAPID_GRADIENT_IMAGE_270),
         loadHTMLImage(DOM_ELEMENT.RAPID_GRADIENT_IMAGE_ALL),
         loadHTMLImage(DOM_ELEMENT.RAPID_GRADIENT_IMAGE_FRONT),
         loadHTMLImage(DOM_ELEMENT.RAPID_GRADIENT_IMAGE_NONE),
      ];
   }

   const images = await Promise.all(imagePromises);
   DOM_ELEMENT.INPUT_AREA.classList.remove("mainAreaLoading");
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

/*function calculateNormalMapResolution() {
   const sizeFactor = Math.round(
      (NORMAL_MAP_IMAGE.width / PHOTOMETRIC_STEREO_IMAGE_000.naturalWidth) *
         100 +
         0.5
   );
   NORMAL_MAP_RESOLUTION_INPUT.value = String(sizeFactor);
   NORMAL_MAP_RESOLUTION_INPUT.min = String(sizeFactor);
}*/

/** */
async function inputOrCalculationTypeChange() {
   NormalMapHelper.cancelRenderJobs();
   DepthMapHelper.cancelRenderJobs();
   PointCloudHelper.cancelRenderJobs();

   DOM.setInputImagesSourceFiles();

   DOM_ELEMENT.NORMAL_MAP_AREA.classList.remove("mainAreaLoading");
   DOM_ELEMENT.DEPTH_MAP_AREA.classList.remove("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.remove("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.display = "none";

   DOM_ELEMENT.WEBCAM_AREA.style.display = "none";
   DOM_ELEMENT.FILE_BROWSE_INPUT.style.display = "none";

   if (DOM_ELEMENT.INPUT_TYPE_SELECT.value === TYPE.INPUT_TYPE.TEST) {
      if (
         DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
         TYPE.CALCULATION_TYPE.PHOTOMETRIC_STEREO
      ) {
         DOM.setImagesToPhotometricStereoTest();
      } else if (
         DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
         TYPE.CALCULATION_TYPE.RAPID_GRADIENT
      ) {
         DOM.setImagesToRapidGradientTest();
      }
   } else if (DOM_ELEMENT.INPUT_TYPE_SELECT.value === TYPE.INPUT_TYPE.FILE) {
      DOM_ELEMENT.FILE_BROWSE_INPUT.style.display = "inherit";
   } else if (DOM_ELEMENT.INPUT_TYPE_SELECT.value === TYPE.INPUT_TYPE.WEBCAM) {
      DOM_ELEMENT.WEBCAM_AREA.style.display = "inherit";
      if (
         DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
         TYPE.CALCULATION_TYPE.PHOTOMETRIC_STEREO
      ) {
         DOM.setPhotometricStereoInputImages(
            await WebcamDatasetHelper.getPhotometricStereoDataset(
               DOM_ELEMENT.WEBCAM_PREVIEW,
               DOM_ELEMENT.WEBCAM_CAPTURE_BUTTON
            )
         );
      } else if (
         DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
         TYPE.CALCULATION_TYPE.RAPID_GRADIENT
      ) {
         DOM.setRapidGradientInputImages(
            await WebcamDatasetHelper.getRapidGradientDataset(
               DOM_ELEMENT.WEBCAM_PREVIEW,
               DOM_ELEMENT.WEBCAM_CAPTURE_BUTTON
            )
         );
      }
   }

   if (
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.value ===
      TYPE.CALCULATION_TYPE.PHOTOMETRIC_STEREO
   ) {
      DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.disabled = false;
   } else {
      DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.disabled = true;
   }

   if (
      Math.min(
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_NONE.naturalWidth,
         DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_NONE.naturalHeight
      ) > 0
   ) {
      DOM_ELEMENT.MASK_THRESHOLD_INPUT.disabled = false;
   } else {
      DOM_ELEMENT.MASK_THRESHOLD_INPUT.disabled = true;
   }

   calculateEverything();
}

DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.addEventListener(
   "change",
   calculateNormalMap
);
DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.addEventListener(
   "input",
   calculateNormalMap
);
DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.addEventListener(
   "change",
   calculateNormalMap
);
DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.addEventListener("input", calculateNormalMap);
DOM_ELEMENT.MASK_THRESHOLD_INPUT.addEventListener("change", calculateNormalMap);
DOM_ELEMENT.MASK_THRESHOLD_INPUT.addEventListener("input", calculateNormalMap);

DOM_ELEMENT.DEPTH_MAP_QUALITY_INPUT.addEventListener(
   "change",
   calculateDepthMap
);
DOM_ELEMENT.DEPTH_MAP_QUALITY_INPUT.addEventListener(
   "input",
   calculateDepthMap
);

DOM_ELEMENT.POINT_CLOUD_DEPTH_FACTOR_INPUT.addEventListener(
   "change",
   calculatePointCloud
);
DOM_ELEMENT.POINT_CLOUD_DEPTH_FACTOR_INPUT.addEventListener(
   "input",
   calculatePointCloud
);

DOM_ELEMENT.INPUT_TYPE_SELECT.addEventListener(
   "change",
   inputOrCalculationTypeChange
);
DOM_ELEMENT.CALCULATION_TYPE_SELECT.addEventListener(
   "change",
   inputOrCalculationTypeChange
);
DOM_ELEMENT.FILE_BROWSE_INPUT.addEventListener("change", () => {
   DOM.setInputImagesSourceFiles(DOM_ELEMENT.FILE_BROWSE_INPUT.files);
   calculateEverything();
});

DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.addEventListener("click", async () => {
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "0";
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   await PointCloudHelper.downloadOBJ();
   setTimeout(() => {
      DOM_ELEMENT.POINT_CLOUD_AREA.classList.remove("mainAreaLoading");
      DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "1";
   }, 1000);
});

inputOrCalculationTypeChange();
//calculateNormalMapResolution();
