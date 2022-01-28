/* global GLSL */
/* exported opacityMap */

/**
 * @public
 * @param {ImageBitmap[]} lightImages
 * @returns {Promise<ImageBitmap>}
 */
async function opacityMap(lightImages) {
   const width = lightImages[0].width;
   const height = lightImages[0].height;

   const opacityShader = new GLSL.Shader({ width: width, height: height });
   opacityShader.bind();
   /** @type {GLSL.Vector4[]} */
   const lightColors = [];
   lightImages.forEach((lightImage) => {
      lightColors.push(GLSL.Image.load(lightImage));
   });

   const opacity = lightColors[0].maximum(...lightColors);

   const opacityMap = GLSL.render(opacity).getImageBitmap();
   opacityShader.purge();

   return opacityMap;
}
