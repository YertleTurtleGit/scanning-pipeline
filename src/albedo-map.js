/* global IL */
/* exported albedoMap */

/**
 * @public
 * @param {ImageBitmap[]} lightImages
 * @returns {Promise<ImageBitmap>}
 */
async function albedoMap(lightImages) {
   return IL.renderShaderToBitmap(lightImages, () => {
      /** @type {IL.ShaderVariable.Vector4[]} */
      const glslLightImageColor = [];

      lightImages.forEach((lightImage) => {
         const glslLightImage = new IL.Image(lightImage);
         glslLightImageColor.push(glslLightImage.getPixelColor());
      });

      const albedoColor = glslLightImageColor[0].maximum(
         ...glslLightImageColor
      );

      return albedoColor;
   });
}
