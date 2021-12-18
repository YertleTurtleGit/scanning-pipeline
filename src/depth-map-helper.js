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
    * @param {number} perspectiveCorrectingFactor Defines
    * the factor of a radial-exponential depth correction.
    * Zero corresponds to no correction.
    * @returns {Promise<ImageBitmap>} A depth mapping
    * according to the input normal mapping.
    */
   static async calculateDepthMap(
      normalMap,
      qualityPercent = 0.001,
      perspectiveCorrectingFactor = 0
   ) {
      const depthMapHelper = new DepthMapHelper(normalMap, qualityPercent);

      return new Promise((resolve) => {
         setTimeout(async () => {
            if (depthMapHelper.isRenderObsolete()) return;

            const gradientPixelArray =
               await depthMapHelper.getLocalGradientFactor();

            const anglesCount = depthMapHelper.azimuthalAngles.length;

            if (depthMapHelper.isRenderObsolete()) return;

            let workerResolvedCount = 0;
            let integralArrayLock = false;
            const integralArray = new Array(
               normalMap.width * normalMap.height
            ).fill(0);

            const maximumThreadCount = 128;

            /** @type {number[]} */
            const edgeFramePixels = [];

            const topY = -1;
            const bottomY = normalMap.height;
            const leftX = -1;
            const rightX = normalMap.width;

            for (let x = 0; x < normalMap.width; x++) {
               edgeFramePixels.push(x, topY);
               edgeFramePixels.push(x, bottomY);
            }
            for (let y = 0; y < normalMap.height; y++) {
               edgeFramePixels.push(leftX, y);
               edgeFramePixels.push(rightX, y);
            }

            const edgeFramePixelArrayBuffer = new Int16Array(edgeFramePixels);

            for (let i = 0; i < anglesCount; i++) {
               while (i - workerResolvedCount >= maximumThreadCount) {
                  if (depthMapHelper.isRenderObsolete()) return;
                  await new Promise((resolve) => {
                     if (depthMapHelper.isRenderObsolete()) return;
                     setTimeout(resolve, Math.random() * 100);
                  });
               }

               const workerFunction = function workerFunction() {
                  self.addEventListener("message", (messageEvent) => {
                     console.log("received");

                     /**
                      * @param {number} azimuthalAngle
                      * @param {{width:number, height:number}} imageDimensions
                      * @param {Uint8Array} gradientPixelArray
                      * @param {Int16Array} edgeFramePixelArrayBuffer
                      * @returns {number[]}
                      */
                     function calculateAnisotropicIntegral(
                        azimuthalAngle,
                        imageDimensions,
                        edgeFramePixelArrayBuffer,
                        gradientPixelArray
                     ) {
                        const integral = new Array(
                           imageDimensions.width * imageDimensions.height
                        ).fill(0);

                        // Inverse and thus, line FROM and NOT TO azimuthal angle.
                        azimuthalAngle += 180;
                        const azimuthalAngleInRadians =
                           azimuthalAngle * (Math.PI / 180);

                        const stepVector = {
                           x: Math.cos(azimuthalAngleInRadians),
                           y: Math.sin(azimuthalAngleInRadians),
                        };

                        const minimumStep = 0.00000001;

                        if (
                           stepVector.x < minimumStep &&
                           stepVector.x > -minimumStep
                        ) {
                           stepVector.x = 0;
                        }
                        if (
                           stepVector.y < minimumStep &&
                           stepVector.y > -minimumStep
                        ) {
                           stepVector.y = 0;
                        }

                        for (
                           let i = 0,
                              edgeFramePixelsCount =
                                 edgeFramePixelArrayBuffer.length / 2;
                           i < edgeFramePixelsCount;
                           i++
                        ) {
                           const startPixel = {
                              x: edgeFramePixelArrayBuffer[i],
                              y: edgeFramePixelArrayBuffer[i + 1],
                           };

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
                              } while (
                                 nextPixel.x === pixel.x &&
                                 nextPixel.y === pixel.y
                              );

                              pixel.x = nextPixel.x;
                              pixel.y = nextPixel.y;
                              inDimensions =
                                 pixel.x < this.width &&
                                 pixel.y < this.height &&
                                 pixel.x >= 0 &&
                                 pixel.y >= 0;

                              if (inDimensions) {
                                 const index =
                                    pixel.x +
                                    (imageDimensions.height - pixel.y - 1) *
                                       imageDimensions.width;

                                 let pixelSlope = 0;

                                 if (gradientPixelArray[index + 2] > 0) {
                                    const rightSlope =
                                       gradientPixelArray[index + 0] +
                                       DepthMapHelper.SLOPE_SHIFT;
                                    const topSlope =
                                       gradientPixelArray[index + 1] +
                                       DepthMapHelper.SLOPE_SHIFT;

                                    pixelSlope =
                                       stepVector.x * rightSlope +
                                       stepVector.y * topSlope;
                                 }

                                 integralValue += pixelSlope * -1; // TODO Multiply by DEPTH_FACTOR.
                                 integral[index] = integralValue;
                              }
                           } while (inDimensions);
                        }
                        return integral;
                     }

                     self.postMessage(
                        calculateAnisotropicIntegral(
                           messageEvent.data.azimuthalAngle,
                           messageEvent.data.imageDimensions,
                           messageEvent.data.edgeFramePixelArrayBuffer,
                           messageEvent.data.gradientPixelArray
                        )
                     );
                  });
               };

               const integralWorker = new FunctionWorker(workerFunction);

               integralWorker.addMessageEventListener(async (messageEvent) => {
                  const integral = messageEvent.data;
                  integralWorker.terminate();

                  workerResolvedCount++;
                  console.log(workerResolvedCount);

                  if (depthMapHelper.isRenderObsolete()) return;

                  while (integralArrayLock) {
                     await new Promise((resolve) => {
                        if (depthMapHelper.isRenderObsolete()) return;
                        setTimeout(resolve, Math.random() * 100);
                     });
                  }

                  integralArrayLock = true;
                  integral.forEach((value, index) => {
                     integralArray[index] += value / anglesCount;
                  });
                  integralArrayLock = false;

                  /*if (etaElement) {
                        const ETA =
                           ((performance.now() - startTime) /
                              promisesResolvedCount) *
                           (anglesCount - promisesResolvedCount);
   
                        let ETAsec = String(Math.floor((ETA / 1000) % 60));
                        const ETAmin = String(Math.floor(ETA / (60 * 1000)));
   
                        if (ETAsec.length < 2) {
                           ETAsec = "0" + ETAsec;
                        }
   
                        etaElement.innerText =
                           "ETA in " + ETAmin + ":" + ETAsec + " min";
                     }*/

                  if (depthMapHelper.isRenderObsolete()) return;
               });

               integralWorker.postMessage({
                  gradientPixelArray: gradientPixelArray,
                  imageDimensions: {
                     width: normalMap.width,
                     height: normalMap.height,
                  },
                  edgeFramePixelArrayBuffer: edgeFramePixelArrayBuffer,
                  azimuthalAngle: depthMapHelper.azimuthalAngles[i],
               });

               if (depthMapHelper.isRenderObsolete()) return;
            }

            while (workerResolvedCount < anglesCount) {
               if (depthMapHelper.isRenderObsolete()) return;
               await new Promise((resolve) => {
                  setTimeout(resolve, 500);
               });
            }

            if (depthMapHelper.isRenderObsolete()) return;

            const normalizedIntegral =
               await depthMapHelper.getNormalizedIntegralAsGrayscale(
                  integralArray
               );

            if (depthMapHelper.isRenderObsolete()) return;

            const depthMap = await DepthMapHelper.getPerspectiveCorrected(
               await depthMapHelper.getDepthMapImage(normalizedIntegral),
               perspectiveCorrectingFactor
            );

            const maskedDepthMap = await depthMapHelper.applyMask(depthMap);

            resolve(maskedDepthMap);
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
         const canvas = document.createElement("canvas");
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
    * @param {ImageBitmap} inputImage
    * @returns {Promise<ImageBitmap>}
    */
   async applyMask(inputImage) {
      return new Promise((resolve) => {
         const maskShader = new GLSL.Shader({
            width: inputImage.width,
            height: inputImage.height,
         });

         maskShader.bind();

         const input = GLSL.Image.load(inputImage);
         const normal = GLSL.Image.load(this.normalMap);

         const mask = normal.channel(0).step(new GLSL.Float(0.001));

         const maskedInput = input.multiplyFloat(mask);

         resolve(
            GLSL.render(
               new GLSL.Vector4([
                  maskedInput.channel(0),
                  maskedInput.channel(1),
                  maskedInput.channel(2),
                  new GLSL.Float(1),
               ])
            ).getImageBitmap()
         );

         maskShader.purge();
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
    * @public
    * @param {ImageBitmap} image
    * @param {number} factor
    * @returns {Promise<ImageBitmap>}
    */
   static async getPerspectiveCorrected(image, factor) {
      if (factor === 0) {
         return image;
      }

      factor *= 5;

      const shader = new GLSL.Shader({
         width: image.width,
         height: image.height,
      });

      shader.bind();
      const depth = GLSL.Image.load(image).channel(0);

      let vignette = shader
         .getUV()
         .distance(
            new GLSL.Vector2([new GLSL.Float(0.5), new GLSL.Float(0.5)])
         );

      vignette = vignette
         .multiplyFloat(vignette)
         .multiplyFloat(new GLSL.Float(factor));

      const appliedVignette = depth.addFloat(vignette);

      const output = new GLSL.Vector4([
         appliedVignette,
         appliedVignette,
         appliedVignette,
         new GLSL.Float(1),
      ]);

      const perspectiveCorrectedImage = GLSL.render(output).getImageBitmap();

      shader.purge();

      return perspectiveCorrectedImage;
   }

   /**
    * @public
    * @param {ImageBitmap} differenceMap
    * @returns {number}
    */
   static getDifferenceValueFromMap(differenceMap) {
      const width = differenceMap.width;
      const height = differenceMap.height;

      const imageCanvas = document.createElement("canvas");
      imageCanvas.width = width;
      imageCanvas.height = height;
      const imageContext = imageCanvas.getContext("2d");
      imageContext.drawImage(differenceMap, 0, 0, width, height);
      const imageData = imageContext.getImageData(0, 0, width, height).data;

      let differenceValue = 0;
      for (let x = 0; x < width - 1; x++) {
         for (let y = 0; y < height - 1; y++) {
            const index = (x + y * width) * 4;
            const localDifference = imageData[index] / 255;
            differenceValue += localDifference;
         }
      }
      differenceValue /= width * height;

      return differenceValue;
   }
}

/** @constant */
DepthMapHelper.SLOPE_SHIFT = -255 / 2;
DepthMapHelper.renderId = 0;
