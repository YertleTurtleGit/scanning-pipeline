/* global GLSL */
/* exported NormalMapHelper */

class NormalMapHelper {
   /**
    * @public
    * @param {number} lightPolarAngleDeg
    * @param {HTMLImageElement} lightImage_000
    * @param {HTMLImageElement} lightImage_045
    * @param {HTMLImageElement} lightImage_090
    * @param {HTMLImageElement} lightImage_135
    * @param {HTMLImageElement} lightImage_180
    * @param {HTMLImageElement} lightImage_225
    * @param {HTMLImageElement} lightImage_270
    * @param {HTMLImageElement} lightImage_315
    * @param {HTMLImageElement} lightImage_NONE
    * @param {boolean} cancelIfNewJobSpawned
    * @param {HTMLImageElement} uiImageElement
    * @param {number} resolutionPercent
    * @param {boolean} cameraVerticalShift
    * @param {number} maskThresholdPercent
    * @returns {Promise<HTMLImageElement>}
    */
   static async getPhotometricStereoNormalMap(
      lightPolarAngleDeg,
      lightImage_000,
      lightImage_045,
      lightImage_090,
      lightImage_135,
      lightImage_180,
      lightImage_225,
      lightImage_270,
      lightImage_315,
      lightImage_NONE = undefined,
      cancelIfNewJobSpawned = false,
      uiImageElement = undefined,
      resolutionPercent = 100,
      cameraVerticalShift = false,
      maskThresholdPercent = 5
   ) {
      const maskThreshold = maskThresholdPercent / 100;

      const normalMapHelper = new NormalMapHelper(cancelIfNewJobSpawned);

      return new Promise((resolve) => {
         setTimeout(async () => {
            if (normalMapHelper.isRenderObsolete()) return;

            const normalMapShader = new GLSL.Shader({
               width: lightImage_000.naturalWidth * (resolutionPercent / 100),
               height: lightImage_000.naturalHeight * (resolutionPercent / 100),
            });

            if (normalMapHelper.isRenderObsolete()) return;

            normalMapShader.bind();

            const lightLuminances = [
               GLSL.Image.load(lightImage_000).getLuminanceFloat(),
               GLSL.Image.load(lightImage_045).getLuminanceFloat(),
               GLSL.Image.load(lightImage_090).getLuminanceFloat(),
               GLSL.Image.load(lightImage_135).getLuminanceFloat(),
               GLSL.Image.load(lightImage_180).getLuminanceFloat(),
               GLSL.Image.load(lightImage_225).getLuminanceFloat(),
               GLSL.Image.load(lightImage_270).getLuminanceFloat(),
               GLSL.Image.load(lightImage_315).getLuminanceFloat(),
            ];

            const all = new GLSL.Float(0).maximum(...lightLuminances);

            let mask = new GLSL.Float(1);

            if (
               lightImage_NONE &&
               Math.min(
                  lightImage_NONE.naturalWidth,
                  lightImage_NONE.naturalHeight
               ) > 0
            ) {
               const lightLuminance_NONE =
                  GLSL.Image.load(lightImage_NONE).getLuminanceFloat();

               for (let i = 0; i < lightLuminances.length; i++) {
                  lightLuminances[i] =
                     lightLuminances[i].subtractFloat(lightLuminance_NONE);
               }

               mask = all
                  .subtractFloat(lightLuminance_NONE)
                  .step(new GLSL.Float(maskThreshold));
            }

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
               if (normalMapHelper.isRenderObsolete()) return;

               /**
                * @param {number} azimuthalAngleDeg
                * @param {number} polarAngleDeg
                * @returns {GLSL.Vector3}
                */
               function getLightDirectionVector(
                  azimuthalAngleDeg,
                  polarAngleDeg
               ) {
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

            let normalVector = new GLSL.Vector3([
               new GLSL.Float(0),
               new GLSL.Float(0),
               new GLSL.Float(0),
            ])
               .addVector3(...normalVectors)
               .divideFloat(new GLSL.Float(normalVectors.length))
               .normalize()
               .multiplyFloat(mask);

            if (normalMapHelper.isRenderObsolete()) return;

            if (cameraVerticalShift) {
               // TODO: use cameraVerticalShift

               /*const cameraAngle = Math.atan(
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

               normalVector = rotationMatrix.multiplyVector3(normalVector);*/
            }

            const normalMapRendering = GLSL.Rendering.render(
               normalVector.getVector4()
            );

            if (normalMapHelper.isRenderObsolete()) return;

            const normalMap = await normalMapRendering.getJsImage();

            resolve(normalMap);

            if (uiImageElement && normalMap) {
               uiImageElement.src = normalMap.src;
            }

            normalMapShader.unbind();
         }, 100);
      });
   }

   /**
    * @public
    * @param {HTMLImageElement} lightImage_000
    * @param {HTMLImageElement} lightImage_090
    * @param {HTMLImageElement} lightImage_180
    * @param {HTMLImageElement} lightImage_270
    * @param {HTMLImageElement} lightImage_ALL
    * @param {HTMLImageElement} lightImage_FRONT
    * @param {HTMLImageElement} lightImage_NONE
    * @param {boolean} cancelIfNewJobSpawned
    * @param {HTMLImageElement} uiImageElement
    * @param {number} resolutionPercent
    * @returns {Promise<HTMLImageElement>}
    */
   static async getRapidGradientNormalMap(
      lightImage_000,
      lightImage_090,
      lightImage_180,
      lightImage_270,
      lightImage_ALL,
      lightImage_FRONT,
      lightImage_NONE = undefined,
      cancelIfNewJobSpawned = false,
      uiImageElement = undefined,
      resolutionPercent = 100
   ) {
      const normalMapHelper = new NormalMapHelper(cancelIfNewJobSpawned);

      if (normalMapHelper.isRenderObsolete()) return;

      return new Promise((resolve) => {
         setTimeout(async () => {
            const normalMapShader = new GLSL.Shader({
               width: lightImage_000.naturalWidth * (resolutionPercent / 100),
               height: lightImage_000.naturalHeight * (resolutionPercent / 100),
            });
            normalMapShader.bind();

            let lightLuminance_ALL =
               GLSL.Image.load(lightImage_ALL).getLuminanceFloat();

            const lightLuminances = [
               GLSL.Image.load(lightImage_000).getLuminanceFloat(),
               GLSL.Image.load(lightImage_090).getLuminanceFloat(),
               GLSL.Image.load(lightImage_180).getLuminanceFloat(),
               GLSL.Image.load(lightImage_270).getLuminanceFloat(),
               GLSL.Image.load(lightImage_FRONT).getLuminanceFloat(),
            ];

            if (lightImage_NONE) {
               const lightLuminance_NONE =
                  GLSL.Image.load(lightImage_NONE).getLuminanceFloat();

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

            if (normalMapHelper.isRenderObsolete()) return;

            const normalMapRendering = GLSL.Rendering.render(
               normalVector.normalize().getVector4()
            );

            normalMapShader.unbind();

            const normalMap = await normalMapRendering.getJsImage();

            if (uiImageElement && normalMap) {
               uiImageElement.src = normalMap.src;
            }

            resolve(normalMap);
         });
      });
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

NormalMapHelper.renderId = 0;
