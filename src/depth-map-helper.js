/* global GLSL */
/* exported calculateDepthMap */

/*
 * @param {number} qualityPercent The quality in percent
 * defines how many anisotropic integrals are taken into
 * account to archive a higher quality depth mapping.
 * @param {number} perspectiveCorrectionFactor Defines
 * the factor of a radial-exponential depth correction.
 * Zero corresponds to no correction.
 * @param {number} depthFactor
 */

/**
 * This functions calculates a depth mapping by a given
 * normal mapping.
 *
 * @public
 * @param {ImageBitmap} normalMap The normal mapping
 * that is used to calculate the depth mapping.
 * @returns {Promise<ImageBitmap>} A depth mapping
 * according to the input normal mapping.
 */
async function calculateDepthMap(normalMap) {
   const qualityPercent = 0.01;
   //const perspectiveCorrectionFactor = 0;
   const depthFactor = 1;

   const SLOPE_SHIFT = -255 / 2;

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

         const edgeFramePixels = [];

         const topY = -1;
         const bottomY = normalMap.height;
         const leftX = -1;
         const rightX = normalMap.width;

         for (let x = 0; x < normalMap.width; x++) {
            edgeFramePixels.push({ x: x, y: topY });
            edgeFramePixels.push({ x: x, y: bottomY });
         }
         for (let y = 0; y < normalMap.height; y++) {
            edgeFramePixels.push({ x: leftX, y: y });
            edgeFramePixels.push({ x: rightX, y: y });
         }

         for (let i = 0; i < anglesCount; i++) {
            while (i - promisesResolvedCount >= maximumThreadCount) {
               await new Promise((resolve) => {
                  setTimeout(resolve, Math.random() * 100);
               });
            }

            const integralPromise = new Promise((resolve) => {
               setTimeout(async () => {
                  let azimuthalAngle = azimuthalAngles[i];
                  const integral = new Array(
                     normalMap.width * normalMap.height
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
                        } while (
                           nextPixel.x === pixel.x &&
                           nextPixel.y === pixel.y
                        );

                        pixel.x = nextPixel.x;
                        pixel.y = nextPixel.y;
                        inDimensions =
                           pixel.x < normalMap.width &&
                           pixel.y < normalMap.height &&
                           pixel.x >= 0 &&
                           pixel.y >= 0;

                        if (inDimensions) {
                           const index =
                              pixel.x +
                              (normalMap.height - pixel.y - 1) *
                                 normalMap.width;

                           let pixelSlope = 0;

                           if (gradientPixelArray[index + 2] !== 0) {
                              const rightSlope =
                                 gradientPixelArray[index + 0] + SLOPE_SHIFT;
                              const topSlope =
                                 gradientPixelArray[index + 1] + SLOPE_SHIFT;

                              pixelSlope =
                                 stepVector.x * rightSlope +
                                 stepVector.y * topSlope;
                           }

                           integralValue += pixelSlope * -depthFactor;
                           integral[index] = integralValue;
                        }
                     } while (inDimensions);
                  }

                  resolve(integral);
               });
            });

            integralPromise.then(async (integral) => {
               promisesResolvedCount++;

               while (integralArrayLock) {
                  await new Promise((resolve) => {
                     setTimeout(resolve, Math.random() * 100);
                  });
               }

               if (integral) {
                  integralArrayLock = true;
                  integral.forEach((value, index) => {
                     integralArray[index] += value / anglesCount;
                  });
                  integralArrayLock = false;
               }

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
                  const dim = new Uint32Array(2);
                  dim[0] = normalMap.width;
                  dim[1] = normalMap.height;
                  const canvas = new OffscreenCanvas(dim[0], dim[1]);
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

         /*
         const depthMap = await DepthMapHelper.getPerspectiveCorrected(
               depthMapImage,
               perspectiveCorrectionFactor
            );
         */

         resolve(depthMapImage);
      }, 100);
   });

   const result = await depthMapping;

   console.log(result);

   return result;
}
