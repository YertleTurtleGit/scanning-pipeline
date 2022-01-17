/* global GLSL */
/* exported normalize */

/**
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
