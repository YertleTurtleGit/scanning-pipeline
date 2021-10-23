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
    * @param {HTMLImageElement} normalMap The normal mapping
    * that is used to calculate the depth mapping.
    * @param {number} qualityPercent The quality in percent
    * defines how many anisotropic integrals are taken into
    * account to archive a higher quality depth mapping.
    * @param {number} perspectiveCorrectingFactor Defines
    * the factor of a radial-exponential depth correction.
    * Zero corresponds to no correction.
    * @param {HTMLImageElement} imageElement The UI-element
    * to display the resulting depth mapping.
    * @param {HTMLProgressElement} progressElement The
    * UI-element to display the progress.
    * @param {boolean} updateResultOnProgress Defines
    * whether the image element should be updated on
    * progress.
    * @returns {Promise<HTMLImageElement>} A depth mapping
    * according to the input normal mapping.
    */
   static async calculateDepthMap(
      normalMap,
      qualityPercent = 0.001,
      perspectiveCorrectingFactor = 0,
      imageElement = undefined,
      progressElement = undefined,
      updateResultOnProgress = false
   ) {
      const depthMapHelper = new DepthMapHelper(normalMap, qualityPercent);

      return new Promise((resolve) => {
         setTimeout(async () => {
            if (depthMapHelper.isRenderObsolete()) return;

            if (progressElement) {
               progressElement.removeAttribute("value");
               progressElement.style.height = "1.25rem";
            }

            const gradientPixelArray = depthMapHelper.getLocalGradientFactor();

            const anglesCount = depthMapHelper.azimuthalAngles.length;

            if (depthMapHelper.isRenderObsolete()) return;

            let promisesResolvedCount = 0;
            let integralArrayLock = false;
            const integralArray = new Array(
               normalMap.naturalWidth * normalMap.naturalHeight
            ).fill(0);

            const maximumThreadCount = 64;
            const updateInterval = 10000;
            let lastUpdated = performance.now();
            let currentlyUpdating = false;

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
                           await gradientPixelArray
                        )
                     );
                  });
               });

               integralPromise.then(async (integral) => {
                  while (integralArrayLock || currentlyUpdating) {
                     await new Promise((resolve) => {
                        setTimeout(resolve, Math.random() * 100);
                     });
                  }

                  if (
                     updateResultOnProgress &&
                     lastUpdated + updateInterval < performance.now()
                  ) {
                     currentlyUpdating = true;
                     const previewIntegral =
                        await depthMapHelper.getNormalizedIntegralAsGrayscale(
                           integralArray
                        );
                     const depthMapSource =
                        depthMapHelper.getDepthMapImageSource(previewIntegral);

                     imageElement.src = depthMapSource;

                     lastUpdated = performance.now();
                     currentlyUpdating = false;
                  }

                  integralArrayLock = true;
                  integral.forEach((value, index) => {
                     integralArray[index] += value / anglesCount;
                  });
                  integralArrayLock = false;

                  promisesResolvedCount++;

                  if (progressElement) {
                     const percent = (promisesResolvedCount / anglesCount) * 90;
                     progressElement.value = percent;
                  }

                  if (depthMapHelper.isRenderObsolete()) return;
               });

               if (depthMapHelper.isRenderObsolete()) return;
            }

            while (promisesResolvedCount < anglesCount) {
               await new Promise((resolve) => {
                  setTimeout(resolve, 500);
               });
            }

            if (depthMapHelper.isRenderObsolete()) return;

            const integral =
               await depthMapHelper.getNormalizedIntegralAsGrayscale(
                  integralArray
               );

            if (progressElement) progressElement.value = 95;

            if (depthMapHelper.isRenderObsolete()) return;

            const depthMap = await DepthMapHelper.getPerspectiveCorrected(
               await depthMapHelper.getDepthMapImage(integral),
               perspectiveCorrectingFactor
            );

            const maskedDepthMap = await depthMapHelper.applyMask(depthMap);

            resolve(maskedDepthMap);

            if (imageElement && maskedDepthMap) {
               imageElement.src = maskedDepthMap.src;
            }

            if (progressElement) {
               progressElement.value = 100;
               progressElement.style.height = "0";
            }
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
    * @param {HTMLImageElement} normalMap
    * @param {number} qualityPercent
    */
   constructor(normalMap, qualityPercent) {
      /** @constant */
      this.DEPTH_FACTOR = 1;

      this.normalMap = normalMap;
      this.qualityPercent = qualityPercent;

      this.renderId = DepthMapHelper.renderId;
      this.width = normalMap.naturalWidth;
      this.height = normalMap.naturalHeight;

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
    * @param {number[]} integral
    * @returns {Promise<HTMLImageElement>}
    */
   async getDepthMapImage(integral) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const image = new Image();
            image.addEventListener("load", () => {
               resolve(image);
            });
            image.src = this.getDepthMapImageSource(integral);
         });
      });
   }

   /**
    * @private
    * @param {number[]} integral
    * @returns {string}
    */
   getDepthMapImageSource(integral) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = this.width;
      canvas.height = this.height;

      const imageData = ctx.createImageData(this.width, this.height);

      if (this.isRenderObsolete()) return;

      imageData.data.set(integral);

      ctx.putImageData(imageData, 0, 0);

      return canvas.toDataURL();
   }

   /**
    * @private
    * @param {number[]} integral
    * @returns {Promise<number[]>}
    */
   async getNormalizedIntegralAsGrayscale(integral) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const integralCount = integral.length;

            const normalizedIntegral = new Array(integralCount * 4);

            let min = Number.MAX_VALUE;
            let max = Number.MIN_VALUE;

            for (let i = 0; i < integralCount; i++) {
               const grayscaleValue = integral[i];
               normalizedIntegral[i * 4 + 0] = grayscaleValue;
               normalizedIntegral[i * 4 + 1] = grayscaleValue;
               normalizedIntegral[i * 4 + 2] = grayscaleValue;
               normalizedIntegral[i * 4 + 3] = null;

               if (grayscaleValue > max) {
                  max = grayscaleValue;
               }
               if (grayscaleValue < min) {
                  min = grayscaleValue;
               }
            }

            if (this.isRenderObsolete()) return;

            const normalizeDivisor = Math.abs(min) + Math.abs(max);

            resolve(
               normalizedIntegral.map((v) => {
                  if (v === null) {
                     return 255;
                  }
                  return ((v + Math.abs(min)) / normalizeDivisor) * 255;
               })
            );
         });
      });
   }

   /**
    * @param {HTMLImageElement} inputImage
    * @returns {Promise<HTMLImageElement>}
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
            ).getJsImage()
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

   /**
    * @public
    * @param {HTMLImageElement} image
    * @param {number} factor
    * @returns {Promise<HTMLImageElement>}
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

      const perspectiveCorrectedImage = GLSL.render(output).getJsImage();

      shader.purge();

      return perspectiveCorrectedImage;
   }

   /**
    * @public
    * @param {HTMLImageElement} depthMap
    * @param {HTMLImageElement} groundTruthImage
    * @returns {Promise<number>}
    */
   static async getDifferenceValue(depthMap, groundTruthImage) {
      const differenceMap = await DepthMapHelper.getDifferenceMap(
         depthMap,
         groundTruthImage
      );

      return DepthMapHelper.getDifferenceValueFromMap(differenceMap);
   }

   /**
    * @public
    * @param {HTMLImageElement} differenceMap
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

   /**
    * @public
    * @param {HTMLImageElement} depthMap
    * @param {HTMLImageElement} groundTruthImage
    * @returns {Promise<HTMLImageElement>}
    */
   static async getDifferenceMap(depthMap, groundTruthImage) {
      return new Promise((resolve) => {
         const differenceShader = new GLSL.Shader({
            width: depthMap.width,
            height: depthMap.height,
         });
         differenceShader.bind();

         const depth = GLSL.Image.load(depthMap).channel(0);
         const groundTruth = GLSL.Image.load(groundTruthImage).channel(0);

         const zeroAsErrorSummand = new GLSL.Float(1).subtractFloat(
            depth
               .step(new GLSL.Float(0.001))
               .divideFloat(groundTruth.step(new GLSL.Float(0.001)))
         );

         const differenceValue = depth
            .subtractFloat(groundTruth)
            .abs()
            .addFloat(zeroAsErrorSummand);

         const differenceMap = new Image();
         differenceMap.addEventListener("load", () => {
            resolve(differenceMap);
         });
         differenceMap.src = GLSL.render(
            new GLSL.Vector4([
               differenceValue,
               differenceValue,
               differenceValue,
               new GLSL.Float(1),
            ])
         ).getDataUrl();

         differenceShader.purge();
      });
   }
}

/** @constant */
DepthMapHelper.SLOPE_SHIFT = -255 / 2;
DepthMapHelper.renderId = 0;
