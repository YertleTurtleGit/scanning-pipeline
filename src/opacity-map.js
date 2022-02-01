/* global GLSL */
/* exported opacityMap */

/**
 * @public
 * @param {ImageBitmap[]} frontLightImages
 * @param {ImageBitmap[]} backLightImages
 * @param {number} threshold
 * @returns {Promise<ImageBitmap>}
 */
async function opacityMap(
   frontLightImages,
   backLightImages,
   threshold = 0.005
) {
   const opacityShader = new GLSL.Shader({
      width: frontLightImages[0].width,
      height: frontLightImages[0].height,
   });
   opacityShader.bind();

   /** @type {GLSL.Float[]} */
   const frontLuminances = [];
   /** @type {GLSL.Float[]} */
   const backLuminances = [];

   /** @type {GLSL.Vector4[]} */
   const colors = [];

   frontLightImages.forEach((lightImage) => {
      const glslLightImage = new GLSL.Image(lightImage);
      frontLuminances.push(glslLightImage.getPixelColor().getLuminance());
   });

   /*backLightImages.forEach((lightImage) => {
      const glslLightImage = new GLSL.Image(lightImage);
      backLuminances.push(glslLightImage.getPixelColor().getLuminance());
   });*/

   frontLightImages.forEach((lightImage) => {
      const glslLightImage = new GLSL.Image(lightImage);
      colors.push(glslLightImage.getPixelColor());
   });

   const product_0_1 = frontLuminances[0].multiplyFloat(frontLuminances[1]);
   const product_2_3 = frontLuminances[2].multiplyFloat(frontLuminances[3]);
   const product_4_5 = frontLuminances[4].multiplyFloat(frontLuminances[5]);
   const product_6_7 = frontLuminances[6].multiplyFloat(frontLuminances[7]);

   const maxColor = colors[0].maximum(...colors);

   const opacity = product_0_1
      .maximum(product_2_3, product_4_5, product_6_7)
      .step(new GLSL.Float(threshold));

   const opacityMap = GLSL.render(
      maxColor.multiplyFloat(opacity)
   ).getImageBitmap();

   opacityShader.purge();

   return opacityMap;
}
