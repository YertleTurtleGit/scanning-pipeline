/* global GLSL */
/* exported albedoMap */

/**
 * @public
 * @param {ImageBitmap[]} lightImages
 * @returns {Promise<ImageBitmap>}
 */
async function albedoMap(lightImages) {
   const albedoShader = new GLSL.Shader({
      width: lightImages[0].width,
      height: lightImages[0].height,
   });
   albedoShader.bind();

   /** @type {GLSL.Vector4[]} */
   const glslLightImageColor = [];

   lightImages.forEach((lightImage, index) => {
      const glslLightImage = new GLSL.Image(lightImage);
      lightImage = undefined;
      lightImages[index] = undefined;
      glslLightImageColor.push(glslLightImage.getPixelColor());
   });
   lightImages = undefined;

   const albedoColor = glslLightImageColor[0].maximum(...glslLightImageColor);

   const albedoMap = GLSL.render(albedoColor).getImageBitmap();

   albedoShader.purge();

   return albedoMap;
}
