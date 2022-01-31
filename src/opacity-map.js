/* global GLSL */
/* exported opacityMap */

/**
 * @public
 * @param {ImageBitmap[]} lightImages
 * @param {number} threshold
 * @returns {Promise<ImageBitmap>}
 */
async function opacityMap(lightImages, threshold = 0.005) {
   const opacityShader = new GLSL.Shader({
      width: lightImages[0].width,
      height: lightImages[0].height,
   });
   opacityShader.bind();

   /** @type {GLSL.Float[]} */
   const luminances = [];

   lightImages.forEach((lightImage) => {
      const glslLightImage = new GLSL.Image(lightImage);
      luminances.push(glslLightImage.getPixelColor().getLuminance());
   });

   const product_0_1 = luminances[0].multiplyFloat(luminances[1]);
   const product_2_3 = luminances[2].multiplyFloat(luminances[3]);
   const product_4_5 = luminances[4].multiplyFloat(luminances[5]);
   const product_6_7 = luminances[6].multiplyFloat(luminances[7]);

   const opacity = product_0_1
      .maximum(product_2_3, product_4_5, product_6_7)
      .step(new GLSL.Float(threshold));

   const opacityMap = GLSL.render(
      new GLSL.Vector4([opacity, opacity, opacity, new GLSL.Float(1)])
   ).getImageBitmap();

   opacityShader.purge();

   return opacityMap;
}
