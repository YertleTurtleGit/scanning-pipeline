/* global PointCloudHelper */
/* exported DOM, DOM_ELEMENTS, INPUT_TYPE, CALCULATION_TYPE */

class DOM {
   /**
    * @public
    * @param {string} elementId
    * @returns {HTMLImageElement}
    */
   static declareImage(elementId) {
      const image = /** @type {HTMLImageElement} */ (
         document.getElementById(elementId)
      );
      return image;
   }

   /**
    * @public
    * @param {string} elementId
    * @returns {HTMLInputElement}
    */
   static declareInput(elementId) {
      return /** @type {HTMLInputElement} */ (
         document.getElementById(elementId)
      );
   }

   /**
    * @public
    * @param {string} url
    * @returns {Promise<HTMLImageElement>}
    */
   static async loadImage(url) {
      const image = new Image();
      return new Promise((resolve) => {
         image.addEventListener("load", () => {
            resolve(image);
         });
         image.addEventListener("error", () => {
            resolve(null);
         });
         image.src = url;
      });
   }

   /**
    * @public
    * @param {HTMLImageElement} image
    * @returns {Promise<HTMLImageElement>}
    */
   static async loadHTMLImage(image) {
      /**
       * @param {HTMLImageElement} image
       * @returns {boolean}
       */
      function isImageLoaded(image) {
         if (
            image.src.endsWith("null") ||
            image.src.endsWith(".html") ||
            image.src === ""
         ) {
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

   /**
    * @returns {CALCULATION_TYPE}
    */
   static getCalculationType() {
      return DOM_ELEMENT.CALCULATION_TYPE_SELECT.value;
   }

   /**
    * @returns {INPUT_TYPE}
    */
   static getInputType() {
      return DOM_ELEMENT.INPUT_TYPE_SELECT.value;
   }

   /**
    * @returns {HTMLImageElement[]}
    */
   static getCurrentInputImages() {
      if (DOM.getCalculationType() === CALCULATION_TYPE.PHOTOMETRIC_STEREO) {
         return PHOTOMETRIC_STEREO_IMAGES;
      } else if (
         DOM.getCalculationType() === CALCULATION_TYPE.SPHERICAL_GRADIENT
      ) {
         return SPHERICAL_GRADIENT_IMAGES;
      }
   }

   /**
    * @param {FileList} sourceFiles
    */
   static async setInputImagesSourceFiles(sourceFiles = undefined) {
      DOM.reset();
      if (sourceFiles && sourceFiles.length > 0) {
         const sourceFilesLoadPromises = [];
         Array.from(sourceFiles).forEach((image, index) => {
            sourceFilesLoadPromises.push(
               new Promise((resolve) => {
                  const fileReader = new FileReader();

                  fileReader.addEventListener("load", async () => {
                     const dataURL = String(fileReader.result);
                     DOM.getCurrentInputImages()[index].src = (
                        await DOM.loadImage(dataURL)
                     ).src;
                     resolve();
                  });
                  fileReader.readAsDataURL(image);
               })
            );
         });
         await Promise.all(sourceFilesLoadPromises);
      }
   }

   /**
    * @public
    * @param {HTMLImageElement[]} inputImages
    */
   static setPhotometricStereoInputImages(inputImages) {
      DOM.reset();
      let i = 0;
      PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
         image.src = inputImages[i].src;
         i++;
      });
   }

   /**
    * @public
    * @param {HTMLImageElement[]} inputImages
    */
   static setRapidGradientInputImages(inputImages) {
      DOM.reset();
      let i = 0;
      SPHERICAL_GRADIENT_IMAGES.forEach((image) => {
         image.src = inputImages[i].src;
         i++;
      });
   }

   /**
    * @public
    */
   static setImagesToPhotometricStereoTest() {
      DOM.reset();
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_000.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_000;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_045.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_045;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_090.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_090;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_135.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_135;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_180.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_180;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_225.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_225;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_270.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_270;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_315.src =
         TEST_SRC_PHOTOMETRIC_STEREO_IMAGE_315;
      DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_NONE.src = "null";
   }

   /**
    * @public
    */
   static setImagesToRapidGradientTest() {
      DOM.reset();
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_000.src =
         TEST_SRC_SPHERICAL_GRADIENT_IMAGE_000;
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_090.src =
         TEST_SRC_SPHERICAL_GRADIENT_IMAGE_090;
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_180.src =
         TEST_SRC_SPHERICAL_GRADIENT_IMAGE_180;
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_270.src =
         TEST_SRC_SPHERICAL_GRADIENT_IMAGE_270;
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_ALL.src =
         TEST_SRC_SPHERICAL_GRADIENT_IMAGE_ALL;
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_FRONT.src =
         TEST_SRC_SPHERICAL_GRADIENT_IMAGE_FRONT;
      DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_NONE.src = "null";
   }

   /**
    * @private
    */
   static reset() {
      PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
         image.src = "";
      });
      SPHERICAL_GRADIENT_IMAGES.forEach((image) => {
         image.src = "";
      });
      DOM_ELEMENT.NORMAL_MAP_IMAGE.src = "";
      DOM_ELEMENT.DEPTH_MAP_IMAGE.src = "";
      PointCloudHelper.clearCanvas(DOM_ELEMENT.POINT_CLOUD_CANVAS);
   }

   /** @private */
   constructor() {}
}

