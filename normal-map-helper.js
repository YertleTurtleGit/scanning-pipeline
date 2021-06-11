//@ts-check
"use strict";

class NormalMapHelper {
   /** @private @type {number} */
   static renderId = 0;

   /**
    * @public
    * @param {HTMLImageElement} lightImage_000
    * @param {HTMLImageElement} lightImage_045
    * @param {HTMLImageElement} lightImage_090
    * @param {HTMLImageElement} lightImage_135
    * @param {HTMLImageElement} lightImage_180
    * @param {HTMLImageElement} lightImage_225
    * @param {HTMLImageElement} lightImage_270
    * @param {HTMLImageElement} lightImage_315
    * @param {number} polarAngleDeg
    * @param {boolean} cancelIfNewJobSpawned
    * @param {HTMLImageElement} imageElement
    * @returns {Promise<HTMLImageElement>}
    */
   static async getPhotometricStereoNormalMap(
      lightImage_000,
      lightImage_045,
      lightImage_090,
      lightImage_135,
      lightImage_180,
      lightImage_225,
      lightImage_270,
      lightImage_315,
      polarAngleDeg,
      cancelIfNewJobSpawned = false,
      imageElement = undefined,
      resolutionPercent = 100
   ) {
      if (imageElement)
         imageElement.style.filter =
            "blur(" +
            Math.round((imageElement.width * imageElement.height) / 20000) +
            "px)";

      const normalMapHelper = new NormalMapHelper(cancelIfNewJobSpawned);

      if (normalMapHelper.isRenderObsolete()) return;

      return new Promise((resolve) => {
         setTimeout(async () => {
            if (normalMapHelper.isRenderObsolete()) return;

            const normalMapShader = new Shader({
               width: lightImage_000.naturalWidth * (resolutionPercent / 100),
               height: lightImage_000.naturalHeight * (resolutionPercent / 100),
            });

            if (normalMapHelper.isRenderObsolete()) return;

            normalMapShader.bind();

            const lightLuminances = [
               GlslImage.load(lightImage_000).getLuminanceFloat(),
               GlslImage.load(lightImage_045).getLuminanceFloat(),
               GlslImage.load(lightImage_090).getLuminanceFloat(),
               GlslImage.load(lightImage_135).getLuminanceFloat(),
               GlslImage.load(lightImage_180).getLuminanceFloat(),
               GlslImage.load(lightImage_225).getLuminanceFloat(),
               GlslImage.load(lightImage_270).getLuminanceFloat(),
               GlslImage.load(lightImage_315).getLuminanceFloat(),
            ];

            const all = new GlslFloat(0).maximum(...lightLuminances);

            lightLuminances.forEach((lightLuminance) => {
               lightLuminance = lightLuminance.divideFloat(all);
            });

            /**
             * @param {GlslFloat} originLuminance
             * @param {GlslFloat} orthogonalLuminance
             * @param {GlslFloat} oppositeLuminance
             * @param {number} originAzimuthalAngleDeg
             * @param {number} orthogonalAzimuthalAngleDeg
             * @param {number} oppositeAzimuthalAngleDeg
             * @returns {GlslVector3}
             */
            function getAnisotropicNormalVector(
               originLuminance,
               orthogonalLuminance,
               oppositeLuminance,

               originAzimuthalAngleDeg,
               orthogonalAzimuthalAngleDeg,
               oppositeAzimuthalAngleDeg
            ) {
               if (normalMapHelper.isRenderObsolete()) return;

               /**
                * @param {number} azimuthalAngleDeg
                * @param {number} polarAngleDeg
                * @returns {GlslVector3}
                */
               function getLightDirectionVector(
                  azimuthalAngleDeg,
                  polarAngleDeg
               ) {
                  const polar = new GlslFloat(polarAngleDeg).radians();
                  const azimuthal = new GlslFloat(azimuthalAngleDeg).radians();

                  return new GlslVector3([
                     polar.sin().multiplyFloat(azimuthal.cos()),
                     polar.sin().multiplyFloat(azimuthal.sin()),
                     polar.cos(),
                  ]).normalize();
               }

               const originLightDirection = getLightDirectionVector(
                  originAzimuthalAngleDeg,
                  polarAngleDeg
               );
               const orthogonalLightDirection = getLightDirectionVector(
                  orthogonalAzimuthalAngleDeg,
                  polarAngleDeg
               );
               const oppositeLightDirection = getLightDirectionVector(
                  oppositeAzimuthalAngleDeg,
                  polarAngleDeg
               );

               const lightMatrix = new GlslMatrix3([
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

               const reflection = new GlslVector3([
                  originLuminance,
                  orthogonalLuminance,
                  oppositeLuminance,
               ]);

               return lightMatrix
                  .multiplyVector3(reflection)
                  .normalize()
                  .addFloat(new GlslFloat(1))
                  .divideFloat(new GlslFloat(2));
            }

            /** @type {[number, number, number][]} */
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

            /** @type {GlslVector3[]} */
            const normalVectors = [];

            anisotropicCombinations.forEach((combination) => {
               /**
                * @param {number} azimuthalAngle
                * @returns {GlslFloat}
                */
               function getLightLuminance(azimuthalAngle) {
                  const lightAzimuthalAngles = [
                     0, 45, 90, 135, 180, 225, 270, 315,
                  ];
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

            let normalVector = new GlslVector3([
               new GlslFloat(0),
               new GlslFloat(0),
               new GlslFloat(0),
            ])
               .addVector3(...normalVectors)
               .divideFloat(new GlslFloat(normalVectors.length));

            normalVector = new GlslVector3([
               normalVector.channel(0),
               normalVector.channel(1),
               normalVector.channel(2),
            ]);

            if (normalMapHelper.isRenderObsolete()) return;

            const normalMapRendering = GlslRendering.render(
               normalVector.getVector4()
            );

            normalMapShader.unbind();

            if (normalMapHelper.isRenderObsolete()) return;

            const normalMap = await normalMapRendering.getJsImage();

            if (imageElement && normalMap) {
               imageElement.src = normalMap.src;
               imageElement.style.filter = "";
            }

            resolve(normalMap);
         });
      });
   }

   /**
    * @public
    * @param {HTMLImageElement} allLightGradientImage
    * @param {HTMLImageElement} northLightGradientImage
    * @param {HTMLImageElement} eastLightGradientImage
    * @param {HTMLImageElement} frontLightGradientImage
    * @returns {Promise<HTMLImageElement>}
    */
   static getRapidGradientNormalMap(
      allLightGradientImage,
      northLightGradientImage,
      eastLightGradientImage,
      frontLightGradientImage
   ) {
      const normalMapShader = new Shader({
         width: allLightGradientImage.width,
         height: allLightGradientImage.height,
      });
      normalMapShader.bind();

      let north = GlslImage.load(northLightGradientImage).getLuminanceFloat();
      let east = GlslImage.load(eastLightGradientImage).getLuminanceFloat();
      let front = GlslImage.load(frontLightGradientImage).getLuminanceFloat();
      let all = GlslImage.load(allLightGradientImage).getLuminanceFloat();

      north = north.divideFloat(all);
      east = east.divideFloat(all);
      front = front.divideFloat(all);

      let normalVector = new GlslVector3([east, north, front]);

      normalVector = new GlslVector3([
         new GlslFloat(0),
         new GlslFloat(1),
         new GlslFloat(0),
      ]);

      const normalMapRendering = GlslRendering.render(
         normalVector.getVector4()
      );

      normalMapShader.purge();
      return normalMapRendering.getJsImage();
   }

   /**
    * @private
    * @param {boolean} cancelIfNewJobSpawned
    */
   constructor(cancelIfNewJobSpawned) {
      NormalMapHelper.renderId++;

      this.renderId = NormalMapHelper.renderId;
      this.cancelIfNewJobSpawned = cancelIfNewJobSpawned;
   }

   /**
    * @private
    * @returns {boolean}
    */
   isRenderObsolete() {
      return (
         this.cancelIfNewJobSpawned && this.renderId < NormalMapHelper.renderId
      );
   }
}
