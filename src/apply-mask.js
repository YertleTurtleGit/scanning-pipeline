/* global GLSL */
/* exported applyMasks */

/**
 * @param {ImageBitmap} mask
 * @param {ImageBitmap[]} images
 * @returns {Promise<ImageBitmap[]>}
 */
async function applyMasks(mask, images) {
   /** @type {ImageBitmap[]} */
   const results = [];

   images.forEach(async (image) => {
      const maskShader = new GLSL.Shader({
         width: image.width,
         height: image.height,
      });
      maskShader.bind();
      const color = GLSL.Image.load(image);
      const maskColor = GLSL.Image.load(mask).channel(0);
      results.push(
         await GLSL.render(
            new GLSL.Vector4([
               color.channel(0).multiplyFloat(maskColor),
               color.channel(1).multiplyFloat(maskColor),
               color.channel(2).multiplyFloat(maskColor),
               new GLSL.Float(1),
            ])
         ).getImageBitmap()
      );

      maskShader.purge();
   });

   return results;
}
