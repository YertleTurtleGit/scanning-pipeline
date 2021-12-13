/* global GLSL */
/* exported brighten */

/**
 * @param {ImageBitmap} image
 * @returns {Promise<ImageBitmap>}
 */
async function brighten(image) {
   const shader = new GLSL.Shader({ width: image.width, height: image.height });
   shader.bind();

   let color = GLSL.Image.load(image);
   color = color.addFloat(new GLSL.Float(0.25));

   const result = await GLSL.render(color).getImageBitmap();
   shader.purge();

   return result;
}
