/* global PointCloudHelper */
/* exported DOM, DOM_ELEMENTS, TYPE */

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
   static loadImage(url) {
      return new Promise((resolve) => {
         const image = new Image();
         image.addEventListener("load", () => {
            resolve(image);
         });
         image.src = url;
      });
   }

   /**
    * @private
    * @param {File} file
    * @param {HTMLImageElement} outputImage
    */
   static readImageFile(file, outputImage) {
      const fileReader = new FileReader();
      fileReader.addEventListener("load", () => {
         outputImage.src = String(fileReader.result);
      });
      fileReader.readAsDataURL(file);
   }

   /**
    * @public
    * @param {File[]} sourceFiles
    */
   static setInputImagesSourceFiles(sourceFiles = undefined) {
      DOM.reset();
      if (sourceFiles && sourceFiles.length > 0) {
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
            DOM.readImageFile(sourceFiles[i], image);
            i++;
         });
      } else {
         PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
            image.src = "";
         });
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
      RAPID_GRADIENT_IMAGES.forEach((image) => {
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
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_000.src =
         TEST_SRC_RAPID_GRADIENT_IMAGE_000;
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_090.src =
         TEST_SRC_RAPID_GRADIENT_IMAGE_090;
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_180.src =
         TEST_SRC_RAPID_GRADIENT_IMAGE_180;
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_270.src =
         TEST_SRC_RAPID_GRADIENT_IMAGE_270;
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_ALL.src =
         TEST_SRC_RAPID_GRADIENT_IMAGE_ALL;
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_FRONT.src =
         TEST_SRC_RAPID_GRADIENT_IMAGE_FRONT;
      DOM_ELEMENT.RAPID_GRADIENT_IMAGE_NONE.src = "null";
   }

   /**
    * @private
    */
   static reset() {
      PHOTOMETRIC_STEREO_IMAGES.forEach((image) => {
         image.src = "";
      });
      RAPID_GRADIENT_IMAGES.forEach((image) => {
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

   RAPID_GRADIENT_IMAGE_000: DOM.declareImage("rapidGradientImage_000"),
   RAPID_GRADIENT_IMAGE_090: DOM.declareImage("rapidGradientImage_090"),
   RAPID_GRADIENT_IMAGE_180: DOM.declareImage("rapidGradientImage_180"),
   RAPID_GRADIENT_IMAGE_270: DOM.declareImage("rapidGradientImage_270"),
   RAPID_GRADIENT_IMAGE_ALL: DOM.declareImage("rapidGradientImage_ALL"),
   RAPID_GRADIENT_IMAGE_FRONT: DOM.declareImage("rapidGradientImage_FRONT"),
   RAPID_GRADIENT_IMAGE_NONE: DOM.declareImage("rapidGradientImage_NONE"),

   INPUT_AREA: document.getElementById("inputArea"),
   NORMAL_MAP_AREA: document.getElementById("normalMapArea"),
   DEPTH_MAP_AREA: document.getElementById("depthMapArea"),
   POINT_CLOUD_AREA: document.getElementById("pointCloudArea"),

   PHOTOMETRIC_STEREO_IMAGE_AREA: document.getElementById(
      "photometricStereoImages"
   ),
   RAPID_GRADIENT_IMAGE_AREA: document.getElementById("rapidGradientImages"),

   NORMAL_MAP_RESOLUTION_INPUT: DOM.declareInput("normalMapResolution"),
   POLAR_ANGLE_DEG_INPUT: DOM.declareInput("polarAngleDeg"),
   DEPTH_MAP_QUALITY_INPUT: DOM.declareInput("depthMapQuality"),
   POINT_CLOUD_DEPTH_FACTOR_INPUT: DOM.declareInput("depthFactor"),

   FILE_BROWSE_INPUT: DOM.declareInput("fileBrowse"),

   WEBCAM_AREA: document.getElementById("webcamArea"),
   WEBCAM_PREVIEW: /** @type {HTMLVideoElement} */ (
      document.getElementById("webcamPreview")
   ),
   WEBCAM_CAPTURE_BUTTON: DOM.declareInput("webcamCapture"),

   POINT_CLOUD_CANVAS: /**@type {HTMLCanvasElement} */ (
      document.getElementById("pointCloudCanvas")
   ),
};

const TYPE = {
   INPUT_TYPE: { TEST: "test", FILE: "file", WEBCAM: "webcam" },
   CALCULATION_TYPE: {
      PHOTOMETRIC_STEREO: "photometric stereo",
      RAPID_GRADIENT: "rapid gradient",
   },
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

const RAPID_GRADIENT_IMAGES = [
   DOM_ELEMENT.RAPID_GRADIENT_IMAGE_000,
   DOM_ELEMENT.RAPID_GRADIENT_IMAGE_090,
   DOM_ELEMENT.RAPID_GRADIENT_IMAGE_180,
   DOM_ELEMENT.RAPID_GRADIENT_IMAGE_270,
   DOM_ELEMENT.RAPID_GRADIENT_IMAGE_ALL,
   DOM_ELEMENT.RAPID_GRADIENT_IMAGE_FRONT,
   DOM_ELEMENT.RAPID_GRADIENT_IMAGE_NONE,
];
