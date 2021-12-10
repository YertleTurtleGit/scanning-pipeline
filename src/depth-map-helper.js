/* global GLSL */
/* exported calculateDepthMap */

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
 * @param {number} perspectiveCorrectionFactor Defines
 * the factor of a radial-exponential depth correction.
 * Zero corresponds to no correction.
 * @param {number} depthFactor
 * @returns {Promise<ImageBitmap>} A depth mapping
 * according to the input normal mapping.
 */
function calculateDepthMap(
   normalMap,
   qualityPercent,
   perspectiveCorrectionFactor,
   depthFactor
) {
   const maximumAngleCount = normalMap.width * 2 + normalMap.height * 2;
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

   const depthMapping = new Promise((resolve) => {
      setTimeout(async () => {
         const gradientPixelArray = await new Promise((resolve) => {
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

         const anglesCount = azimuthalAngles.length;

         let promisesResolvedCount = 0;
         let integralArrayLock = false;
         const integralArray = new Array(
            normalMap.width * normalMap.height
         ).fill(0);

         const startTime = performance.now();

         const maximumThreadCount = 128;

         const calculateAnisotropicIntegral = (
            azimuthalAngle,
            gradientPixelArray
         ) => {
            const integral = new Array(normalMap.width * normalMap.height).fill(
               0
            );

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
                     const index =
                        pixel.x +
                        (normalMap.height - pixel.y - 1) * normalMap.width;

                     const pixelSlope = this.getPixelSlope(
                        pixel,
                        stepVector,
                        gradientPixelArray
                     );

                     integralValue += pixelSlope * -depthFactor;
                     integral[index] = integralValue;
                  }
               } while (inDimensions);
            }
            return integral;
         };

         for (let i = 0; i < anglesCount; i++) {
            while (i - promisesResolvedCount >= maximumThreadCount) {
               await new Promise((resolve) => {
                  setTimeout(resolve, Math.random() * 100);
               });
            }

            const integralPromise = new Promise((resolve) => {
               setTimeout(async () => {
                  resolve(
                     calculateAnisotropicIntegral(
                        azimuthalAngles[i],
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

               const ETA =
                  ((performance.now() - startTime) / promisesResolvedCount) *
                  (anglesCount - promisesResolvedCount);

               let ETAsec = String(Math.floor((ETA / 1000) % 60));
               //const ETAmin = String(Math.floor(ETA / (60 * 1000)));

               if (ETAsec.length < 2) {
                  ETAsec = "0" + ETAsec;
               }
            });
         }

         while (promisesResolvedCount < anglesCount) {
            await new Promise((resolve) => {
               setTimeout(resolve, 500);
            });
         }

         const normalizedIntegral = await new Promise((resolve) => {
            setTimeout(() => {
               const normalizedIntegral = new Uint8ClampedArray(
                  new ArrayBuffer(normalMap.width * normalMap.height * 4)
               );

               let min = Number.MAX_VALUE;
               let max = Number.MIN_VALUE;

               integralArray.forEach((value) => {
                  if (value > max) {
                     max = value;
                  }
                  if (value < min) {
                     min = value;
                  }
               });

               const maxMinDelta = max - min;

               integralArray.forEach((value, index) => {
                  const normalizedValue = ((value - min) * 255) / maxMinDelta;
                  normalizedIntegral[index * 4 + 0] = normalizedValue;
                  normalizedIntegral[index * 4 + 1] = normalizedValue;
                  normalizedIntegral[index * 4 + 2] = normalizedValue;
                  normalizedIntegral[index * 4 + 3] = 255;
               });

               resolve(normalizedIntegral);
            });
         });

         const depthMapImage = await new Promise((resolve) => {
            setTimeout(() => {
               if (Math.min(normalMap.width, normalMap.height) > 0) {
                  const canvas = document.createElement("canvas");
                  const context = canvas.getContext("2d");

                  canvas.width = normalMap.width;
                  canvas.height = normalMap.height;

                  const imageData = new ImageData(
                     normalizedIntegral,
                     normalMap.width,
                     normalMap.height
                  );

                  context.putImageData(imageData, 0, 0);

                  resolve(createImageBitmap(canvas));
               }
            });
         });

         /*const depthMap = await DepthMapHelper.getPerspectiveCorrected(
               depthMapImage,
               perspectiveCorrectionFactor
            );*/

         resolve(depthMapImage);
      }, 100);
   });

   return depthMapping;
}
