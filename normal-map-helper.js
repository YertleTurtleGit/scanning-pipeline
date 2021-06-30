//@ts-check
"use strict";

class NormalMapHelper {
  /** @private @type {number} */
  static renderId = 0;

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
   * @param {boolean} cameraVerticalShift
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
    cameraVerticalShift = false
  ) {
    const normalMapHelper = new NormalMapHelper(cancelIfNewJobSpawned);

    return new Promise((resolve) => {
      setTimeout(async () => {
        if (normalMapHelper.isRenderObsolete()) return;

        const normalMapShader = new Shader({
          width: lightImage_000.naturalWidth * (resolutionPercent / 100),
          height: lightImage_000.naturalHeight * (resolutionPercent / 100),
        });

        if (normalMapHelper.isRenderObsolete()) return;

        normalMapShader.bind();

        let lightLuminance_NONE;
        if (lightImage_NONE && lightImage_NONE.naturalWidth > 0) {
          lightLuminance_NONE =
            GlslImage.load(lightImage_NONE).getLuminanceFloat();
        }

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

        if (lightLuminance_NONE) {
          for (let i = 0; i < lightLuminances.length; i++) {
            lightLuminances[i] =
              lightLuminances[i].subtractFloat(lightLuminance_NONE);
          }
        }

        const all = new GlslFloat(0).maximum(...lightLuminances);

        for (let i = 0; i < lightLuminances.length; i++) {
          lightLuminances[i] = lightLuminances[i].divideFloat(all);
        }

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
          function getLightDirectionVector(azimuthalAngleDeg, polarAngleDeg) {
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

        let normalVector = new GlslVector3([
          new GlslFloat(0),
          new GlslFloat(0),
          new GlslFloat(0),
        ])
          .addVector3(...normalVectors)
          .divideFloat(new GlslFloat(normalVectors.length))
          .normalize();

        if (normalMapHelper.isRenderObsolete()) return;

        if (cameraVerticalShift) {
          // TODO: use cameraVerticalShift

          const cameraAngle = Math.atan(
            1 / Math.tan(lightPolarAngleDeg * (Math.PI / 180))
          );

          const zero = new GlslFloat(0);
          const one = new GlslFloat(1);
          const sine = new GlslFloat(Math.sin(cameraAngle));
          const cosine = new GlslFloat(Math.cos(cameraAngle));

          const rotationMatrix = new GlslMatrix3([
            [one, zero, zero],
            [zero, cosine, sine],
            [zero, sine.multiplyFloat(new GlslFloat(-1)), cosine],
          ]);

          // normalVector = rotationMatrix.multiplyVector3(normalVector);
        }

        const normalMapRendering = GlslRendering.render(
          normalVector.getVector4()
        );

        normalMapShader.unbind();

        if (normalMapHelper.isRenderObsolete()) return;

        const normalMap = await normalMapRendering.getJsImage();

        if (uiImageElement && normalMap) {
          uiImageElement.src = normalMap.src;
        }

        resolve(normalMap);
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
        const normalMapShader = new Shader({
          width: lightImage_000.naturalWidth * (resolutionPercent / 100),
          height: lightImage_000.naturalHeight * (resolutionPercent / 100),
        });
        normalMapShader.bind();

        let lightLuminance_ALL =
          GlslImage.load(lightImage_ALL).getLuminanceFloat();

        const lightLuminances = [
          GlslImage.load(lightImage_000).getLuminanceFloat(),
          GlslImage.load(lightImage_090).getLuminanceFloat(),
          GlslImage.load(lightImage_180).getLuminanceFloat(),
          GlslImage.load(lightImage_270).getLuminanceFloat(),
          GlslImage.load(lightImage_FRONT).getLuminanceFloat(),
        ];

        if (lightImage_NONE) {
          const lightLuminance_NONE =
            GlslImage.load(lightImage_NONE).getLuminanceFloat();

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
          .addFloat(new GlslFloat(1))
          .divideFloat(new GlslFloat(2));

        const vertical = lightLuminances[3]
          .subtractFloat(lightLuminances[1])
          .addFloat(new GlslFloat(1))
          .divideFloat(new GlslFloat(2));

        const normalVector = new GlslVector3([
          horizontal,
          vertical,
          lightLuminances[4],
        ]);

        if (normalMapHelper.isRenderObsolete()) return;

        const normalMapRendering = GlslRendering.render(
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
