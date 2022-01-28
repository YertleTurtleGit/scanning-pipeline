/* global IL */
/* exported photometricStereoNormalMap */

/**
 * @public
 * @param {ImageBitmap[]} lightImages
 * @param {number[]} lightPolarAnglesDeg
 * @param {number[]} lightAzimuthalAnglesDeg
 * @returns {Promise<ImageBitmap>}
 */
async function photometricStereoNormalMap(
   lightImages,
   lightPolarAnglesDeg,
   lightAzimuthalAnglesDeg
) {
   const normalMapShader = new IL.Shader({
      width: lightImages[0].width,
      height: lightImages[0].height,
   });

   normalMapShader.bind();

   const lightLuminances = [];

   lightImages.forEach((lightImage) => {
      lightLuminances.push(IL.Image.load(lightImage).getLuminance());
   });

   const all = new IL.ShaderVariable.Float(0).maximum(...lightLuminances);

   for (let i = 0; i < lightLuminances.length; i++) {
      lightLuminances[i] = lightLuminances[i].divideFloat(all);
   }

   /**
    * @param {IL.ShaderVariable.Float} originLuminance
    * @param {IL.ShaderVariable.Float} orthogonalLuminance
    * @param {IL.ShaderVariable.Float} oppositeLuminance
    * @param {number} originAzimuthalAngleDeg
    * @param {number} orthogonalAzimuthalAngleDeg
    * @param {number} oppositeAzimuthalAngleDeg
    * @param {number} originPolarAngleDeg
    * @param {number} orthogonalPolarAngleDeg
    * @param {number} oppositePolarAngleDeg
    * @returns {IL.ShaderVariable.Vector3}
    */
   function getAnisotropicNormalVector(
      originLuminance,
      orthogonalLuminance,
      oppositeLuminance,

      originAzimuthalAngleDeg,
      orthogonalAzimuthalAngleDeg,
      oppositeAzimuthalAngleDeg,

      originPolarAngleDeg,
      orthogonalPolarAngleDeg,
      oppositePolarAngleDeg
   ) {
      /**
       * @param {number} azimuthalAngleDeg
       * @param {number} polarAngleDeg
       * @returns {IL.ShaderVariable.Vector3}
       */
      function getLightDirectionVector(azimuthalAngleDeg, polarAngleDeg) {
         const polar = new IL.ShaderVariable.Float(polarAngleDeg).radians();
         const azimuthal = new IL.ShaderVariable.Float(azimuthalAngleDeg).radians();

         return new IL.ShaderVariable.Vector3([
            polar.sin().multiplyFloat(azimuthal.cos()),
            polar.sin().multiplyFloat(azimuthal.sin()),
            polar.cos(),
         ]).normalize();
      }

      const originLightDirection = getLightDirectionVector(
         originAzimuthalAngleDeg,
         originPolarAngleDeg
      );
      const orthogonalLightDirection = getLightDirectionVector(
         orthogonalAzimuthalAngleDeg,
         orthogonalPolarAngleDeg
      );
      const oppositeLightDirection = getLightDirectionVector(
         oppositeAzimuthalAngleDeg,
         oppositePolarAngleDeg
      );

      const lightMatrix = new IL.ShaderVariable.Matrix3([
         [
            originLightDirection.channel(0),
            originLightDirection.channel(1),
            originLightDirection.channel(2),
         ],
         [
            orthogonalLightDirection.channel(0),
            orthogonalLightDirection.channel(1),
            orthogonalLightDirection.channel(2),
         ],
         [
            oppositeLightDirection.channel(0),
            oppositeLightDirection.channel(1),
            oppositeLightDirection.channel(2),
         ],
      ]).inverse();

      const reflection = new IL.ShaderVariable.Vector3([
         originLuminance,
         orthogonalLuminance,
         oppositeLuminance,
      ]);

      return lightMatrix
         .multiplyVector3(reflection)
         .normalize()
         .addFloat(new IL.ShaderVariable.Float(1))
         .divideFloat(new IL.ShaderVariable.Float(2));
   }

   /** @type {number[][]} */
   const anisotropicCombinations = [
      [4, 6, 0],
      [4, 2, 0],
      [2, 4, 6],
      [2, 0, 6],
      [5, 7, 1],
      [5, 3, 1],
      [7, 1, 3],
      [7, 5, 3],
   ];

   /** @type {IL.ShaderVariable.Vector3[]} */
   const normalVectors = [];

   anisotropicCombinations.forEach((combination) => {
      normalVectors.push(
         getAnisotropicNormalVector(
            lightLuminances[combination[0]],
            lightLuminances[combination[1]],
            lightLuminances[combination[2]],
            lightAzimuthalAnglesDeg[combination[0]],
            lightAzimuthalAnglesDeg[combination[1]],
            lightAzimuthalAnglesDeg[combination[2]],
            lightPolarAnglesDeg[combination[0]],
            lightPolarAnglesDeg[combination[1]],
            lightPolarAnglesDeg[combination[2]]
         )
      );
   });

   let normalVector = new IL.ShaderVariable.Vector3([
      new IL.ShaderVariable.Float(0),
      new IL.ShaderVariable.Float(0),
      new IL.ShaderVariable.Float(0),
   ])
      .addVector3(...normalVectors)
      .divideFloat(new IL.ShaderVariable.Float(normalVectors.length))
      .normalize();

   // TODO: fix alpha
   const alpha = normalVector
      .channel(0)
      .minimum(normalVector.channel(1), normalVector.channel(2))
      .multiplyFloat(new IL.ShaderVariable.Float(99999))
      .minimum(new IL.ShaderVariable.Float(1));

   const normalMapRendering = IL.render(normalVector.getVector4(alpha));
   const normalMap = await normalMapRendering.getImageBitmap();
   normalMapShader.purge();
   return normalMap;
}

