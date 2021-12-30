/* global GLSL, FunctionWorker */
/* exported DepthMapHelper */

/**
 * @global
 * @typedef {{x: number, y: number}} Pixel
 * @typedef {{x: number, y: number, slope: number}} LinePixel
 * @typedef {LinePixel[]} PixelLine
 */
class DepthMapHelper {
   /**
    * This functions calculates a depth mapping by a given
    * normal mapping.
    *
    * @public
    * @param {ImageBitmap} normalMap The normal mapping
    * that is used to calculate the depth mapping.
    * @param {number} qualityPercent The quality in percent
    * defines how many anisotropic integrals are taken into
    * account to archive a higher quality depth mapping.
    * @returns {Promise<ImageBitmap>} A depth mapping
    * according to the input normal mapping.
    */
   static async depthMap(normalMap, qualityPercent) {
      const dimensions = {
         width: normalMap.width,
         height: normalMap.height,
      };
      const maximumAngleCount = dimensions.width * 2 + dimensions.height * 2;
      const angleCount = Math.round(maximumAngleCount * qualityPercent);
      const azimuthalAngles = [];

      for (let frac = 1; frac < angleCount; frac *= 2) {
         for (let angle = 0; angle < 360; angle += 360 / frac) {
            if (!azimuthalAngles.includes(angle)) {
               azimuthalAngles.push(angle);
               azimuthalAngles.push(180 + angle);
            }
         }
      }

      const anglesCount = azimuthalAngles.length;
      const threadCount = Math.min(navigator.hardwareConcurrency, anglesCount);

      let workerFinishedCount = 0;

      const edgeFramePixels = DepthMapHelper.getEdgeFramePixels(dimensions);

      let gradientPixelArray = await DepthMapHelper.getLocalGradientFactor(
         normalMap
      );
      const gradientPixelSAB = new SharedArrayBuffer(gradientPixelArray.length);
      const gradientPixelSA = new Uint8Array(gradientPixelSAB);
      gradientPixelSA.set(gradientPixelArray);
      gradientPixelArray = undefined;

      const integralSAB = new SharedArrayBuffer(
         dimensions.height * dimensions.width * 4 //TODO: WHY times four? -> Int32
      );
      const integralSA = new Int32Array(integralSAB);
      integralSA.set(new Int32Array(integralSA.length).fill(0));

      for (let threadId = 0; threadId < threadCount; threadId++) {
         const functionWorker = new FunctionWorker(
            calculateAnisotropicIntegral
         );

         const threadAzimuthalAngles = azimuthalAngles.slice(
            threadId * Math.floor(anglesCount / threadCount),
            (threadId + 1) * Math.floor(anglesCount / threadCount) - 1
         );

         functionWorker.addMessageEventListener((messageEvent) => {
            const newIntegralSA = new Int32Array(messageEvent.data.integralSAB);
            integralSA.set(newIntegralSA);
            workerFinishedCount++;
         });

         functionWorker.postMessage({
            azimuthalAngles: threadAzimuthalAngles,
            dimensions: dimensions,
            edgeFramePixels: edgeFramePixels,
            gradientPixelSAB: gradientPixelSAB,
            integralSAB: integralSAB,
         });
      }

      while (workerFinishedCount < threadCount) {
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }

      const normalizedIntegral =
         await DepthMapHelper.getNormalizedIntegralAsGrayscale(
            integralSA,
            dimensions
         );

      const depthMap = await DepthMapHelper.getDepthMapImage(
         normalizedIntegral,
         dimensions
      );

      return depthMap;
   }

   /**
    * @deprecated
    */
   constructor() {}

   /**
    * @private
    * @param {Uint8ClampedArray} integral
    * @param {{width:number, height:number}} dimensions
    * @returns {Promise<ImageBitmap>}
    */
   static async getDepthMapImage(integral, dimensions) {
      if (Math.min(dimensions.width, dimensions.height) > 0) {
         const dim = new Uint32Array(2);
         dim[0] = dimensions.width;
         dim[1] = dimensions.height;
         const canvas = new OffscreenCanvas(dim[0], dim[1]);
         const context = canvas.getContext("2d");

         canvas.width = dimensions.width;
         canvas.height = dimensions.height;

         const imageData = new ImageData(
            integral,
            dimensions.width,
            dimensions.height
         );

         context.putImageData(imageData, 0, 0);

         return createImageBitmap(canvas);
      }
   }

   /**
    * @private
    * @param {Int32Array} integral
    * @param {{width:number, height:number}} dimensions
    * @returns {Promise<Uint8ClampedArray>}
    */
   static async getNormalizedIntegralAsGrayscale(integral, dimensions) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const colorImageArrayLength =
               dimensions.width * dimensions.height * 4;
            const normalizedIntegral = new Uint8ClampedArray(
               new ArrayBuffer(colorImageArrayLength)
            );

            let min = Number.MAX_VALUE;
            let max = Number.MIN_VALUE;

            integral.forEach((value) => {
               if (value > max) max = value;
               if (value < min) min = value;
            });

            if (min < -Math.pow(2, 32) / 2 || max > Math.pow(2, 32) / 2) {
               console.warn("Int32 overflow.");
            }

            const maxMinDelta = max - min;