const DOM_ELEMENT = {
   NORMAL_MAP_IMAGE: DOM.declareImage("normalMapImage"),
   DEPTH_MAP_IMAGE: DOM.declareImage("depthMapImage"),

   INPUT_TYPE_SELECT: /** @type {HTMLSelectElement} */ (
      document.getElementById("inputType")
   ),

   CALCULATION_TYPE_SELECT: /** @type {HTMLSelectElement} */ (
      document.getElementById("calculationType")
   ),

   PHOTOMETRIC_STEREO_IMAGE_000: DOM.declareImage("photometricStereoImage_000"),
   PHOTOMETRIC_STEREO_IMAGE_045: DOM.declareImage("photometricStereoImage_045"),
   PHOTOMETRIC_STEREO_IMAGE_090: DOM.declareImage("photometricStereoImage_090"),
   PHOTOMETRIC_STEREO_IMAGE_135: DOM.declareImage("photometricStereoImage_135"),
   PHOTOMETRIC_STEREO_IMAGE_180: DOM.declareImage("photometricStereoImage_180"),
   PHOTOMETRIC_STEREO_IMAGE_225: DOM.declareImage("photometricStereoImage_225"),
   PHOTOMETRIC_STEREO_IMAGE_270: DOM.declareImage("photometricStereoImage_270"),
   PHOTOMETRIC_STEREO_IMAGE_315: DOM.declareImage("photometricStereoImage_315"),
   PHOTOMETRIC_STEREO_IMAGE_NONE: DOM.declareImage(
      "photometricStereoImage_NONE"
   ),

   SPHERICAL_GRADIENT_IMAGE_000: DOM.declareImage("sphericalGradientImage_000"),
   SPHERICAL_GRADIENT_IMAGE_090: DOM.declareImage("sphericalGradientImage_090"),
   SPHERICAL_GRADIENT_IMAGE_180: DOM.declareImage("sphericalGradientImage_180"),
   SPHERICAL_GRADIENT_IMAGE_270: DOM.declareImage("sphericalGradientImage_270"),
   SPHERICAL_GRADIENT_IMAGE_ALL: DOM.declareImage("sphericalGradientImage_ALL"),
   SPHERICAL_GRADIENT_IMAGE_FRONT: DOM.declareImage(
      "sphericalGradientImage_FRONT"
   ),
   SPHERICAL_GRADIENT_IMAGE_NONE: DOM.declareImage(
      "sphericalGradientImage_NONE"
   ),

   INPUT_AREA: document.getElementById("inputArea"),
   NORMAL_MAP_AREA: document.getElementById("normalMapArea"),
   DEPTH_MAP_AREA: document.getElementById("depthMapArea"),
   POINT_CLOUD_AREA: document.getElementById("pointCloudArea"),

   PHOTOMETRIC_STEREO_IMAGE_AREA: document.getElementById(
      "photometricStereoImages"
   ),
   SPHERICAL_GRADIENT_IMAGE_AREA: document.getElementById(
      "sphericalGradientImages"
   ),

   NORMAL_MAP_RESOLUTION_INPUT: DOM.declareInput("normalMapResolution"),
   POLAR_ANGLE_DEG_INPUT: DOM.declareInput("polarAngleDeg"),
   MASK_THRESHOLD_INPUT: DOM.declareInput("maskThreshold"),
   DEPTH_MAP_QUALITY_INPUT: DOM.declareInput("depthMapQuality"),
   POINT_CLOUD_DEPTH_FACTOR_INPUT: DOM.declareInput("depthFactor"),

   FILE_BROWSE_INPUT: DOM.declareInput("fileBrowse"),

   WEBCAM_AREA: document.getElementById("webcamArea"),
   WEBCAM_PREVIEW: /** @type {HTMLVideoElement} */ (
      document.getElementById("webcamPreview")
   ),
   WEBCAM_CAPTURE_BUTTON: DOM.declareInput("webcamCapture"),

   POINT_CLOUD_DOWNLOAD_BUTTON: DOM.declareInput("pointCloudDownloadButton"),

   POINT_CLOUD_CANVAS: /**@type {HTMLCanvasElement} */ (
      document.getElementById("pointCloudCanvas")
   ),
};

/** @typedef {string} INPUT_TYPE */
const INPUT_TYPE = { TEST: "test", FILE: "file", WEBCAM: "webcam" };

/** @typedef {string} CALCULATION_TYPE */
const CALCULATION_TYPE = {
   PHOTOMETRIC_STEREO: "photometric stereo",
   SPHERICAL_GRADIENT: "spherical gradient",
};

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

const TEST_SRC_SPHERICAL_GRADIENT_IMAGE_000 =
   "./test-datasets/spherical-gradient/test_000.jpg";
const TEST_SRC_SPHERICAL_GRADIENT_IMAGE_090 =
   "./test-datasets/spherical-gradient/test_090.jpg";
const TEST_SRC_SPHERICAL_GRADIENT_IMAGE_180 =
   "./test-datasets/spherical-gradient/test_180.jpg";
const TEST_SRC_SPHERICAL_GRADIENT_IMAGE_270 =
   "./test-datasets/spherical-gradient/test_270.jpg";
const TEST_SRC_SPHERICAL_GRADIENT_IMAGE_ALL =
   "./test-datasets/spherical-gradient/test_ALL.jpg";
const TEST_SRC_SPHERICAL_GRADIENT_IMAGE_FRONT =
   "./test-datasets/spherical-gradient/test_FRONT.jpg";

const PHOTOMETRIC_STEREO_IMAGES = [
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_000,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_045,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_090,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_135,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_180,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_225,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_270,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_315,
   DOM_ELEMENT.PHOTOMETRIC_STEREO_IMAGE_NONE,
];

const SPHERICAL_GRADIENT_IMAGES = [
   DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_000,
   DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_090,
   DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_180,
   DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_270,
   DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_ALL,
   DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_FRONT,
   DOM_ELEMENT.SPHERICAL_GRADIENT_IMAGE_NONE,
];
