/* global GLSL */
/* exported NormalMapHelper */

/**
 * @global
 */
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
    * @param {HTMLImageElement} uiImageElement
    * @param {number} resolutionPercent
    * @param {boolean} cameraVerticalShift
    * @param {number} maskThresholdPercent
    * @returns {Promise<HTMLImageElement>}
    */
   static async calculatePhotometricStereoNormalMap(
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
      uiImageElement = undefined,
      resolutionPercent = 100,
      cameraVerticalShift = false,
      maskThresholdPercent = 5
   ) {
      const maskThreshold = maskThresholdPercent / 100;

      const normalMapHelper = new NormalMapHelper();

      return new Promise((resolve) => {
         setTimeout(async () => {
            if (
               lightImage_000.naturalWidth < 1 ||
               lightImage_045.naturalWidth < 1 ||
               lightImage_090.naturalWidth < 1 ||
               lightImage_180.naturalWidth < 1 ||
               lightImage_225.naturalWidth < 1 ||
               lightImage_270.naturalWidth < 1 ||
               lightImage_315.naturalWidth < 1
            )
               return;

            if (normalMapHelper.isRenderObsolete()) return;

            const normalMapShader = new GLSL.Shader({
               width: lightImage_000.naturalWidth * (resolutionPercent / 100),
               height: lightImage_000.naturalHeight * (resolutionPercent / 100),
            });

            if (normalMapHelper.isRenderObsolete()) return;

            normalMapShader.bind();

            const lightImageUniforms = [
               new GLSL.Uniform.Image(lightImage_000),
               new GLSL.Uniform.Image(lightImage_045),
               new GLSL.Uniform.Image(lightImage_090),
               new GLSL.Uniform.Image(lightImage_135),
               new GLSL.Uniform.Image(lightImage_180),
               new GLSL.Uniform.Image(lightImage_225),
               new GLSL.Uniform.Image(lightImage_270),
               new GLSL.Uniform.Image(lightImage_315),
            ];

            const lightLuminances = [];
            lightImageUniforms.forEach((uniform) => {
               lightLuminances.push(
                  uniform.getValue().getPixelColor().getLuminance()
               );
            });

            console.log(lightLuminances);

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
                  GLSL.Image.load(lightImage_NONE).getLuminance();

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

            // TODO: fix alpha
            const alpha = normalVector
               .channel(0)
               .minimum(normalVector.channel(1), normalVector.channel(2))
               .multiplyFloat(new GLSL.Float(99999))
               .minimum(new GLSL.Float(1));

            const normalMapRendering = GLSL.render(
               normalVector.getVector4(alpha)
            );

            if (normalMapHelper.isRenderObsolete()) return;

            const normalMap = await normalMapRendering.getJsImage();

            resolve(normalMap);

            if (uiImageElement && normalMap) {
               uiImageElement.src = normalMap.src;
            }

            normalMapShader.purge();
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
    * @param {HTMLImageElement} uiImageElement
    * @param {number} resolutionPercent
    * @returns {Promise<HTMLImageElement>}
    */
   static async calculateSphericalGradientNormalMap(
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
      const normalMapHelper = new NormalMapHelper();

      if (normalMapHelper.isRenderObsolete()) return;

      return new Promise((resolve) => {
         setTimeout(async () => {
            const normalMapShader = new GLSL.Shader({
               width: lightImage_000.naturalWidth * (resolutionPercent / 100),
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

            if (normalMapHelper.isRenderObsolete()) return;

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
   }

   /**
    * @public
    */
   static cancelRenderJobs() {
      NormalMapHelper.renderId++;
   }

   /**
    * @private
    */
   constructor() {
      this.renderId = NormalMapHelper.renderId;
   }

   /**
    * @private
    * @returns {boolean}
    */
   isRenderObsolete() {
      return this.renderId < NormalMapHelper.renderId;
   }

   /**
    * @public
    * @param {HTMLImageElement} normalMap
    * @param {HTMLImageElement} groundTruthImage
    * @returns {Promise<number>}
    */
   static async getDifferenceValue(normalMap, groundTruthImage) {
      const differenceImage = await NormalMapHelper.getDifferenceMap(
         normalMap,
         groundTruthImage
      );

      const width = differenceImage.width;
      const height = differenceImage.height;

      const imageCanvas = document.createElement("canvas");
      imageCanvas.width = width;
      imageCanvas.height = height;
      const imageContext = imageCanvas.getContext("2d");
      imageContext.drawImage(differenceImage, 0, 0, width, height);
      const imageData = imageContext.getImageData(0, 0, width, height).data;

      let differenceValue = 0;
      for (let x = 0; x < width - 1; x++) {
         for (let y = 0; y < height - 1; y++) {
            const index = (x + y * width) * 4;
            const localDifference = imageData[index] / 255;
            differenceValue += localDifference;
         }
      }
      differenceValue /= width * height;

      return differenceValue;
   }

   /**
    * @public
    * @param {HTMLImageElement} normalMap
    * @param {HTMLImageElement} groundTruthImage
    * @returns {Promise<HTMLImageElement>}
    */
   static async getDifferenceMap(normalMap, groundTruthImage) {
      return new Promise((resolve) => {
         const differenceShader = new GLSL.Shader({
            width: normalMap.width,
            height: normalMap.height,
         });
         differenceShader.bind();

         const normalImage = GLSL.Image.load(normalMap);
         const groundTruthShaderImage = GLSL.Image.load(groundTruthImage);

         let normal = new GLSL.Vector3([
            normalImage.channel(0),
            normalImage.channel(1),
            normalImage.channel(2),
         ]);

         let groundTruth = new GLSL.Vector3([
            groundTruthShaderImage.channel(0),
            groundTruthShaderImage.channel(1),
            groundTruthShaderImage.channel(2),
         ]);

         const zeroAsErrorSummand = new GLSL.Float(1).subtractFloat(
            normal.length().step().divideFloat(groundTruth.length().step())
         );

         groundTruth = groundTruth.normalize();

         const differenceAngle = normal
            .dot(groundTruth)
            .acos()
            .abs()
            .addFloat(zeroAsErrorSummand);

         normal = normal.normalize();

         const differenceMap = new Image();
         differenceMap.addEventListener("load", () => {
            resolve(differenceMap);
         });
         differenceMap.src = GLSL.render(
            new GLSL.Vector4([
               differenceAngle,
               differenceAngle,
               differenceAngle,
               new GLSL.Float(1),
            ])
         ).getDataUrl();

         differenceShader.purge();
      });
   }
}

NormalMapHelper.renderId = 0;
