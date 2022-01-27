/* global GLSL */
/* exported translucencyMap */

/**
 * @public
 * @param {ImageBitmap[]} backlightImages
 * @returns {Promise<ImageBitmap>}
 */
 async function translucencyMap(backlightImages) {
    const translucencyShader = new GLSL.Shader({
       width: backlightImages[0].width,
       height: backlightImages[0].height,
    });
    translucencyShader.bind();
 
    /** @type {GLSL.Vector4[]} */
    const glslLightImageColor = [];
 
    backlightImages.forEach((lightImage) => {
       const glslLightImage = new GLSL.Image(lightImage);
       glslLightImageColor.push(glslLightImage.getPixelColor());
    });
 
    const translucencyColor = glslLightImageColor[0].maximum(...glslLightImageColor);
 
    const translucencyMap = GLSL.render(translucencyColor).getImageBitmap();
 
    translucencyShader.purge();
 
    return translucencyMap;
 }
 