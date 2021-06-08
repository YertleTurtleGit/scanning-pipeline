//@ts-check
"use strict";

class NormalMapping {
   static POLAR_ANGLE_DEG = 36;

   static EAST_AZIMUTHAL_ANGLE_DEG = 0;
   static NORTH_EAST_AZIMUTHAL_ANGLE_DEG = 45;
   static NORTH_AZIMUTHAL_ANGLE_DEG = 90;
   static NORTH_WEST_AZIMUTHAL_ANGLE_DEG = 135;
   static WEST_AZIMUTHAL_ANGLE_DEG = 180;
   static SOUTH_WEST_AZIMUTHAL_ANGLE_DEG = 225;
   static SOUTH_AZIMUTHAL_ANGLE_DEG = 270;
   static SOUTH_EAST_AZIMUTHAL_ANGLE_DEG = 315;

   static getPhotometricStereoNormalMapping(
      eastLightImage,
      southEastLightImage,
      southLightImage,
      southWestLightImage,
      westLightImage,
      northWestLightImage,
      northLightImage,
      northEastLightImage,
      polarAngleDeg
   ) {
      const normalMapShader = new Shader({
         width: northLightImage.width,
         height: northLightImage.height,
      });
      normalMapShader.bind();

      let north = GlslImage.load(northLightImage).getLuminanceFloat();
      let northEast = GlslImage.load(northEastLightImage).getLuminanceFloat();
      let east = GlslImage.load(eastLightImage).getLuminanceFloat();
      let southEast = GlslImage.load(southEastLightImage).getLuminanceFloat();
      let south = GlslImage.load(southLightImage).getLuminanceFloat();
      let southWest = GlslImage.load(southWestLightImage).getLuminanceFloat();
      let west = GlslImage.load(westLightImage).getLuminanceFloat();
      let northWest = GlslImage.load(northWestLightImage).getLuminanceFloat();

      const all = north.maximum(
         northEast,
         east,
         southEast,
         south,
         southWest,
         west,
         northWest
      );

      north = north.divideFloat(all);
      northEast = northEast.divideFloat(all);
      east = east.divideFloat(all);
      southEast = southEast.divideFloat(all);
      south = south.divideFloat(all);
      southWest = southWest.divideFloat(all);
      west = west.divideFloat(all);
      northWest = northWest.divideFloat(all);

      function getAnisotropicNormalVector(
         originLuminance,
         orthogonalLuminance,
         oppositeLuminance,

         originAzimuthalAngleDeg,
         orthogonalAzimuthalAngleDeg,
         oppositeAzimuthalAngleDeg,

         polarAngleDeg
      ) {
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

      const normalVectors = [];
      normalVectors.push(
         getAnisotropicNormalVector(
            west,
            north,
            east,
            NormalMapping.WEST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.NORTH_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.EAST_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         ),
         getAnisotropicNormalVector(
            west,
            south,
            east,
            NormalMapping.WEST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.SOUTH_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.EAST_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         ),
         getAnisotropicNormalVector(
            south,
            west,
            north,
            NormalMapping.SOUTH_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.WEST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.NORTH_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         ),
         getAnisotropicNormalVector(
            south,
            east,
            north,
            NormalMapping.SOUTH_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.EAST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.NORTH_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         ),
         getAnisotropicNormalVector(
            northWest,
            northEast,
            southEast,
            NormalMapping.NORTH_WEST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.NORTH_EAST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.SOUTH_EAST_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         ),
         getAnisotropicNormalVector(
            northWest,
            southWest,
            southEast,
            NormalMapping.NORTH_WEST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.SOUTH_WEST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.SOUTH_EAST_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         ),
         getAnisotropicNormalVector(
            northEast,
            southEast,
            southWest,
            NormalMapping.NORTH_EAST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.SOUTH_EAST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.SOUTH_WEST_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         ),
         getAnisotropicNormalVector(
            northEast,
            northWest,
            southWest,
            NormalMapping.NORTH_EAST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.NORTH_WEST_AZIMUTHAL_ANGLE_DEG,
            NormalMapping.SOUTH_WEST_AZIMUTHAL_ANGLE_DEG,
            polarAngleDeg
         )
      );

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

      const normalMapRendering = GlslRendering.render(
         normalVector.getVector4()
      );

      normalMapShader.unbind();
      return normalMapRendering;
   }

   static getRapidGradientNormalMapping(
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

      const normalMapRendering = GlslRendering.render(
         normalVector.getVector4()
      );
      normalMapShader.unbind();

      return normalMapRendering;
   }
}