/**
 * @public
 * @param {ImageBitmap} lightImage_000
 * @param {ImageBitmap} lightImage_090
 * @param {ImageBitmap} lightImage_180
 * @param {ImageBitmap} lightImage_270
 * @param {ImageBitmap} lightImage_ALL
 * @param {ImageBitmap} lightImage_FRONT
 * @param {ImageBitmap} lightImage_NONE
 * @param {ImageBitmap} uiImageElement
 * @param {number} resolutionPercent
 * @returns {Promise<ImageBitmap>}
 */
/*async function sphericalGradientNormalMap(
   lightImage_000,
   lightImage_090,
   lightImage_180,
   lightImage_270,
   lightImage_ALL,
   lightImage_FRONT,
   lightImage_NONE = undefined,
   uiImageElement = undefined,
   resolutionPercent = 100
) {
   return new Promise((resolve) => {
      setTimeout(async () => {
         const normalMapShader = new IL.ShaderVariable.Shader({
            width: lightImage_000.width * (resolutionPercent / 100),
            height: lightImage_000.naturalHeight * (resolutionPercent / 100),
         });
         normalMapShader.bind();

         let lightLuminance_ALL =
            IL.ShaderVariable.Image.load(lightImage_ALL).getLuminance();

         const lightLuminances = [
            IL.ShaderVariable.Image.load(lightImage_000).getLuminance(),
            IL.ShaderVariable.Image.load(lightImage_090).getLuminance(),
            IL.ShaderVariable.Image.load(lightImage_180).getLuminance(),
            IL.ShaderVariable.Image.load(lightImage_270).getLuminance(),
            IL.ShaderVariable.Image.load(lightImage_FRONT).getLuminance(),
         ];

         if (lightImage_NONE) {
            const lightLuminance_NONE =
               IL.ShaderVariable.Image.load(lightImage_NONE).getLuminance();

            for (let i = 0; i < lightLuminances.length; i++) {
               lightLuminances[i] =
                  lightLuminances[i].subtractFloat(lightLuminance_NONE);
            }
            lightLuminance_ALL =
               lightLuminance_ALL.subtractFloat(lightLuminance_NONE);
         }

         for (let i = 0; i < lightLuminances.length; i++) {
            lightLuminances[i] =
               lightLuminances[i].divideFloat(lightLuminance_ALL);
         }

         const horizontal = lightLuminances[0]
            .subtractFloat(lightLuminances[2])
            .addFloat(new IL.ShaderVariable.Float(1))
            .divideFloat(new IL.ShaderVariable.Float(2));

         const vertical = lightLuminances[3]
            .subtractFloat(lightLuminances[1])
            .addFloat(new IL.ShaderVariable.Float(1))
            .divideFloat(new IL.ShaderVariable.Float(2));

         const normalVector = new IL.ShaderVariable.Vector3([
            horizontal,
            vertical,
            lightLuminances[4],
         ]);

         const normalMapRendering = IL.ShaderVariable.render(
            normalVector.normalize().getVector4()
         );

         normalMapShader.purge();

         const normalMap = await normalMapRendering.getJsImage();

         if (uiImageElement && normalMap) {
            uiImageElement.src = normalMap.src;
         }

         resolve(normalMap);
      });
   });
}*/
