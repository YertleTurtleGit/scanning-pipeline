//@ts-check
"use strict";

/**
 * @param {string} elementId
 * @returns {HTMLImageElement}
 */
function declareImage(elementId) {
   const image = /** @type {HTMLImageElement} */ (
      document.getElementById(elementId)
   );
   return image;
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

/**
 * @param {File[]} sourceFiles
 */
function setInputImagesSourceFiles(sourceFiles = undefined) {
   if (sourceFiles && sourceFiles.length > 0) {
      /**
       * @param {File} file
       * @param {HTMLImageElement} outputImage
       */
      function readImageFile(file, outputImage) {
         const fileReader = new FileReader();
         fileReader.addEventListener("load", () => {
            outputImage.src = String(fileReader.result);
         });
         fileReader.readAsDataURL(file);
      }

      let i = 0;
      PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
         readImageFile(sourceFiles[i], image);
         i++;
      });
   } else {
      PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
         image.src = "";
      });
   }
   resetOutput();
}

/**
 * @param {HTMLImageElement[]} inputImages
 */
function setInputImages(inputImages) {
   let i = 0;
   PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
      image.src = inputImages[i].src;
      i++;
   });
}

function setImagesToPhotometricStereoTest() {
   PHOTOMETRIC_STEREO_IMAGE_000.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_000;
   PHOTOMETRIC_STEREO_IMAGE_045.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_045;
   PHOTOMETRIC_STEREO_IMAGE_090.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_090;
   PHOTOMETRIC_STEREO_IMAGE_135.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_135;
   PHOTOMETRIC_STEREO_IMAGE_180.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_180;
   PHOTOMETRIC_STEREO_IMAGE_225.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_225;
   PHOTOMETRIC_STEREO_IMAGE_270.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_270;
   PHOTOMETRIC_STEREO_IMAGE_315.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_315;
   PHOTOMETRIC_STEREO_IMAGE_NONE.src = "null";
   resetOutput();
}

function resetOutput() {
   NORMAL_MAP_IMAGE.src = "";
   DEPTH_MAP_IMAGE.src = "";
}

const NORMAL_MAP_IMAGE = declareImage("normalMapImage");
const DEPTH_MAP_IMAGE = declareImage("depthMapImage");

const INPUT_TYPE_SELECT = /** @type {HTMLSelectElement} */ (
   document.getElementById("inputType")
);
const INPUT_TYPE = { TEST: "test", FILE: "file", WEBCAM: "webcam" };

const PHOTOMETRIC_STEREO_IMAGE_000 = declareImage("photometricStereoImage_000");
const PHOTOMETRIC_STEREO_IMAGE_045 = declareImage("photometricStereoImage_045");
const PHOTOMETRIC_STEREO_IMAGE_090 = declareImage("photometricStereoImage_090");
const PHOTOMETRIC_STEREO_IMAGE_135 = declareImage("photometricStereoImage_135");
const PHOTOMETRIC_STEREO_IMAGE_180 = declareImage("photometricStereoImage_180");
const PHOTOMETRIC_STEREO_IMAGE_225 = declareImage("photometricStereoImage_225");
const PHOTOMETRIC_STEREO_IMAGE_270 = declareImage("photometricStereoImage_270");
const PHOTOMETRIC_STEREO_IMAGE_315 = declareImage("photometricStereoImage_315");
const PHOTOMETRIC_STEREO_IMAGE_NONE = declareImage(
   "photometricStereoImage_NONE"
);

const PHOTOMETRIC_STEREO_IMAGES = [
   PHOTOMETRIC_STEREO_IMAGE_000,
   PHOTOMETRIC_STEREO_IMAGE_045,
   PHOTOMETRIC_STEREO_IMAGE_090,
   PHOTOMETRIC_STEREO_IMAGE_135,
   PHOTOMETRIC_STEREO_IMAGE_180,
   PHOTOMETRIC_STEREO_IMAGE_225,
   PHOTOMETRIC_STEREO_IMAGE_270,
   PHOTOMETRIC_STEREO_IMAGE_315,
   PHOTOMETRIC_STEREO_IMAGE_NONE,
];

const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_000 =
   "./test-datasets/photometric-stereo/object1_000_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_045 =
   "./test-datasets/photometric-stereo/object1_045_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_090 =
   "./test-datasets/photometric-stereo/object1_090_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_135 =
   "./test-datasets/photometric-stereo/object1_135_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_180 =
   "./test-datasets/photometric-stereo/object1_180_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_225 =
   "./test-datasets/photometric-stereo/object1_225_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_270 =
   "./test-datasets/photometric-stereo/object1_270_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_315 =
   "./test-datasets/photometric-stereo/object1_315_036.jpg";

const NORMAL_MAP_RESOLUTION_INPUT = declareInput("normalMapResolution");
const DEPTH_MAP_QUALITY_INPUT = declareInput("depthMapQuality");

const FILE_BROWSE_INPUT = declareInput("fileBrowse");

const WEBCAM_AREA = document.getElementById("webcamArea");
const WEBCAM_PREVIEW = /** @type {HTMLVideoElement} */ (
   document.getElementById("webcamPreview")
);
const WEBCAM_CAPTURE_BUTTON = declareInput("webcamCapture");
