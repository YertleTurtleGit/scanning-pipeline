/* global GLSL */
/* exported DepthMapHelper */

/**
 * @global
 * @typedef {number[]} Pixel
 * @typedef {number[]} LinePixel
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
    * @returns {Promise<HTMLImageElement>} A depth mapping
    * according to the input normal mapping.
    */
   static async calculateDepthMap(
      normalMap,
      qualityPercent = 0.001,
      perspectiveCorrectingFactor = 0,
      imageElement = undefined,
      progressElement = undefined
   ) {
      const depthMapHelper = new DepthMapHelper(normalMap, qualityPercent);

      return new Promise((resolve) => {
         setTimeout(async () => {
            if (depthMapHelper.isRenderObsolete()) return;

            if (progressElement) {
               progressElement.removeAttribute("value");
               progressElement.style.height = "1.25rem";
            }

            const gradientPixelArray =
               await depthMapHelper.getLocalGradientFactor();

            const anglesCount = depthMapHelper.azimuthalAngles.length;

            /** @type {Promise[]} */
            const integralPromises = new Array(anglesCount);

            if (depthMapHelper.isRenderObsolete()) return;

            let promisesResolvedCount = 0;

            for (let i = 0; i < anglesCount; i++) {
               integralPromises[i] =
                  depthMapHelper.calculateAnisotropicIntegral(
                     depthMapHelper.azimuthalAngles[i],
                     gradientPixelArray
                  );

               if (progressElement) {
                  integralPromises[i].then(() => {
                     promisesResolvedCount++;
                     const percent = (promisesResolvedCount / anglesCount) * 90;
                     progressElement.value = percent;
                  });
               }
            }

            const integrals = await Promise.all(integralPromises);

            if (depthMapHelper.isRenderObsolete()) return;

            const integral = await depthMapHelper.getAverageIntegralAsGrayscale(
               integrals
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
      const angleDistance = 360 / angleCount;

      this.azimuthalAngles = [];

      let angleOffset = 0;
      for (let i = 0; i < angleCount; i += 2) {
         this.azimuthalAngles.push(angleOffset);
         this.azimuthalAngles.push(180 + angleOffset);
         angleOffset += angleDistance;
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
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = this.width;
            canvas.height = this.height;

            const imageData = ctx.createImageData(this.width, this.height);

            if (this.isRenderObsolete()) return;

            imageData.data.set(integral);

            ctx.putImageData(imageData, 0, 0);

            const image = new Image();
            image.addEventListener("load", () => {
               resolve(image);
            });
            image.src = canvas.toDataURL();
         });
      });
   }

   /**
    * @private
    * @param {number[][]} integrals
    * @returns {Promise<number[]>}
    */
   async getAverageIntegralAsGrayscale(integrals) {
      return new Promise((resolve) => {
         setTimeout(() => {
            const integralsCount = integrals.length;
            const integralCount = integrals[0].length;

            const integral = new Array(integralCount * 4);

            let min = Number.MAX_VALUE;
            let max = Number.MIN_VALUE;

            for (let i = 0; i < integralCount; i++) {
               let averageIntegralValue = 0;
               for (let j = 0; j < integralsCount; j++) {
                  if (integrals[j][i]) {
                     averageIntegralValue += integrals[j][i];
                  }
               }
               const grayscaleValue = averageIntegralValue;
               integral[i * 4 + 0] = grayscaleValue;
               integral[i * 4 + 1] = grayscaleValue;
               integral[i * 4 + 2] = grayscaleValue;
               integral[i * 4 + 3] = null;

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
               integral.map((v) => {
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

         const input = new GLSL.Image(inputImage).getPixelColor();
         const normal = new GLSL.Image(this.normalMap).getPixelColor();

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

            const glslNormalMap = new GLSL.Image(
               this.normalMap
            ).getPixelColor();
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
    * @returns {Promise<number[]>}
    */
   async calculateAnisotropicIntegral(azimuthalAngle, gradientPixelArray) {
      return new Promise((resolve) => {
         setTimeout(async () => {
            let integral = new Array(this.width * this.height);
            let pixelLines = this.getPixelLinesFromAzimuthalAngle(
               azimuthalAngle,
               gradientPixelArray
            );

            if (this.isRenderObsolete()) return;

            for (let j = 0; j < pixelLines.length; j++) {
               let lineOffset = 0;
               for (let k = 0; k < pixelLines[j].length; k++) {
                  const index =
                     pixelLines[j][k][0] +
                     (this.height - 1 - pixelLines[j][k][1]) * this.width;

                  const slope = pixelLines[j][k][2];

                  if (slope === 0) {
                     lineOffset = 0;
                  }

                  integral[index] = lineOffset;
                  lineOffset += slope * -this.DEPTH_FACTOR;
               }
            }

            resolve(integral);
         });
      });
   }

   /**
    * @private
    * @param {number} azimuthalAngle
    * @param {Uint8Array} gradientPixelArray
    * @returns {PixelLine[]}
    */
   getPixelLinesFromAzimuthalAngle(azimuthalAngle, gradientPixelArray) {
      const pixelLines = [];

      // Inverse and thus, line FROM and NOT TO azimuthal angle.
      azimuthalAngle += 180;
      const azimuthalAngleInRadians = azimuthalAngle * (Math.PI / 180);

      const stepVector = [
         Math.cos(azimuthalAngleInRadians),
         Math.sin(azimuthalAngleInRadians),
      ];

      const minimumStep = 0.00000001;

      if (stepVector[0] < minimumStep && stepVector[0] > -minimumStep) {
         stepVector[1] = 0;
      }

      if (stepVector[1] < minimumStep && stepVector[1] > -minimumStep) {
         stepVector[1] = 0;
      }

      const edgeFramePixels = this.getEdgeFramePixels();

      for (
         let i = 0, edgeFramePixelsCount = edgeFramePixels.length;
         i < edgeFramePixelsCount;
         i++
      ) {
         const startPixel = edgeFramePixels[i];
         const pixelLine = this.getPixelLine(
            startPixel,
            stepVector,
            gradientPixelArray
         );
         if (pixelLine.length > 1) {
            pixelLines.push(pixelLine);
         }
      }
      return pixelLines;
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
            this.edgeFramePixels.push([x, topY]);
            this.edgeFramePixels.push([x, bottomY]);
         }
         for (let y = 0; y < this.height; y++) {
            this.edgeFramePixels.push([leftX, y]);
            this.edgeFramePixels.push([rightX, y]);
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
         pixel[0] < this.width &&
         pixel[1] < this.height &&
         pixel[0] >= 0 &&
         pixel[1] >= 0
      );
   }

   /**
    * @private
    * @param {Pixel} startPixel
    * @param {Pixel} stepVector
    * @param {Uint8Array} gradientPixelArray
    * @returns {PixelLine}
    */
   getPixelLine(startPixel, stepVector, gradientPixelArray) {
      const pixelLine = [];

      const stepOffset = {
         x: startPixel[0],
         y: startPixel[1],
      };
      const pixel = [startPixel[0], startPixel[1]];
      const nextPixel = [pixel[0], pixel[1]];

      let inDimensions;

      do {
         do {
            stepOffset[0] += stepVector[0];
            stepOffset[1] += stepVector[1];
            nextPixel[0] = Math.round(stepOffset[0]);
            nextPixel[1] = Math.round(stepOffset[1]);
         } while (nextPixel[0] === pixel[0] && nextPixel[1] === pixel[1]);

         pixel[0] = nextPixel[0];
         pixel[1] = nextPixel[1];
         inDimensions = this.isInDimensions(pixel);

         if (inDimensions) {
            const pixelSlope = this.getPixelSlope(
               pixel,
               stepVector,
               gradientPixelArray
            );

            pixelLine.push([pixel[0], pixel[1], pixelSlope]);
         }
      } while (inDimensions);

      return pixelLine;
   }

   /**
    * @private
    * @param {Pixel} pixel
    * @param {Pixel} stepVector
    * @param {Uint8Array} gradientPixelArray
    * @returns {number}
    */
   getPixelSlope(pixel, stepVector, gradientPixelArray) {
      const index = (pixel[0] + pixel[1] * this.width) * 4;

      if (gradientPixelArray[index + 2] === 0) {
         return 0;
      }

      const rightSlope =
         gradientPixelArray[index + 0] + DepthMapHelper.SLOPE_SHIFT;
      const topSlope =
         gradientPixelArray[index + 1] + DepthMapHelper.SLOPE_SHIFT;

      return stepVector[0] * rightSlope + stepVector[1] * topSlope;
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
      const depth = new GLSL.Image(image).getPixelColor().channel(0);

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

         const depth = new GLSL.Image(depthMap).getPixelColor().channel(0);
         const groundTruth = new GLSL.Image(groundTruthImage)
            .getPixelColor()
            .channel(0);

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
