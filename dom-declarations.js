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
   reset();
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

      // TODO: sort
      sourceFiles.sort((a, b) => {
         return a.name.localeCompare(
            b.name,
            navigator.languages[0] || navigator.language,
            { numeric: true, ignorePunctuation: true }
         );
      });

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
}

/**
 * @param {HTMLImageElement[]} inputImages
 */
function setPhotometricStereoInputImages(inputImages) {
   reset();
   let i = 0;
   PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
      image.src = inputImages[i].src;
      i++;
   });
}

/**
 * @param {HTMLImageElement[]} inputImages
 */
function setRapidGradientInputImages(inputImages) {
   reset();
   let i = 0;
   RAPID_GRADIENT_IMAGES.forEach((image) => {
      image.src = inputImages[i].src;
      i++;
   });
}

function setImagesToPhotometricStereoTest() {
   reset();
   PHOTOMETRIC_STEREO_IMAGE_000.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_000;
   PHOTOMETRIC_STEREO_IMAGE_045.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_045;
   PHOTOMETRIC_STEREO_IMAGE_090.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_090;
   PHOTOMETRIC_STEREO_IMAGE_135.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_135;
   PHOTOMETRIC_STEREO_IMAGE_180.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_180;
   PHOTOMETRIC_STEREO_IMAGE_225.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_225;
   PHOTOMETRIC_STEREO_IMAGE_270.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_270;
   PHOTOMETRIC_STEREO_IMAGE_315.src = TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_315;
   PHOTOMETRIC_STEREO_IMAGE_NONE.src = "null";
}

function setImagesToRapidGradientTest() {
   reset();
   RAPID_GRADIENT_IMAGE_000.src = TEST_SRC_RAPID_GRADIENT_IMAGE_000;
   RAPID_GRADIENT_IMAGE_090.src = TEST_SRC_RAPID_GRADIENT_IMAGE_090;
   RAPID_GRADIENT_IMAGE_180.src = TEST_SRC_RAPID_GRADIENT_IMAGE_180;
   RAPID_GRADIENT_IMAGE_270.src = TEST_SRC_RAPID_GRADIENT_IMAGE_270;
   RAPID_GRADIENT_IMAGE_ALL.src = TEST_SRC_RAPID_GRADIENT_IMAGE_ALL;
   RAPID_GRADIENT_IMAGE_FRONT.src = TEST_SRC_RAPID_GRADIENT_IMAGE_FRONT;
   RAPID_GRADIENT_IMAGE_NONE.src = "null";
}

function reset() {
   PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
      image.src = "";
   });
   RAPID_GRADIENT_IMAGES.forEach((image) => {
      image.src = "";
   });
   NORMAL_MAP_IMAGE.src = "";
   DEPTH_MAP_IMAGE.src = "";
   PointCloudHelper.clearCanvas(POINT_CLOUD_CANVAS);
}

const NORMAL_MAP_IMAGE = declareImage("normalMapImage");
const DEPTH_MAP_IMAGE = declareImage("depthMapImage");

const INPUT_TYPE_SELECT = /** @type {HTMLSelectElement} */ (
   document.getElementById("inputType")
);
const INPUT_TYPE = { TEST: "test", FILE: "file", WEBCAM: "webcam" };

const CALCULATION_TYPE_SELECT = /** @type {HTMLSelectElement} */ (
   document.getElementById("calculationType")
);
const CALCULATION_TYPE = {
   PHOTOMETRIC_STEREO: "photometric stereo",
   RAPID_GRADIENT: "rapid gradient",
};

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
   "./test-datasets/photometric-stereo/test_000_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_045 =
   "./test-datasets/photometric-stereo/test_045_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_090 =
   "./test-datasets/photometric-stereo/test_090_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_135 =
   "./test-datasets/photometric-stereo/test_135_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_180 =
   "./test-datasets/photometric-stereo/test_180_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_225 =
   "./test-datasets/photometric-stereo/test_225_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_270 =
   "./test-datasets/photometric-stereo/test_270_036.jpg";
const TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_315 =
   "./test-datasets/photometric-stereo/test_315_036.jpg";

const RAPID_GRADIENT_IMAGE_000 = declareImage("rapidGradientImage_000");
const RAPID_GRADIENT_IMAGE_090 = declareImage("rapidGradientImage_090");
const RAPID_GRADIENT_IMAGE_180 = declareImage("rapidGradientImage_180");
const RAPID_GRADIENT_IMAGE_270 = declareImage("rapidGradientImage_270");
const RAPID_GRADIENT_IMAGE_ALL = declareImage("rapidGradientImage_ALL");
const RAPID_GRADIENT_IMAGE_FRONT = declareImage("rapidGradientImage_FRONT");
const RAPID_GRADIENT_IMAGE_NONE = declareImage("rapidGradientImage_NONE");

const RAPID_GRADIENT_IMAGES = [
   RAPID_GRADIENT_IMAGE_000,
   RAPID_GRADIENT_IMAGE_090,
   RAPID_GRADIENT_IMAGE_180,
   RAPID_GRADIENT_IMAGE_270,
   RAPID_GRADIENT_IMAGE_ALL,
   RAPID_GRADIENT_IMAGE_FRONT,
   RAPID_GRADIENT_IMAGE_NONE,
];

const TEST_SRC_RAPID_GRADIENT_IMAGE_000 =
   "./test-datasets/rapid-gradient/test_000.jpg";
const TEST_SRC_RAPID_GRADIENT_IMAGE_090 =
   "./test-datasets/rapid-gradient/test_090.jpg";
const TEST_SRC_RAPID_GRADIENT_IMAGE_180 =
   "./test-datasets/rapid-gradient/test_180.jpg";
const TEST_SRC_RAPID_GRADIENT_IMAGE_270 =
   "./test-datasets/rapid-gradient/test_270.jpg";
const TEST_SRC_RAPID_GRADIENT_IMAGE_ALL =
   "./test-datasets/rapid-gradient/test_ALL.jpg";
const TEST_SRC_RAPID_GRADIENT_IMAGE_FRONT =
   "./test-datasets/rapid-gradient/test_FRONT.jpg";

const INPUT_AREA = document.getElementById("inputArea");
const NORMAL_MAP_AREA = document.getElementById("normalMapArea");
const DEPTH_MAP_AREA = document.getElementById("depthMapArea");
const POINT_CLOUD_AREA = document.getElementById("pointCloudArea");

const PHOTOMETRIC_STEREO_IMAGE_AREA = document.getElementById(
   "photometricStereoImages"
);
const RAPID_GRADIENT_IMAGE_AREA = document.getElementById(
   "rapidGradientImages"
);

const NORMAL_MAP_RESOLUTION_INPUT = declareInput("normalMapResolution");
const DEPTH_MAP_QUALITY_INPUT = declareInput("depthMapQuality");
const POINT_CLOUD_DEPTH_FACTOR_INPUT = declareInput("depthFactor");

const FILE_BROWSE_INPUT = declareInput("fileBrowse");

const WEBCAM_AREA = document.getElementById("webcamArea");
const WEBCAM_PREVIEW = /** @type {HTMLVideoElement} */ (
   document.getElementById("webcamPreview")
);
const WEBCAM_CAPTURE_BUTTON = declareInput("webcamCapture");

const POINT_CLOUD_CANVAS = /**@type {HTMLCanvasElement} */ (
   document.getElementById("pointCloudCanvas")
);
