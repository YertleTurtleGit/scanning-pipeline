//@ts-check
"use strict";

/**
 * @param {string} elementId
 * @returns {HTMLImageElement}
 */
function declareImage(elementId) {
   return /** @type {HTMLImageElement} */ (document.getElementById(elementId));
}

/**
 * @param {string} elementId
 * @returns {HTMLInputElement}
 */
function declareInput(elementId) {
   return /** @type {HTMLInputElement} */ (document.getElementById(elementId));
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
   return new Promise((resolve) => {
      const image = new Image();
      image.addEventListener("load", () => {
         resolve(image);
      });
      image.src = url;
   });
}

const NORMAL_MAP_IMAGE = declareImage("normalMapImage");
const DEPTH_MAP_IMAGE = declareImage("depthMapImage");

const PHOTOMETRIC_STEREO_IMAGE_000 = declareImage("photometricStereoImage_000");
const PHOTOMETRIC_STEREO_IMAGE_045 = declareImage("photometricStereoImage_045");
const PHOTOMETRIC_STEREO_IMAGE_090 = declareImage("photometricStereoImage_090");
const PHOTOMETRIC_STEREO_IMAGE_135 = declareImage("photometricStereoImage_135");
const PHOTOMETRIC_STEREO_IMAGE_180 = declareImage("photometricStereoImage_180");
const PHOTOMETRIC_STEREO_IMAGE_225 = declareImage("photometricStereoImage_225");
const PHOTOMETRIC_STEREO_IMAGE_270 = declareImage("photometricStereoImage_270");
const PHOTOMETRIC_STEREO_IMAGE_315 = declareImage("photometricStereoImage_315");

const NORMAL_MAP_RESOLUTION_INPUT = declareInput("normalMapResolution");
