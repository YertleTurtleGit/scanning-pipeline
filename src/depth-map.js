/* global IL, FunctionWorker */
/* exported depthMap */

/**
 * @global
 * @typedef {{x: number, y: number}} Pixel
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
      console.time("depth mapping");
      const startTime = performance.now();

      const dimensions = {
         width: normalMap.width,
         height: normalMap.height,
      };

      const maximumAngleCount = dimensions.width * 2 + dimensions.height * 2;
      const angleCount = maximumAngleCount * qualityPercent;
      const azimuthalAngles = [];

      for (
         let angle = 0, angleStep = 360 / angleCount;
         angle < 360;
         angle += angleStep
      ) {
         azimuthalAngles.push(angle);
      }

      const anglesCount = azimuthalAngles.length;
      const threadCount = Math.min(
         navigator.hardwareConcurrency - 1,
         anglesCount
      );
      const maxAnglesPerThread = Math.ceil(angleCount / threadCount + 1);

      let azimuthalAnglesFinished = 0;

      const circularFramePixels =
         DepthMapHelper.getCircularFramePixels(dimensions);

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

      const integralDenominatorSAB = new SharedArrayBuffer(
         dimensions.height * dimensions.width * 4
      );
      const integralDenominatorSA = new Uint32Array(integralDenominatorSAB);
      integralDenominatorSA.set(
         new Uint32Array(integralDenominatorSA.length).fill(1)
      );

      for (let threadId = 0; threadId < threadCount; threadId++) {
         const functionWorker = new FunctionWorker(
            calculateAnisotropicIntegral
         );

         DepthMapHelper.functionWorkers.push(functionWorker);

         const threadAzimuthalAngles = [];
         while (
            azimuthalAngles.length > 0 &&
            threadAzimuthalAngles.length < maxAnglesPerThread
         ) {
            threadAzimuthalAngles.push(azimuthalAngles.pop());
         }

         functionWorker.addMessageEventListener(() => {
            azimuthalAnglesFinished++;

            const percent = (azimuthalAnglesFinished / anglesCount) * 100;
            //nodeCallback.setProgressPercent(percent);

            const ETA =
               ((performance.now() - startTime) / azimuthalAnglesFinished) *
               (anglesCount - azimuthalAnglesFinished);

            let ETAsec = String(Math.floor((ETA / 1000) % 60));
            const ETAmin = String(Math.floor(ETA / (60 * 1000)));

            if (ETAsec.length < 2) ETAsec = "0" + ETAsec;

            const etaString = "ETA in " + ETAmin + ":" + ETAsec + " min";
            console.log(percent + " // " + etaString);
         });

         functionWorker.postMessage({
            azimuthalAngles: threadAzimuthalAngles,
            dimensions: dimensions,
            circularFramePixels: circularFramePixels,
            gradientPixelSAB: gradientPixelSAB,
            integralSAB: integralSAB,
            integralDenominatorSAB: integralDenominatorSAB,
         });
      }

      while (azimuthalAnglesFinished < anglesCount) {
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }

      const normalizedIntegral =
         await DepthMapHelper.getNormalizedIntegralAsGrayscale(
            integralSA,
            integralDenominatorSA,
            dimensions
         );

      const depthMap = await DepthMapHelper.getDepthMapImage(
         normalizedIntegral,
         dimensions
      );

      console.timeEnd("depth mapping");
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
    * @param {Uint32Array} integralDenominator
    * @param {{width:number, height:number}} dimensions
    * @returns {Promise<Uint8ClampedArray>}
    */
   static async getNormalizedIntegralAsGrayscale(
      integral,
      integralDenominator,
      dimensions
   ) {
      return new Promise((resolve) => {
         const colorImageArrayLength = dimensions.width * dimensions.height * 4;
         const normalizedIntegral = new Uint8ClampedArray(
            new ArrayBuffer(colorImageArrayLength)
         );

         let maxDenominator = 1;
         integralDenominator.forEach((denominator) => {
            if (denominator > maxDenominator) maxDenominator = denominator;
         });

         integral.forEach((value, index) => {
            const denominator = Math.max(integralDenominator[index] - 1, 1);
            integral[index] = (value * maxDenominator) / denominator;
         });

         let min = Number.MAX_VALUE;
         let max = Number.MIN_VALUE;

         integral.forEach((value) => {
            if (value > max) max = value;
            if (value < min) min = value;
         });

         if (min <= -(2 ** 32) / 2 || max >= 2 ** 32 / 2) {
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
   }

   /**
    * @private
    * @param {ImageBitmap} normalMap
    * @returns {Promise<Uint8Array>}
    */
   static getLocalGradientFactor(normalMap) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const depthMapShader = new IL.Shader({
               width: normalMap.width,
               height: normalMap.height,
            });
            depthMapShader.bind();

            const glslNormalMap = IL.Image.load(normalMap);
            const red = glslNormalMap.channel(0);
            const green = glslNormalMap.channel(1);
            const blue = glslNormalMap.channel(2);
            const result = new IL.ShaderVariable.Vector3([
               red.divideFloat(blue),
               green.divideFloat(blue),
               blue.minimum(red, green),
            ]);

            const gradientPixelArray = IL.render(
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
   static getCircularFramePixels(dimensions) {
      const radius = Math.max(dimensions.width, dimensions.height);
      const resolution = 2 * Math.PI * radius;

      /** @type {Pixel[]} */
      const circularFramePixels = [];

      const polarIndexFactor = (Math.PI * 2) / resolution;
      const xShift = dimensions.width / 2;
      const yShift = dimensions.height / 2;

      for (let i = 0; i < resolution; i++) {
         const polarAngle = polarIndexFactor * i;
         const x = radius * Math.cos(polarAngle) + xShift;
         const y = radius * Math.sin(polarAngle) + yShift;
         circularFramePixels.push({ x: x, y: y });
      }

      return circularFramePixels;
   }
}
/** @type {FunctionWorker[]} */
DepthMapHelper.functionWorkers = [];

// @ts-ignore
// eslint-disable-next-line no-unused-vars
const calculateDepthMap = DepthMapHelper.depthMap;

/**
 * @private
 * @param {MessageEvent} messageEvent
 */
function calculateAnisotropicIntegral(messageEvent) {
   const azimuthalAngles = messageEvent.data.azimuthalAngles;
   const dimensions = messageEvent.data.dimensions;
   const circularFramePixels = messageEvent.data.circularFramePixels;

   const gradientPixelSAB = messageEvent.data.gradientPixelSAB;
   const gradientPixelSA = new Uint8Array(gradientPixelSAB);

   const integralSAB = messageEvent.data.integralSAB;
   const integralSA = new Int32Array(integralSAB);

   const integralDenominatorSAB = messageEvent.data.integralDenominatorSAB;
   const integralDenominatorSA = new Uint32Array(integralDenominatorSAB);

   const slopeShift = -255 / 2;
   const radius = Math.max(dimensions.width, dimensions.height);

   azimuthalAngles.forEach((azimuthalAngle) => {
      // Inverse and thus, line FROM and NOT TO azimuthal angle.
      azimuthalAngle += 180;
      const azimuthalAngleInRadians = azimuthalAngle * (Math.PI / 180);

      const stepVector = {
         x: Math.cos(azimuthalAngleInRadians),
         y: Math.sin(azimuthalAngleInRadians),
      };

      const minimumStep = Number.MIN_VALUE;
      if (Math.abs(stepVector.x) <= minimumStep) stepVector.x = 0;
      if (Math.abs(stepVector.y) <= minimumStep) stepVector.y = 0;

      for (
         let framePixelIndex = 0,
            circularFramePixelsCount = circularFramePixels.length;
         framePixelIndex < circularFramePixelsCount;
         framePixelIndex++
      ) {
         const startPixel = circularFramePixels[framePixelIndex];

         const stepOffset = {
            x: startPixel.x,
            y: startPixel.y,
         };

         const pixel = {
            x: Math.round(startPixel.x),
            y: Math.round(startPixel.y),
         };

         const nextPixel = { x: pixel.x, y: pixel.y };

         let inDimensions;
         let inRadius;
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
               inRadius = true;
            } else {
               const distanceToCenter = Math.sqrt(
                  (dimensions.width / 2 - pixel.x) ** 2 +
                     (dimensions.height / 2 - pixel.y) ** 2
               );
               inRadius = distanceToCenter <= radius;
            }

            if (inDimensions) {
               // TODO y-flipping?
               const index =
                  pixel.x +
                  (dimensions.height - 1 - pixel.y) * dimensions.width;
               const colorIndex = (pixel.x + pixel.y * dimensions.width) * 4;

               let pixelSlope = 0;

               if (gradientPixelSA[colorIndex + 2] !== 0) {
                  const rightSlope =
                     gradientPixelSA[colorIndex + 0] + slopeShift;
                  const topSlope = gradientPixelSA[colorIndex + 1] + slopeShift;

                  pixelSlope =
                     stepVector.x * rightSlope + stepVector.y * topSlope;

                  integralValue -= pixelSlope;
               } else {
                  integralValue = 0;
               }

               Atomics.add(integralSA, index, integralValue);
               Atomics.add(integralDenominatorSA, index, 1);
            }
         } while (inRadius);
      }
      self.postMessage({ azimuthalAngle: azimuthalAngle });
      self.close();
   });
}

function onClose() {
   DepthMapHelper.functionWorkers.forEach((functionWorker) => {
      functionWorker.terminate();
   });
   self.close();
}

// @ts-ignore
// eslint-disable-next-line no-unused-vars
const depthMap = DepthMapHelper.depthMap;
