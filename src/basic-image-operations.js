/* global GLSL */
/* exported normalize, sample */

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
 * @param {{width:number, height:number}} resolution
 * @returns {Promise<ImageBitmap>}
 */
async function sample(image, resolution) {
   const dim = new Uint32Array(2);
   dim[0] = resolution.width;
   dim[1] = resolution.height;
   const canvas = new OffscreenCanvas(dim[0], dim[1]);
   /** @type {CanvasRenderingContext2D} */
   const context = canvas.getContext("2d");
   context.drawImage(image, resolution.width, resolution.height);
   return createImageBitmap(canvas);
}
