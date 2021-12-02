/* global GLSL */
/* exported brighten */

/**
 * @param {HTMLImageElement} image
 * @returns {Promise<HTMLImageElement>}
 */
async function brighten(image) {
   const shader = new GLSL.Shader({ width: image.width, height: image.height });
   shader.bind();

   let color = GLSL.Image.load(image);
   color = color.addFloat(new GLSL.Float(0.5));

   const result = GLSL.render(color).getJsImage();
   shader.purge();

   return await result;
}
