/* global GLSL */
/* exported photometricStereoNormalMap */

/**
 * @public
 * @param {number} lightPolarAngleDeg
 * @param {ImageBitmap[]} lightImages
 * @returns {Promise<ImageBitmap>}
 */
async function photometricStereoNormalMap(lightPolarAngleDeg, lightImages) {
   const lightImage_000 = lightImages[0];
   const lightImage_045 = lightImages[1];
   const lightImage_090 = lightImages[2];
   const lightImage_135 = lightImages[3];
   const lightImage_180 = lightImages[4];
   const lightImage_225 = lightImages[5];
   const lightImage_270 = lightImages[6];
   const lightImage_315 = lightImages[7];

   const normalMapShader = new GLSL.Shader({
      width: lightImage_000.width,
      height: lightImage_000.height,
   });

   normalMapShader.bind();

   const lightLuminances = [
      GLSL.Image.load(lightImage_000).getLuminance(),
      GLSL.Image.load(lightImage_045).getLuminance(),
      GLSL.Image.load(lightImage_090).getLuminance(),
      GLSL.Image.load(lightImage_135).getLuminance(),
      GLSL.Image.load(lightImage_180).getLuminance(),
      GLSL.Image.load(lightImage_225).getLuminance(),
      GLSL.Image.load(lightImage_270).getLuminance(),
      GLSL.Image.load(lightImage_315).getLuminance(),
   ];

   const all = new GLSL.Float(0).maximum(...lightLuminances);

   let mask = new GLSL.Float(1);

   /*if (lightImage_NONE) {
      const lightLuminance_NONE =
         GLSL.Image.load(lightImage_NONE).getLuminance();

      for (let i = 0; i < lightLuminances.length; i++) {
         lightLuminances[i] =
            lightLuminances[i].subtractFloat(lightLuminance_NONE);
      }

      mask = all
         .subtractFloat(lightLuminance_NONE)
         .step(new GLSL.Float(maskThreshold));
   }*/

   for (let i = 0; i < lightLuminances.length; i++) {
      lightLuminances[i] = lightLuminances[i].divideFloat(all);
   }

   /**
    * @param {GLSL.Float} originLuminance
    * @param {GLSL.Float} orthogonalLuminance
    * @param {GLSL.Float} oppositeLuminance
    * @param {number} originAzimuthalAngleDeg
    * @param {number} orthogonalAzimuthalAngleDeg
    * @param {number} oppositeAzimuthalAngleDeg
    * @returns {GLSL.Vector3}
    */
   function getAnisotropicNormalVector(
      originLuminance,
      orthogonalLuminance,
      oppositeLuminance,

      originAzimuthalAngleDeg,
      orthogonalAzimuthalAngleDeg,
      oppositeAzimuthalAngleDeg
   ) {
      /**
       * @param {number} azimuthalAngleDeg
       * @param {number} polarAngleDeg
       * @returns {GLSL.Vector3}
       */
      function getLightDirectionVector(azimuthalAngleDeg, polarAngleDeg) {
         const polar = new GLSL.Float(polarAngleDeg).radians();
         const azimuthal = new GLSL.Float(azimuthalAngleDeg).radians();

         return new GLSL.Vector3([
            polar.sin().multiplyFloat(azimuthal.cos()),
            polar.sin().multiplyFloat(azimuthal.sin()),
            polar.cos(),
         ]).normalize();
      }

      const originLightDirection = getLightDirectionVector(
         originAzimuthalAngleDeg,
         lightPolarAngleDeg
      );
      const orthogonalLightDirection = getLightDirectionVector(
         orthogonalAzimuthalAngleDeg,
         lightPolarAngleDeg
      );
      const oppositeLightDirection = getLightDirectionVector(
         oppositeAzimuthalAngleDeg,
         lightPolarAngleDeg
      );

      const lightMatrix = new GLSL.Matrix3([
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

      const reflection = new GLSL.Vector3([
         originLuminance,
         orthogonalLuminance,
         oppositeLuminance,
      ]);

      return lightMatrix
         .multiplyVector3(reflection)
         .normalize()
         .addFloat(new GLSL.Float(1))
         .divideFloat(new GLSL.Float(2));
   }

   /** @type {number[][]} */
   const anisotropicCombinations = [
      [180, 270, 0],
      [180, 90, 0],
      [90, 180, 270],
      [90, 0, 270],
      [225, 315, 45],
      [225, 135, 45],
      [315, 45, 135],
      [315, 225, 135],
   ];

   /** @type {GLSL.Vector3[]} */
   const normalVectors = [];

   anisotropicCombinations.forEach((combination) => {
      /**
       * @param {number} azimuthalAngle
       * @returns {GLSL.Float}
       */
      function getLightLuminance(azimuthalAngle) {
         const lightAzimuthalAngles = [0, 45, 90, 135, 180, 225, 270, 315];
         const id = lightAzimuthalAngles.findIndex((value) => {
            return value === azimuthalAngle;
         });

         return lightLuminances[id];
      }

      normalVectors.push(
         getAnisotropicNormalVector(
            getLightLuminance(combination[0]),
            getLightLuminance(combination[1]),
            getLightLuminance(combination[2]),
            combination[0],
            combination[1],
            combination[2]
         )
      );
   });

   let normalVector = new GLSL.Vector3([
      new GLSL.Float(0),
      new GLSL.Float(0),
      new GLSL.Float(0),
   ])
      .addVector3(...normalVectors)
      .divideFloat(new GLSL.Float(normalVectors.length))
      .normalize()
      .multiplyFloat(mask);

   /*if (cameraVerticalShift) {
      // TODO: use cameraVerticalShift
      const cameraAngle = Math.atan(
                  1 / Math.tan(lightPolarAngleDeg * (Math.PI / 180))
               );

               const zero = new GLSL.Float(0);
               const one = new GLSL.Float(1);
               const sine = new GLSL.Float(Math.sin(cameraAngle));
               const cosine = new GLSL.Float(Math.cos(cameraAngle));

               const rotationMatrix = new GLSL.Matrix3([
                  [one, zero, zero],
                  [zero, cosine, sine],
                  [zero, sine.multiplyFloat(new GLSL.Float(-1)), cosine],
               ]);

               normalVector = rotationMatrix.multiplyVector3(normalVector);
   }*/

   // TODO: fix alpha
   const alpha = normalVector
      .channel(0)
      .minimum(normalVector.channel(1), normalVector.channel(2))
      .multiplyFloat(new GLSL.Float(99999))
      .minimum(new GLSL.Float(1));

   const normalMapRendering = GLSL.render(normalVector.getVector4(alpha));
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
         const normalMapShader = new GLSL.Shader({
            width: lightImage_000.width * (resolutionPercent / 100),
            height: lightImage_000.naturalHeight * (resolutionPercent / 100),
         });
         normalMapShader.bind();

         let lightLuminance_ALL =
            GLSL.Image.load(lightImage_ALL).getLuminance();

         const lightLuminances = [
            GLSL.Image.load(lightImage_000).getLuminance(),
            GLSL.Image.load(lightImage_090).getLuminance(),
            GLSL.Image.load(lightImage_180).getLuminance(),
            GLSL.Image.load(lightImage_270).getLuminance(),
            GLSL.Image.load(lightImage_FRONT).getLuminance(),
         ];

         if (lightImage_NONE) {
            const lightLuminance_NONE =
               GLSL.Image.load(lightImage_NONE).getLuminance();

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
            .addFloat(new GLSL.Float(1))
            .divideFloat(new GLSL.Float(2));

         const vertical = lightLuminances[3]
            .subtractFloat(lightLuminances[1])
            .addFloat(new GLSL.Float(1))
            .divideFloat(new GLSL.Float(2));

         const normalVector = new GLSL.Vector3([
            horizontal,
            vertical,
            lightLuminances[4],
         ]);

         const normalMapRendering = GLSL.render(
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