            integral.forEach((value, index) => {
               const normalizedValue = ((value - min) * 255) / maxMinDelta;
               const colorIndex = index * 4;
               normalizedIntegral[colorIndex + 0] = normalizedValue;
               normalizedIntegral[colorIndex + 1] = normalizedValue;
               normalizedIntegral[colorIndex + 2] = normalizedValue;
               normalizedIntegral[colorIndex + 3] = 255;
            });

            resolve(normalizedIntegral);
         });
      });
   }

   /**
    * @private
    * @param {ImageBitmap} normalMap
    * @returns {Promise<Uint8Array>}
    */
   static getLocalGradientFactor(normalMap) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const depthMapShader = new GLSL.Shader({
               width: normalMap.width,
               height: normalMap.height,
            });
            depthMapShader.bind();

            const glslNormalMap = GLSL.Image.load(normalMap);
            const red = glslNormalMap.channel(0);
            const green = glslNormalMap.channel(1);
            const blue = glslNormalMap.channel(2);
            const result = new GLSL.Vector3([
               red.divideFloat(blue),
               green.divideFloat(blue),
               blue.minimum(red, green),
            ]);

            const gradientPixelArray = GLSL.render(
               result.getVector4()
            ).getPixelArray();

            resolve(gradientPixelArray);

            depthMapShader.purge();
         });
      });
   }

   /**
    * @private
    * @param {{width:number, height:number}} dimensions
    * @returns {Pixel[]}
    */
   static getEdgeFramePixels(dimensions) {
      /** @type {Pixel[]} */
      const edgeFramePixels = [];

      const topY = -1;
      const bottomY = dimensions.height;
      const leftX = -1;
      const rightX = dimensions.width;

      for (let x = 0; x < dimensions.width; x++) {
         edgeFramePixels.push({ x: x, y: topY });
         edgeFramePixels.push({ x: x, y: bottomY });
      }
      for (let y = 0; y < dimensions.height; y++) {
         edgeFramePixels.push({ x: leftX, y: y });
         edgeFramePixels.push({ x: rightX, y: y });
      }

      return edgeFramePixels;
   }
}

// @ts-ignore
// eslint-disable-next-line no-unused-vars
const calculateDepthMap = DepthMapHelper.depthMap;

function calculateAnisotropicIntegral(messageEvent) {
   const azimuthalAngles = messageEvent.data.azimuthalAngles;
   const dimensions = messageEvent.data.dimensions;
   const edgeFramePixels = messageEvent.data.edgeFramePixels;

   const gradientPixelSAB = messageEvent.data.gradientPixelSAB;
   const gradientPixelSA = new Uint8Array(gradientPixelSAB);

   const integralSAB = messageEvent.data.integralSAB;
   const integralSA = new Int32Array(integralSAB);

   const SLOPE_SHIFT = -255 / 2;

   azimuthalAngles.forEach((azimuthalAngle) => {
      // Inverse and thus, line FROM and NOT TO azimuthal angle.
      azimuthalAngle += 180;
      const azimuthalAngleInRadians = azimuthalAngle * (Math.PI / 180);

      const stepVector = {
         x: Math.cos(azimuthalAngleInRadians),
         y: Math.sin(azimuthalAngleInRadians),
      };

      const minimumStep = 0.00000001;

      if (Math.abs(stepVector.x) < minimumStep) {
         stepVector.x = 0;
      }
      if (Math.abs(stepVector.y) < minimumStep) {
         stepVector.y = 0;
      }

      for (
         let framePixelIndex = 0, edgeFramePixelsCount = edgeFramePixels.length;
         framePixelIndex < edgeFramePixelsCount;
         framePixelIndex++
      ) {
         const startPixel = edgeFramePixels[framePixelIndex];

         const stepOffset = {
            x: startPixel.x,
            y: startPixel.y,
         };

         const pixel = {
            x: startPixel.x,
            y: startPixel.y,
         };

         const nextPixel = { x: pixel.x, y: pixel.y };

         let inDimensions;
         let integralValue = 0;

         do {
            do {
               stepOffset.x += stepVector.x;
               stepOffset.y += stepVector.y;
               nextPixel.x = Math.round(stepOffset.x);
               nextPixel.y = Math.round(stepOffset.y);
            } while (nextPixel.x === pixel.x && nextPixel.y === pixel.y);

            pixel.x = nextPixel.x;
            pixel.y = nextPixel.y;
            inDimensions =
               pixel.x < dimensions.width &&
               pixel.y < dimensions.height &&
               pixel.x >= 0 &&
               pixel.y >= 0;

            if (inDimensions) {
               // TODO y-flipping?
               const index =
                  pixel.x +
                  (dimensions.height - 1 - pixel.y) * dimensions.width;
               const colorIndex = (pixel.x + pixel.y * dimensions.width) * 4;

               let pixelSlope = 0;

               if (gradientPixelSA[colorIndex + 2] !== 0) {
                  const rightSlope =
                     gradientPixelSA[colorIndex + 0] + SLOPE_SHIFT;
                  const topSlope =
                     gradientPixelSA[colorIndex + 1] + SLOPE_SHIFT;

                  pixelSlope =
                     stepVector.x * rightSlope + stepVector.y * topSlope;
               }

               integralValue -= pixelSlope;
               //integralSA[index] += integralValue;
               Atomics.add(integralSA, index, integralValue);
            }
         } while (inDimensions);
      }
   });

   self.postMessage({ integralSAB: integralSAB });
}

// @ts-ignore
// eslint-disable-next-line no-unused-vars
const depthMap = DepthMapHelper.depthMap;
