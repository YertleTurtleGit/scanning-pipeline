/* global DOM, DOM_ELEMENT, INPUT_TYPE, CALCULATION_TYPE 
NormalMapHelper, DepthMapHelper, PointCloudHelper, WebcamDatasetHelper, VirtualInputRenderer */

/** */
async function calculateNormalMap() {
   NormalMapHelper.cancelRenderJobs();
   DepthMapHelper.cancelRenderJobs();
   PointCloudHelper.cancelRenderJobs();

   DOM_ELEMENT.NORMAL_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "0";

   DOM_ELEMENT.NORMAL_MAP_UPLOAD_BUTTON.style.transform =
      "translate(-100%, -150%) rotate(180deg)";

   if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
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
         DOM.getInputType() === INPUT_TYPE.WEBCAM,
         Number(DOM_ELEMENT.MASK_THRESHOLD_INPUT.value)
      );
   } else if (
      DOM.getCalculationType() === CALCULATION_TYPE.SPHERICAL_GRADIENT
   ) {
      await NormalMapHelper.getSphericalGradientNormalMap(
         DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_000,
         DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_090,
         DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_180,
         DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_270,
         DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_ALL,
         DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_FRONT,
         DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_NONE,
         DOM_ELEMENT.NORMAL_MAP_IMAGE,
         Number(DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.value)
      );
   }

   DOM_ELEMENT.NORMAL_MAP_UPLOAD_BUTTON.style.transform =
      "translate(0%, -150%) rotate(180deg)";
   DOM_ELEMENT.NORMAL_MAP_AREA.classList.remove("mainAreaLoading");
   await calculateDepthMap();
}

/** */
async function calculateDepthMap() {
   DepthMapHelper.cancelRenderJobs();
   PointCloudHelper.cancelRenderJobs();

   DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "0";
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
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "0";
   await PointCloudHelper.calculatePointCloud(
      DOM_ELEMENT.DEPTH_MAP_IMAGE,
      DOM_ELEMENT.POINT_CLOUD_CANVAS,
      Number(DOM_ELEMENT.POINT_CLOUD_DEPTH_FACTOR_INPUT.value)
   );
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.remove("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "1";
}

/** */
async function calculateEverything() {
   console.log("load images");
   const allRequiredInputImagesDefined = await loadInputImages();

   if (allRequiredInputImagesDefined) {
      console.log("images loaded");
      await calculateNormalMap();
   } else {
      DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "1";
      console.log("images not loaded");
   }
}

/**
 * @returns {Promise<boolean>} allRequiredInputImagesDefined
 */
async function loadInputImages() {
   DOM_ELEMENT.INPUT_AREA.classList.add("mainAreaLoading");

   let imagePromises;
   let allRequiredInputImagesDefined = true;
   const requiredImageIndices = [];

   if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_AREA.style.display = "inherit";
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_AREA.style.display = "none";

      imagePromises = [
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_000),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_045),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_090),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_135),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_180),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_225),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_270),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_315),
         DOM.loadHTMLImage(DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_NONE),
      ];
      requiredImageIndices.push(0, 1, 2, 3, 4, 5, 6, 7);
   } else if (
      DOM.getCalculationType() === CALCULATION_TYPE.SPHERICAL_GRADIENT
   ) {
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_AREA.style.display = "none";
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_AREA.style.display = "inherit";

      imagePromises = [
         DOM.loadHTMLImage(DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_000),
         DOM.loadHTMLImage(DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_090),
         DOM.loadHTMLImage(DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_180),
         DOM.loadHTMLImage(DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_270),
         DOM.loadHTMLImage(DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_ALL),
         DOM.loadHTMLImage(DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_FRONT),
         DOM.loadHTMLImage(DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_NONE),
      ];
      requiredImageIndices.push(0, 1, 2, 3, 4, 5);
   }

   const images = await Promise.all(imagePromises);
   requiredImageIndices.forEach((index) => {
      if (!images[index]) {
         allRequiredInputImagesDefined = false;
         return;
      }
   });

   if (allRequiredInputImagesDefined) {
      DOM_ELEMENT.NORMAL_MAP_AREA.classList.add("mainAreaLoading");
      DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
      DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
      DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "1";
   }
   DOM_ELEMENT.INPUT_AREA.classList.remove("mainAreaLoading");

   return allRequiredInputImagesDefined;
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
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "0";

   DOM_ELEMENT.WEBCAM_AREA.style.display = "none";
   DOM_ELEMENT.FILE_BROWSE_INPUT.style.display = "none";
   DOM_ELEMENT.INPUT_RENDER_AREA.style.display = "none";

   if (DOM.getInputType() === INPUT_TYPE.TEST) {
      if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
         DOM.setImagesToPhotometricStereoTest();
      } else if (
         DOM.getCalculationType() === CALCULATION_TYPE.SPHERICAL_GRADIENT
      ) {
         DOM.setImagesToRapidGradientTest();
      }
   } else if (DOM.getInputType() === INPUT_TYPE.FILE) {
      DOM_ELEMENT.FILE_BROWSE_INPUT.style.display = "inherit";
   } else if (DOM.getInputType() === INPUT_TYPE.WEBCAM) {
      DOM_ELEMENT.WEBCAM_AREA.style.display = "inherit";
      if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
         DOM.setPhotometricStereoInputImages(
            await WebcamDatasetHelper.getPhotometricStereoDataset(
               DOM_ELEMENT.WEBCAM_PREVIEW,
               DOM_ELEMENT.WEBCAM_CAPTURE_BUTTON
            )
         );
      } else if (
         DOM.getCalculationType() === CALCULATION_TYPE.SPHERICAL_GRADIENT
      ) {
         DOM.setRapidGradientInputImages(
            await WebcamDatasetHelper.getRapidGradientDataset(
               DOM_ELEMENT.WEBCAM_PREVIEW,
               DOM_ELEMENT.WEBCAM_CAPTURE_BUTTON
            )
         );
      }
      DOM_ELEMENT.INPUT_TYPE_SELECT.selectedIndex = -1; // deselects all options
   } else if (DOM.getInputType() === INPUT_TYPE.RENDER) {
      DOM_ELEMENT.INPUT_RENDER_AREA.style.display = "inherit";
   }

   if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
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

const virtualInputRenderer = new VirtualInputRenderer(
   DOM_ELEMENT.INPUT_RENDER_CANVAS
);

DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.addEventListener(
   "input",
   virtualInputRenderer.setLightPolarAngleDeg.bind(
      virtualInputRenderer,
      Number(DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value)
   )
);
DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.addEventListener(
   "change",
   virtualInputRenderer.setLightPolarAngleDeg.bind(
      virtualInputRenderer,
      Number(DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value)
   )
);

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
DOM_ELEMENT.FILE_BROWSE_INPUT.addEventListener("change", async () => {
   await DOM.setInputImagesSourceFiles(DOM_ELEMENT.FILE_BROWSE_INPUT.files);
   calculateEverything();
});

DOM_ELEMENT.NORMAL_MAP_UPLOAD_FILE_INPUT.addEventListener(
   "change",
   async () => {
      DOM_ELEMENT.NORMAL_MAP_UPLOAD_BUTTON.style.opacity = "0";

      await DOM.setNormalMapSourceFile(
         DOM_ELEMENT.NORMAL_MAP_UPLOAD_FILE_INPUT.files[0]
      );

      calculateDepthMap();

      setTimeout(() => {
         DOM_ELEMENT.NORMAL_MAP_UPLOAD_BUTTON.style.opacity = "1";
      }, 1000);
   }
);

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
