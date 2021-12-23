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
      const depthMapHelper = new DepthMapHelper(normalMap, qualityPercent);

      return new Promise((resolve) => {
         setTimeout(async () => {
            const gradientPixelArray =
               await depthMapHelper.getLocalGradientFactor();

            const anglesCount = depthMapHelper.azimuthalAngles.length;

            let promisesResolvedCount = 0;
            let integralArrayLock = false;
            const integralArray = new Array(
               normalMap.width * normalMap.height
            ).fill(0);

            const maximumThreadCount = 128;

            const startTime = performance.now();

            for (let i = 0; i < anglesCount; i++) {
               while (i - promisesResolvedCount >= maximumThreadCount) {
                  await new Promise((resolve) => {
                     setTimeout(resolve, Math.random() * 100);
                  });
               }

               const integralPromise = new Promise((resolve) => {
                  setTimeout(async () => {
                     resolve(
                        depthMapHelper.calculateAnisotropicIntegral(
                           depthMapHelper.azimuthalAngles[i],
                           gradientPixelArray
                        )
                     );
                  });
               });

               integralPromise.then(async (integral) => {
                  promisesResolvedCount++;

                  while (integralArrayLock) {
                     await new Promise((resolve) => {
                        setTimeout(resolve, Math.random() * 100);
                     });
                  }

                  integralArrayLock = true;
                  integral.forEach((value, index) => {
                     integralArray[index] += value / anglesCount;
                  });
                  integralArrayLock = false;

                  const percent = (promisesResolvedCount / anglesCount) * 90;
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
               await depthMapHelper.getNormalizedIntegralAsGrayscale(
                  integralArray
               );

            //if (progressElement) progressElement.value = 95;

            const depthMap = await depthMapHelper.getDepthMapImage(
               normalizedIntegral
            );

            console.log("resolved " + qualityPercent);
            resolve(depthMap);

            ///nodeCallback.setProgressPercent(100);
         }, 100);
      });
   }

   /**
    * @public
    */
   static cancelRenderJobs() {
      DepthMapHelper.renderId++;
   }

   /**
    * @private
    * @param {ImageBitmap} normalMap
    * @param {number} qualityPercent
    */
   constructor(normalMap, qualityPercent) {
      /** @constant */
      this.DEPTH_FACTOR = 1;

      this.normalMap = normalMap;
      this.qualityPercent = qualityPercent;

      this.renderId = DepthMapHelper.renderId;
      this.width = normalMap.width;
      this.height = normalMap.height;

      const maximumAngleCount = this.width * 2 + this.height * 2;
      const angleCount = Math.round(maximumAngleCount * this.qualityPercent);

      this.azimuthalAngles = [];

      for (let frac = 1; frac < angleCount; frac *= 2) {
         for (let angle = 0; angle < 360; angle += 360 / frac) {
            if (!this.azimuthalAngles.includes(angle)) {
               this.azimuthalAngles.push(angle);
               this.azimuthalAngles.push(180 + angle);
            }
         }
      }
   }

   /**
    * @private
    * @returns {boolean}
    */
   isRenderObsolete() {
      return this.renderId < DepthMapHelper.renderId;
   }

   /**
    * @private
    * @param {Uint8ClampedArray} integral
    * @returns {Promise<ImageBitmap>}
    */
   async getDepthMapImage(integral) {
      if (Math.min(this.width, this.height) > 0) {
         const dim = new Uint32Array(2);
         dim[0] = this.width;
         dim[1] = this.height;
         const canvas = new OffscreenCanvas(dim[0], dim[1]);
         const context = canvas.getContext("2d");

         canvas.width = this.width;
         canvas.height = this.height;

         const imageData = new ImageData(integral, this.width, this.height);

         if (this.isRenderObsolete()) return;

         context.putImageData(imageData, 0, 0);

         return createImageBitmap(canvas);
      }
   }

   /**
    * @private
    * @param {number[]} integral
    * @returns {Promise<Uint8ClampedArray>}
    */
   async getNormalizedIntegralAsGrayscale(integral) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const normalizedIntegral = new Uint8ClampedArray(
               new ArrayBuffer(this.width * this.height * 4)
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

            if (this.isRenderObsolete()) return;

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
    * @returns {Promise<Uint8Array>}
    */
   getLocalGradientFactor() {
      return new Promise((resolve) => {
         setTimeout(() => {
            if (this.isRenderObsolete()) return;

            const depthMapShader = new GLSL.Shader({
               width: this.width,
               height: this.height,
            });
            depthMapShader.bind();

            const glslNormalMap = GLSL.Image.load(this.normalMap);
            const red = glslNormalMap.channel(0);
            const green = glslNormalMap.channel(1);
            const blue = glslNormalMap.channel(2);
            const result = new GLSL.Vector3([
               red.divideFloat(blue),
               green.divideFloat(blue),
               blue.minimum(red, green),
            ]);

            if (this.isRenderObsolete()) return;

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
    * @param {number} azimuthalAngle
    * @param {Uint8Array} gradientPixelArray
    * @returns {number[]}
    */
   calculateAnisotropicIntegral(azimuthalAngle, gradientPixelArray) {
      const integral = new Array(this.width * this.height).fill(0);

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

      const edgeFramePixels = this.getEdgeFramePixels();

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
            inDimensions = this.isInDimensions(pixel);

            if (inDimensions) {
               const index = pixel.x + (this.height - pixel.y - 1) * this.width;

               const pixelSlope = this.getPixelSlope(
                  pixel,
                  stepVector,
                  gradientPixelArray
               );

               integralValue += pixelSlope * -this.DEPTH_FACTOR;
               integral[index] = integralValue;
            }
         } while (inDimensions);
      }
      return integral;
   }

   /**
    * @private
    * @returns {Pixel[]}
    */
   getEdgeFramePixels() {
      if (this.edgeFramePixels === undefined) {
         /** @type {Pixel[]} */
         this.edgeFramePixels = [];

         const topY = -1;
         const bottomY = this.height;
         const leftX = -1;
         const rightX = this.width;

         for (let x = 0; x < this.width; x++) {
            this.edgeFramePixels.push({ x: x, y: topY });
            this.edgeFramePixels.push({ x: x, y: bottomY });
         }
         for (let y = 0; y < this.height; y++) {
            this.edgeFramePixels.push({ x: leftX, y: y });
            this.edgeFramePixels.push({ x: rightX, y: y });
         }
      }
      return this.edgeFramePixels;
   }

   /**
    * @private
    * @param {Pixel} pixel
    * @returns {boolean}
    */
   isInDimensions(pixel) {
      return (
         pixel.x < this.width &&
         pixel.y < this.height &&
         pixel.x >= 0 &&
         pixel.y >= 0
      );
   }

   /**
    * @private
    * @param {Pixel} pixel
    * @param {Pixel} stepVector
    * @param {Uint8Array} gradientPixelArray
    * @returns {number}
    */
   getPixelSlope(pixel, stepVector, gradientPixelArray) {
      const index = (pixel.x + pixel.y * this.width) * 4;

      if (gradientPixelArray[index + 2] === 0) {
         return 0;
      }

      const rightSlope =
         gradientPixelArray[index + 0] + DepthMapHelper.SLOPE_SHIFT;
      const topSlope =
         gradientPixelArray[index + 1] + DepthMapHelper.SLOPE_SHIFT;

      return stepVector.x * rightSlope + stepVector.y * topSlope;
   }
}

/** @constant */
DepthMapHelper.SLOPE_SHIFT = -255 / 2;
DepthMapHelper.renderId = 0;
