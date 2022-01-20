/* global GLSL */
/* exported normalize, sample, scaleImageArray, createImageArray, pyramidUp, pyramidDown */

/**
 * @public
 * @param {ImageBitmap} image
 * @returns {Promise<ImageBitmap>}
 */
async function normalize(image) {
   const normalizeShader = new GLSL.Shader({
      width: image.width,
      height: image.height,
   });
   normalizeShader.bind();

   const glslImage = new GLSL.Image(image).getPixelColor();

   const normal = new GLSL.Vector3([
      glslImage.channel(0),
      glslImage.channel(1),
      glslImage.channel(2),
   ]);
   const normalized = normal.normalize();
   const normalizedImage = normalized.getVector4(glslImage.channel(3));
   const rendering = GLSL.render(normalizedImage);
   const result = await rendering.getImageBitmap();

   //normalizeShader.purge();
   return result;
}

/**
 * @public
 * @param {ImageBitmap} image
 * @param {number} factor
 * @returns {Promise<ImageBitmap>}
 */
async function scale(image, factor) {
   const newResolution = {
      width: Math.floor(image.width * factor),
      height: Math.floor(image.height * factor),
   };
   const dim = new Uint32Array(2);
   dim[0] = newResolution.width;
   dim[1] = newResolution.height;
   const canvas = new OffscreenCanvas(dim[0], dim[1]);
   /** @type {CanvasRenderingContext2D} */
   const context = canvas.getContext("2d");
   context.drawImage(image, 0, 0, newResolution.width, newResolution.height);
   return createImageBitmap(canvas);
}

/**
 * @public
 * @param {ArrayBuffer} imageArray
 * @param {{width:number, height:number}} imageDimensions
 * @param {number} imageChannelCount
 * @param {number} factor
 * @returns {ArrayBuffer}
 */
function scaleImageArray(
   imageArray,
   imageDimensions,
   imageChannelCount,
   factor
) {
   for (let y = 0; y < imageDimensions.height; y++) {
      for (let x = 0; x < imageDimensions.width; x++) {
         const index = (x + y * imageDimensions.width) * imageChannelCount;
      }
   }
}

/**
 * @public
 * @param {ImageBitmap} image
 * @returns {Uint8ClampedArray}
 */
function createImageArray(image) {
   const dim = new Uint32Array(2);
   dim[0] = image.width;
   dim[1] = image.height;
   const canvas = new OffscreenCanvas(dim[0], dim[1]);
   /** @type {CanvasRenderingContext2D} */
   const context = canvas.getContext("2d");
   context.drawImage(image, 0, 0);
   return context.getImageData(0, 0, image.width, image.height).data;
}

/**
 * @public
 * @param {ImageBitmap} image
 * @param {number[][]} kernel
 * @returns {Promise<ImageBitmap>}
 */
async function convolute(image, kernel) {
   const convoluteShader = new GLSL.Shader({
      width: image.width,
      height: image.height,
   });
   convoluteShader.bind();
   const glslImage = new GLSL.Image(image);
   const result = glslImage.applyFilter(kernel, true);
   const imageBitmap = GLSL.render(result).getImageBitmap();
   convoluteShader.purge();
   return imageBitmap;
}

/**
 * @public
 * @param {ImageBitmap} image
 * @returns {Promise<ImageBitmap>}
 */
async function gaussianBlur(image) {
   const kernel = [
      [1, 4, 6, 4, 1],
      [4, 16, 24, 16, 4],
      [6, 24, 36, 24, 6],
      [4, 16, 24, 16, 4],
      [1, 4, 6, 4, 1],
   ];
   return convolute(image, kernel);
}

/**
 * @public
 * @param {ImageBitmap} image
 * @returns {Promise<ImageBitmap>}
 */
async function pyramidUp(image) {
   const scaled = await scale(image, 2);
   return gaussianBlur(scaled);
}

/**
 * @public
 * @param {ImageBitmap} image
 * @returns {Promise<ImageBitmap>}
 */
async function pyramidDown(image) {
   const blurred = await gaussianBlur(image);
   return scale(blurred, 1 / 2);
}
