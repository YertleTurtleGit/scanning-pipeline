/* global GLSL */
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
   static async calculateDepthMap(normalMap, qualityPercent) {
      console.time("calculate depth mapping");
      const startTime = performance.now();

      const maximumThreadCount = Math.pow(2, 8);
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

      const gradientPixelArray = await DepthMapHelper.getLocalGradientFactor(
         normalMap
      );

      const anglesCount = azimuthalAngles.length;

      let promisesResolvedCount = 0;
      const integral = new Array(dimensions.width * dimensions.height).fill(0);

      for (let i = 0; i < anglesCount; i++) {
         while (i - promisesResolvedCount >= maximumThreadCount) {
            await new Promise((resolve) => {
               setTimeout(resolve, Math.random() * 500);
            });
         }

         new Promise((resolve) => {
            let azimuthalAngle = azimuthalAngles[i];

            // Inverse and thus, line FROM and NOT TO azimuthal angle.
            azimuthalAngle += 180;
            const azimuthalAngleInRadians = azimuthalAngle * (Math.PI / 180);

            const stepVector = {
               x: Math.cos(azimuthalAngleInRadians),
               y: Math.sin(azimuthalAngleInRadians),
            };

            const minimumStep = 0.00000001;

            if (stepVector.x < minimumStep && stepVector.x > -minimumStep) {
               stepVector.x = 0;
            }
            if (stepVector.y < minimumStep && stepVector.y > -minimumStep) {
               stepVector.y = 0;
            }

            // TODO caching
            const edgeFramePixels =
               DepthMapHelper.getEdgeFramePixels(dimensions);

            for (
               let i = 0, edgeFramePixelsCount = edgeFramePixels.length;
               i < edgeFramePixelsCount;
               i++
            ) {
               const startPixel = edgeFramePixels[i];

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
                     const index =
                        pixel.x +
                        (dimensions.height - pixel.y - 1) * dimensions.width;

                     let pixelSlope = 0;

                     if (gradientPixelArray[index + 2] !== 0) {
                        const rightSlope =
                           gradientPixelArray[index + 0] +
                           DepthMapHelper.SLOPE_SHIFT;
                        const topSlope =
                           gradientPixelArray[index + 1] +
                           DepthMapHelper.SLOPE_SHIFT;

                        pixelSlope =
                           stepVector.x * rightSlope + stepVector.y * topSlope;
                     }

                     integralValue -= pixelSlope;

                     integral[index] += integralValue / anglesCount;
                  }
               } while (inDimensions);
            }
            resolve();
         }).then(async () => {
            promisesResolvedCount++;

            const percent = (promisesResolvedCount / anglesCount) * 100;
            //nodeCallback.setProgressPercent(percent);

            const ETA =
               ((performance.now() - startTime) / promisesResolvedCount) *
               (anglesCount - promisesResolvedCount);

            let ETAsec = String(Math.floor((ETA / 1000) % 60));
            const ETAmin = String(Math.floor(ETA / (60 * 1000)));

            if (ETAsec.length < 2) {
               ETAsec = "0" + ETAsec;
            }

            const etaString = "ETA in " + ETAmin + ":" + ETAsec + " min";
            console.log(percent + " " + etaString);
         });
      }

      while (promisesResolvedCount < anglesCount) {
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }

      const normalizedIntegral =
         await DepthMapHelper.getNormalizedIntegralAsGrayscale(
            integral,
            dimensions
         );

      const depthMap = await DepthMapHelper.getDepthMapImage(
         normalizedIntegral,
         dimensions
      );

      console.timeEnd("calculate depth mapping");
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
    * @param {number[]} integral
    * @param {{width:number, height:number}} dimensions
    * @returns {Promise<Uint8ClampedArray>}
    */
   static async getNormalizedIntegralAsGrayscale(integral, dimensions) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const normalizedIntegral = new Uint8ClampedArray(
               new ArrayBuffer(dimensions.width * dimensions.height * 4)
            );

            let min = Number.MAX_VALUE;
            let max = Number.MIN_VALUE;

            integral.forEach((value) => {
               if (value > max) {
                  max = value;
               }
               if (value < min) {
                  min = value;
               }
            });

            const maxMinDelta = max - min;

            integral.forEach((value, index) => {
               const normalizedValue = ((value - min) * 255) / maxMinDelta;
               normalizedIntegral[index * 4 + 0] = normalizedValue;
               normalizedIntegral[index * 4 + 1] = normalizedValue;
               normalizedIntegral[index * 4 + 2] = normalizedValue;
               normalizedIntegral[index * 4 + 3] = 255;
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

/** @constant */
DepthMapHelper.SLOPE_SHIFT = -255 / 2;

// @ts-ignore
// eslint-disable-next-line no-unused-vars
const calculateDepthMap = DepthMapHelper.calculateDepthMap;
