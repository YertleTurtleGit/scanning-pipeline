/* global IL */
/* exported roughnessMap */

/**
 * @public
 * @param {ImageBitmap} normalMap
 * @param {ImageBitmap} depthMap
 * @returns {Promise<ImageBitmap>}
 */
async function roughnessMap(normalMap, depthMap) {
   const roughnessShader = new IL.Shader({
      width: normalMap.width,
      height: normalMap.height,
   });
   roughnessShader.bind();

   const glslNormalMap = new IL.Image(normalMap);

   const normalMapKernelPadding = 2;

   const normalMapNeighborhood = [];

   for (let xOffset = 0; xOffset < normalMapKernelPadding + 1; xOffset++) {
      for (let yOffset = 0; yOffset < normalMapKernelPadding + 1; yOffset++) {
         normalMapNeighborhood.push(
            glslNormalMap.getNeighborPixel(xOffset, yOffset).normalize()
         );
      }
   }

   const average = glslNormalMap
      .getPixelColor()
      .normalize()
      .addVector4(...normalMapNeighborhood)
      .divideFloat(new IL.ShaderVariable.Float(normalMapNeighborhood.length + 1));

   let normalMapRoughness = new IL.ShaderVariable.Float(0);

   normalMapNeighborhood.forEach((neighbor) => {
      const neighborAberrance = neighbor
         .dot(average)
         .acos()
         .abs()
         .minimum(new IL.ShaderVariable.Float(1));
      normalMapRoughness = normalMapRoughness.addFloat(neighborAberrance);
   });

   normalMapRoughness = normalMapRoughness.divideFloat(
      new IL.ShaderVariable.Float(normalMapNeighborhood.length * 0.1)
   );

   const glslDepthMap = new IL.Image(depthMap);

   const depthMapKernelPadding = 1;
   const depthMapNeighborhood = [];

   for (let xOffset = 0; xOffset < depthMapKernelPadding + 1; xOffset++) {
      for (let yOffset = 0; yOffset < depthMapKernelPadding + 1; yOffset++) {
         depthMapNeighborhood.push(
            glslDepthMap.getNeighborPixel(xOffset, yOffset).channel(0)
         );
      }
   }

   const depth = glslDepthMap.getPixelColor().channel(0);
   let depthMapRoughness = new IL.ShaderVariable.Float(1);

   depthMapNeighborhood.forEach((neighbor) => {
      const neighborOcclusion = neighbor
         .subtractFloat(depth)
         .divideFloat(new IL.ShaderVariable.Float(2))
         .minimum(new IL.ShaderVariable.Float(1));
      depthMapRoughness = depthMapRoughness.subtractFloat(neighborOcclusion);
   });

   depthMapRoughness = depthMapRoughness
      .divideFloat(new IL.ShaderVariable.Float(depthMapNeighborhood.length * 0.08))
      .subtractFloat(new IL.ShaderVariable.Float(3.05));

   let roughness = depthMapRoughness.addFloat(normalMapRoughness);

   roughness = roughness.divideFloat(
      roughness.multiplyFloat(roughness).multiplyFloat(new IL.ShaderVariable.Float(20))
   );

   roughness = new IL.ShaderVariable.Float(1).subtractFloat(roughness);

   const roughnessMap = IL.render(
      new IL.ShaderVariable.Vector4([roughness, roughness, roughness, new IL.ShaderVariable.Float(1)])
   ).getImageBitmap();

   roughnessShader.purge();

   return roughnessMap;
}
