/* global DOM, DOM_ELEMENT, INPUT_TYPE, CALCULATION_TYPE 
NormalMapHelper, DepthMapHelper, PointCloudHelper, WebcamDatasetHelper, VirtualInputRenderer, BulkChartHelper */

/**
 * @param {boolean} pipeline
 * @returns {Promise<HTMLImageElement>}
 */
async function calculateNormalMap(pipeline = true) {
   let normalMap;

   cancelAllRenderJobs();

   DOM_ELEMENT.NORMAL_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "0";

   DOM_ELEMENT.NORMAL_MAP_UPLOAD_BUTTON.style.transform =
      "translate(-100%, -150%) rotate(180deg)";

   if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
      normalMap = await NormalMapHelper.getPhotometricStereoNormalMap(
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
      normalMap = await NormalMapHelper.getSphericalGradientNormalMap(
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

   if (DOM.getInputType() === INPUT_TYPE.RENDER) {
      const groundTruth =
         await virtualInputRenderer.renderNormalMapGroundTruth();

      DOM_ELEMENT.NORMAL_MAP_GROUND_TRUTH_IMAGE.src = groundTruth.src;

      DOM_ELEMENT.NORMAL_MAP_ACCURACY.innerText = String(
         (1 -
            (await NormalMapHelper.getDifferenceValue(
               normalMap,
               groundTruth
            ))) *
            100
      );
   }

   DOM_ELEMENT.NORMAL_MAP_UPLOAD_BUTTON.style.transform =
      "translate(0%, -150%) rotate(180deg)";
   DOM_ELEMENT.NORMAL_MAP_AREA.classList.remove("mainAreaLoading");
   if (pipeline) {
      await calculateDepthMap();
   }
   return normalMap;
}

/**
 * @param {boolean} pipeline
 * @returns {Promise<HTMLImageElement>}
 */
async function calculateDepthMap(pipeline = true) {
   DepthMapHelper.cancelRenderJobs();
   PointCloudHelper.cancelRenderJobs();

   DOM_ELEMENT.DEPTH_MAP_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_AREA.classList.add("mainAreaLoading");
   DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "0";
   const depthMap = await DepthMapHelper.getDepthMap(
      DOM_ELEMENT.NORMAL_MAP_IMAGE,
      Number(DOM_ELEMENT.DEPTH_MAP_QUALITY_INPUT.value),
      Number(DOM_ELEMENT.DEPTH_MAP_PERSPECTIVE_CORRECTION_INPUT.value),
      DOM_ELEMENT.DEPTH_MAP_IMAGE,
      DOM_ELEMENT.DEPTH_MAP_PROGRESS
   );

   if (DOM.getInputType() === INPUT_TYPE.RENDER) {
      const groundTruth =
         await virtualInputRenderer.renderDepthMapGroundTruth();

      DOM_ELEMENT.DEPTH_MAP_GROUND_TRUTH_IMAGE.src = groundTruth.src;

      DOM_ELEMENT.DEPTH_MAP_ACCURACY.innerText = String(
         (1 -
            (await DepthMapHelper.getDifferenceValue(depthMap, groundTruth))) *
            100
      );
   }

   DOM_ELEMENT.DEPTH_MAP_AREA.classList.remove("mainAreaLoading");
   if (pipeline) {
      await calculatePointCloud();
   }
   return depthMap;
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
   cancelAllRenderJobs();
   const allRequiredInputImagesDefined = await loadInputImages();

   if (allRequiredInputImagesDefined) {
      await calculateNormalMap();
   } else {
      DOM_ELEMENT.POINT_CLOUD_DOWNLOAD_BUTTON.style.opacity = "1";
   }
}

/** */
function cancelAllRenderJobs() {
   NormalMapHelper.cancelRenderJobs();
   DepthMapHelper.cancelRenderJobs();
   PointCloudHelper.cancelRenderJobs();
}

let inputImageId = 0;
/**
 * @returns {Promise<boolean>} allRequiredInputImagesDefined
 */
async function loadInputImages() {
   inputImageId++;
   const thisInputImageId = inputImageId;

   DOM_ELEMENT.INPUT_AREA.classList.add("mainAreaLoading");

   let imagePromises;
   let allRequiredInputImagesDefined = true;
   const requiredImageIndices = [];

   if (inputImageId > thisInputImageId) return;

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

   if (inputImageId > thisInputImageId) return;

   const images = await Promise.all(imagePromises);

   if (inputImageId > thisInputImageId) return;

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
   DOM_ELEMENT.NORMAL_MAP_GROUND_TRUTH_IMAGE.style.display = "none";
   DOM_ELEMENT.DEPTH_MAP_GROUND_TRUTH_IMAGE.style.display = "none";
   DOM_ELEMENT.NORMAL_MAP_ACCURACY_AREA.style.display = "none";
   DOM_ELEMENT.DEPTH_MAP_ACCURACY_AREA.style.display = "none";
   DOM_ELEMENT.CALCULATION_TYPE_SELECT.style.display = "inherit";

   DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.disabled = false;
   DOM_ELEMENT.CALCULATION_TYPE_SELECT.disabled = false;

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
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.selectedIndex = 0; // photometric stereo
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.style.display = "none";
      DOM_ELEMENT.INPUT_RENDER_AREA.style.display = "inherit";
      DOM_ELEMENT.NORMAL_MAP_GROUND_TRUTH_IMAGE.style.display = "inherit";
      DOM_ELEMENT.DEPTH_MAP_GROUND_TRUTH_IMAGE.style.display = "inherit";
      DOM_ELEMENT.NORMAL_MAP_ACCURACY_AREA.style.display = "inherit";
      DOM_ELEMENT.DEPTH_MAP_ACCURACY_AREA.style.display = "inherit";

      DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value =
         DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.value;

      if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
         await virtualInputRenderer.setCameraDistance(
            Number(DOM_ELEMENT.RENDER_CAMERA_DISTANCE_INPUT.value)
         );
         await virtualInputRenderer.setLightDistance(
            Number(DOM_ELEMENT.RENDER_LIGHT_DISTANCE_INPUT.value)
         );
         await virtualInputRenderer.setLightPolarAngleDeg(
            Number(DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value)
         );

         DOM.setPhotometricStereoInputImages(
            await virtualInputRenderer.render()
         );
      }
   }

   if (
      DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO &&
      DOM.getInputType() !== INPUT_TYPE.RENDER
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

const virtualInputRenderer = new VirtualInputRenderer(
   DOM_ELEMENT.INPUT_RENDER_CANVAS
);

DOM_ELEMENT.RENDER_CAMERA_DISTANCE_INPUT.addEventListener("input", async () => {
   virtualInputRenderer.setCameraDistance(
      Number(DOM_ELEMENT.RENDER_CAMERA_DISTANCE_INPUT.value)
   );
   DOM.setPhotometricStereoInputImages(await virtualInputRenderer.render());
   calculateEverything();
});
DOM_ELEMENT.RENDER_CAMERA_DISTANCE_INPUT.addEventListener(
   "change",
   async () => {
      virtualInputRenderer.setCameraDistance(
         Number(DOM_ELEMENT.RENDER_CAMERA_DISTANCE_INPUT.value)
      );
      DOM.setPhotometricStereoInputImages(await virtualInputRenderer.render());
      calculateEverything();
   }
);

DOM_ELEMENT.RENDER_LIGHT_DISTANCE_INPUT.addEventListener("input", async () => {
   virtualInputRenderer.setLightDistance(
      Number(DOM_ELEMENT.RENDER_LIGHT_DISTANCE_INPUT.value)
   );
   DOM.setPhotometricStereoInputImages(await virtualInputRenderer.render());
   calculateEverything();
});
DOM_ELEMENT.RENDER_LIGHT_DISTANCE_INPUT.addEventListener("change", async () => {
   virtualInputRenderer.setLightDistance(
      Number(DOM_ELEMENT.RENDER_LIGHT_DISTANCE_INPUT.value)
   );
   DOM.setPhotometricStereoInputImages(await virtualInputRenderer.render());
   calculateEverything();
});

DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.addEventListener("input", async () => {
   DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.value =
      DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value;
   DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.dispatchEvent(new Event("change"));

   virtualInputRenderer.setLightPolarAngleDeg(
      Number(DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value)
   );
   DOM.setPhotometricStereoInputImages(await virtualInputRenderer.render());
   calculateEverything();
});
DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.addEventListener(
   "change",
   async () => {
      DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.value =
         DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value;
      DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.dispatchEvent(new Event("change"));

      virtualInputRenderer.setLightPolarAngleDeg(
         Number(DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value)
      );
      DOM.setPhotometricStereoInputImages(await virtualInputRenderer.render());
      calculateEverything();
   }
);

DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.addEventListener(
   "change",
   calculateNormalMap.bind()
);
DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.addEventListener(
   "input",
   calculateNormalMap.bind()
);
DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.addEventListener(
   "change",
   calculateNormalMap.bind()
);
DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.addEventListener(
   "input",
   calculateNormalMap.bind()
);
DOM_ELEMENT.MASK_THRESHOLD_INPUT.addEventListener(
   "change",
   calculateNormalMap.bind()
);
DOM_ELEMENT.MASK_THRESHOLD_INPUT.addEventListener(
   "input",
   calculateNormalMap.bind()
);

DOM_ELEMENT.DEPTH_MAP_QUALITY_INPUT.addEventListener(
   "change",
   calculateDepthMap.bind()
);
DOM_ELEMENT.DEPTH_MAP_QUALITY_INPUT.addEventListener(
   "input",
   calculateDepthMap.bind()
);

DOM_ELEMENT.DEPTH_MAP_PERSPECTIVE_CORRECTION_INPUT.addEventListener(
   "change",
   calculateDepthMap.bind()
);
DOM_ELEMENT.DEPTH_MAP_PERSPECTIVE_CORRECTION_INPUT.addEventListener(
   "input",
   calculateDepthMap.bind()
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

      inputOrCalculationTypeChange();
      calculateDepthMap();

      DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.disabled = true;
      DOM_ELEMENT.NORMAL_MAP_RESOLUTION_INPUT.disabled = true;
      DOM_ELEMENT.CALCULATION_TYPE_SELECT.disabled = true;
      DOM_ELEMENT.FILE_BROWSE_INPUT.style.display = "none";

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

DOM_ELEMENT.CHART_ABORT_BUTTON.addEventListener("click", () => {
   DOM_ELEMENT.CHART_ABORT_BUTTON.innerText = "aborting...";
   BulkChartHelper.abortAll();
});

DOM_ELEMENT.CHART_PAUSE_BUTTON.addEventListener("click", () => {
   if (DOM_ELEMENT.CHART_PAUSE_BUTTON.innerText === "pause charting") {
      BulkChartHelper.pauseAll();
      DOM_ELEMENT.CHART_PAUSE_BUTTON.innerText = "continue charting";
   } else {
      BulkChartHelper.resetAll();
      DOM_ELEMENT.CHART_PAUSE_BUTTON.innerText = "pause charting";
   }
});

DOM_ELEMENT.CHART_DOWNLOAD_BUTTON.addEventListener("click", () => {
   BulkChartHelper.downloadCurrentDataFile();
});

Array.from(document.getElementsByClassName("chartButton")).forEach(
   (chartButton) => {
      chartButton.addEventListener("click", async () => {
         DOM_ELEMENT.CHART_AREA.style.display = "initial";

         const rangeInput = /** @type {HTMLInputElement} */ (
            chartButton.previousElementSibling
         );

         const initialValue = rangeInput.value;

         Array.from(
            DOM_ELEMENT.PIPELINE_AREA.getElementsByTagName("input")
         ).forEach((element) => {
            element.disabled = true;
         });

         DOM_ELEMENT.CHART_AREA.scrollIntoView({
            block: "end",
            behavior: "smooth",
         });

         await BulkChartHelper.bulkChartRangeInput(
            DOM_ELEMENT.CHART_CANVAS,
            rangeInput,
            async () => {
               DOM_ELEMENT.POLAR_ANGLE_DEG_INPUT.value =
                  DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value;

               await virtualInputRenderer.setCameraDistance(
                  Number(DOM_ELEMENT.RENDER_CAMERA_DISTANCE_INPUT.value)
               );
               await virtualInputRenderer.setLightDistance(
                  Number(DOM_ELEMENT.RENDER_LIGHT_DISTANCE_INPUT.value)
               );
               await virtualInputRenderer.setLightPolarAngleDeg(
                  Number(DOM_ELEMENT.RENDER_LIGHT_POLAR_DEG_INPUT.value)
               );
               DOM.setPhotometricStereoInputImages(
                  await virtualInputRenderer.render()
               );

               await loadInputImages();
            },
            async () => {
               return NormalMapHelper.getDifferenceValue(
                  await calculateNormalMap(false),
                  DOM_ELEMENT.NORMAL_MAP_GROUND_TRUTH_IMAGE
               );
            },
            async () => {
               return DepthMapHelper.getDifferenceValue(
                  await calculateDepthMap(false),
                  DOM_ELEMENT.DEPTH_MAP_GROUND_TRUTH_IMAGE
               );
            }
         );

         BulkChartHelper.resetAll();

         DOM_ELEMENT.PIPELINE_AREA.scrollIntoView({
            block: "start",
            behavior: "smooth",
         });

         rangeInput.value = initialValue;
         rangeInput.dispatchEvent(new Event("change"));

         DOM_ELEMENT.CHART_AREA.style.display = "none";
         DOM_ELEMENT.CHART_ABORT_BUTTON.innerText = "abort charting";
         DOM_ELEMENT.CHART_PAUSE_BUTTON.innerText = "pause charting";

         Array.from(
            DOM_ELEMENT.PIPELINE_AREA.getElementsByTagName("input")
         ).forEach((element) => {
            element.disabled = false;
         });
      });
   }
);

inputOrCalculationTypeChange();

Array.from(
   DOM_ELEMENT.PIPELINE_AREA.getElementsByClassName("userInput")
).forEach((element) => {
   element.dispatchEvent(new Event("change"));
});
