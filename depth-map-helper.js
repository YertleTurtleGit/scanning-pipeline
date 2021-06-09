//@ts-check
"use strict";

class DepthMapHelper {
   /**
    * @public
    * @param {HTMLImageElement} normalMap
    * @param {number} qualityPercent
    * @returns {Promise<HTMLImageElement>}
    */
   static async getDepthMap(normalMap, qualityPercent = 0.01) {
      const depthMapHelper = new DepthMapHelper(normalMap, qualityPercent);

      const gradientPixelArray = depthMapHelper.getLocalGradientFactor();

      const anglesCount = depthMapHelper.azimuthalAngles.length;
      const integralPromises = new Array(anglesCount);

      for (let i = 0; i < anglesCount; i++) {
         integralPromises[i] = depthMapHelper.calculateAnisotropicIntegral(
            depthMapHelper.azimuthalAngles[i],
            gradientPixelArray
         );
      }

      const integrals = await Promise.all(integralPromises);
      const integral = depthMapHelper.getAverageIntegralAsGrayscale(integrals);

      return depthMapHelper.getDepthMapImage(integral);
   }

   /**
    * @private
    * @param {HTMLImageElement} normalMap
    */
   constructor(normalMap, qualityPercent) {
      /** @constant */
      this.DEPTH_FACTOR = 1;

      /** @constant */
      this.SLOPE_SHIFT = -255 / 2;

      this.normalMap = normalMap;
      this.qualityPercent = qualityPercent;
      this.width = normalMap.width;
      this.height = normalMap.height;

      const maximumAngleCount = this.width * 2 + this.height * 2;
      const angleCount = Math.round(maximumAngleCount * this.qualityPercent);
      const angleDistance = 360 / angleCount;

      this.azimuthalAngles = new Array(angleCount).fill(null);

      let angleOffset = 0;
      for (
         let i = 0, anglesCount = this.azimuthalAngles.length;
         i < anglesCount;
         i++
      ) {
         this.azimuthalAngles[i] = angleOffset;
         angleOffset += angleDistance;
      }
   }

   /**
    * @private
    * @param {number[]} integral
    * @returns {Promise<HTMLImageElement>}
    */
   getDepthMapImage(integral) {
      const buffer = new Uint8ClampedArray(this.width * this.height * 4);

      // create off-screen canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = this.width;
      canvas.height = this.height;

      const imageData = ctx.createImageData(this.width, this.height);

      imageData.data.set(integral);

      // update canvas with new data
      ctx.putImageData(imageData, 0, 0);

      return new Promise((resolve) => {
         const image = new Image();
         image.addEventListener("load", () => {
            resolve(image);
         });
         image.src = canvas.toDataURL();
      });
   }

   /**
    * @private
    * @param {number[][]} integrals
    * @return {number[]}
    */
   getAverageIntegralAsGrayscale(integrals) {
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

      const normalizeDivisor = Math.abs(min) + max;

      return integral.map((v) => {
         if (v === null) {
            return 255;
         }
         return ((v + Math.abs(min)) / normalizeDivisor) * 255;
      });
   }

   /**
    * @private
    * @returns {Uint8Array}
    */
   getLocalGradientFactor() {
      const depthMapShader = new Shader({
         width: this.width,
         height: this.height,
      });
      depthMapShader.bind();

      const glslNormalMap = GlslImage.load(this.normalMap);
      const red = glslNormalMap.channel(0);
      const green = glslNormalMap.channel(1);
      const blue = glslNormalMap.channel(2);
      const result = new GlslVector3([
         red.divideFloat(blue),
         green.divideFloat(blue),
         blue,
      ]);
      const gradientPixelArray = GlslRendering.render(
         result.getVector4()
      ).getPixelArray();

      depthMapShader.purge();
      return gradientPixelArray;
   }

   /**
    * @private
    * @param {number} azimuthalAngle
    * @param {Uint8Array} gradientPixelArray
    * @returns {Promise<number[]>}
    */
   async calculateAnisotropicIntegral(azimuthalAngle, gradientPixelArray) {
      return new Promise((resolve) => {
         setTimeout(() => {
            let integral = new Array(this.width * this.height);
            let pixelLines = this.getPixelLinesFromAzimuthalAngle(
               azimuthalAngle,
               gradientPixelArray
            );

            for (let j = 0; j < pixelLines.length; j++) {
               let lineOffset = 0;
               for (let k = 0; k < pixelLines[j].length; k++) {
                  const index =
                     pixelLines[j][k].x + pixelLines[j][k].y * this.width;
                  integral[index] = lineOffset;
                  lineOffset += pixelLines[j][k].slope * -this.DEPTH_FACTOR;
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
    * @returns {{ x: number; y: number; slope: number }[][]}
    */
   getPixelLinesFromAzimuthalAngle(azimuthalAngle, gradientPixelArray) {
      const pixelLines = [];

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
    * @returns {{x:number, y:number}[]}
    */
   getEdgeFramePixels() {
      if (this.edgeFramePixels === undefined) {
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
    * @param {{x:number, y:number}} pixel
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
    * @param {{x:number, y:number}} startPixel
    * @param {{x:number, y:number}} stepVector
    * @param {Uint8Array} gradientPixelArray
    * @returns {{ x: number; y: number; slope: number }[]}
    */
   getPixelLine(startPixel, stepVector, gradientPixelArray) {
      const pixelLine = [];
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
            const pixelSlope = this.getPixelSlope(
               pixel,
               stepVector,
               gradientPixelArray
            );
            pixelLine.push({ x: pixel.x, y: pixel.y, slope: pixelSlope });
         }
      } while (inDimensions);
      return pixelLine;
   }

   /**
    * @private
    * @param {{x:number, y:number}} pixel
    * @param {{x:number, y:number}} stepVector
    * @param {Uint8Array} gradientPixelArray
    * @returns {number}
    */
   getPixelSlope(pixel, stepVector, gradientPixelArray) {
      const index = (pixel.x + pixel.y * this.width) * 4;
      const rightSlope = gradientPixelArray[index + 0] + this.SLOPE_SHIFT;
      const topSlope = gradientPixelArray[index + 1] + this.SLOPE_SHIFT;
      return stepVector.x * rightSlope + stepVector.y * topSlope;
   }
}
