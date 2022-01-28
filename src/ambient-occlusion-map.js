/* global IL */
/* exported ambientOcclusionMap */

/**
 * @public
 * @param {ImageBitmap} normalMap
 * @param {ImageBitmap} depthMap
 * @returns {Promise<ImageBitmap>}
 */
async function ambientOcclusionMap(normalMap, depthMap) {
   const ambientOcclusionShader = new IL.Shader({
      width: normalMap.width,
      height: normalMap.height,
   });
   ambientOcclusionShader.bind();

   const glslNormalMap = new IL.Image(normalMap);

   const r = glslNormalMap.getNeighborPixel(1, 0).normalize();
   const rb = glslNormalMap.getNeighborPixel(1, 1).normalize();
   const b = glslNormalMap.getNeighborPixel(0, 1).normalize();
   const lb = glslNormalMap.getNeighborPixel(-1, 1).normalize();
   const l = glslNormalMap.getNeighborPixel(-1, 0).normalize();
   const lt = glslNormalMap.getNeighborPixel(-1, -1).normalize();
   const t = glslNormalMap.getNeighborPixel(0, -1).normalize();
   const rt = glslNormalMap.getNeighborPixel(1, -1).normalize();

   let normalMapOcclusion = new IL.ShaderVariable.Float(1);

   normalMapOcclusion = normalMapOcclusion
      .subtractFloat(r.dot(l).acos().abs())
      .minimum(new IL.ShaderVariable.Float(1));
   normalMapOcclusion = normalMapOcclusion
      .subtractFloat(rb.dot(lt).acos().abs())
      .minimum(new IL.ShaderVariable.Float(1));
   normalMapOcclusion = normalMapOcclusion
      .subtractFloat(b.dot(t).acos().abs())
      .minimum(new IL.ShaderVariable.Float(1));
   normalMapOcclusion = normalMapOcclusion
      .subtractFloat(lb.dot(rt).acos().abs())
      .minimum(new IL.ShaderVariable.Float(1));

   const glslDepthMap = new IL.Image(depthMap);

   const kernelPadding = 5;
   const neighborhood = [];

   for (let xOffset = 0; xOffset < kernelPadding + 1; xOffset++) {
      for (let yOffset = 0; yOffset < kernelPadding + 1; yOffset++) {
         neighborhood.push(
            glslDepthMap.getNeighborPixel(xOffset, yOffset).channel(0)
         );
      }
   }

   const depth = glslDepthMap.getPixelColor().channel(0);
   let depthMapOcclusion = new IL.ShaderVariable.Float(0);

   neighborhood.forEach((neighbor) => {
      const neighborOcclusion = neighbor
         .subtractFloat(depth)
         .addFloat(new IL.ShaderVariable.Float(1));
      depthMapOcclusion = depthMapOcclusion.addFloat(neighborOcclusion);
   });

   depthMapOcclusion = depthMapOcclusion
      .divideFloat(new IL.ShaderVariable.Float(neighborhood.length * 0.25))
      .subtractFloat(new IL.ShaderVariable.Float(3.05));

   let result = normalMapOcclusion
      .addFloat(depthMapOcclusion)
      .subtractFloat(new IL.ShaderVariable.Float(0.6));

   const c = new IL.ShaderVariable.Float(0.5);

   const ccf = new IL.ShaderVariable.Float(1)
      .multiplyFloat(c.addFloat(new IL.ShaderVariable.Float(1)))
      .divideFloat(new IL.ShaderVariable.Float(1))
      .multiplyFloat(new IL.ShaderVariable.Float(1).subtractFloat(c));

   result = ccf
      .multiplyFloat(result.subtractFloat(new IL.ShaderVariable.Float(0.5)))
      .addFloat(new IL.ShaderVariable.Float(0.5));

   result = new IL.ShaderVariable.Float(1).subtractFloat(result);
   result = result.multiplyFloat(new IL.ShaderVariable.Float(1.2));
   result = new IL.ShaderVariable.Float(1).subtractFloat(result);

   const ambientOcclusionMap = IL.render(
      new IL.ShaderVariable.Vector4([result, result, result, new IL.ShaderVariable.Float(1)])
   ).getImageBitmap();

   ambientOcclusionShader.purge();
   return ambientOcclusionMap;
}
