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
   const lightImagesColor = [];
   /** @type {GLSL.Float[]} */
   const lightImagesSaturation = [];

   lightImages.forEach((lightImage) => {
      const glslLightImage = new GLSL.Image(lightImage);
      lightImagesColor.push(glslLightImage.getPixelColor());
   });

   let averageColor = new GLSL.Vector4([
      new GLSL.Float(0),
      new GLSL.Float(0),
      new GLSL.Float(0),
      new GLSL.Float(1),
   ]);

   lightImagesColor.forEach((color) => {
      const maxColor = color
         .channel(0)
         .maximum(color.channel(1), color.channel(2));
      const minColor = color
         .channel(0)
         .minimum(color.channel(1), color.channel(2));
      const saturation = maxColor
         .subtractFloat(minColor)
         .divideFloat(maxColor.addFloat(minColor));
      lightImagesSaturation.push(saturation);

      averageColor = averageColor.addVector4(color);
   });

   averageColor = new GLSL.Vector4([
      averageColor
         .channel(0)
         .divideFloat(new GLSL.Float(lightImagesColor.length)),
      averageColor
         .channel(1)
         .divideFloat(new GLSL.Float(lightImagesColor.length)),
      averageColor
         .channel(2)
         .divideFloat(new GLSL.Float(lightImagesColor.length)),
      new GLSL.Float(1),
   ]);

   const maxSaturation = lightImagesSaturation[0].maximum(
      ...lightImagesSaturation
   );

   let albedo = new GLSL.Vector4([
      new GLSL.Float(0),
      new GLSL.Float(0),
      new GLSL.Float(0),
      new GLSL.Float(1),
   ]);

   lightImagesColor.forEach((color, index) => {
      const saturationMask = lightImagesSaturation[index].step(maxSaturation);
      const intensity = color
         .channel(0)
         .addFloat(color.channel(1), color.channel(2))
         .divideFloat(new GLSL.Float(3));

      albedo = albedo.addVector4(color.multiplyFloat(saturationMask));
   });

   const albedoMap = GLSL.render(averageColor).getImageBitmap();

   albedoShader.purge();

   return albedoMap;
}
