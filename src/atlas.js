/* global GLSL */
/* exported Atlas */

class Atlas {
   /**
    * @param {HTMLImageElement} atlasMask
    */
   constructor(atlasMask) {
      this.atlasMask = atlasMask;
      this.atlasDimensions = {
         width: atlasMask.width,
         height: atlasMask.height,
      };
   }

   /**
    * @private
    * @returns {Uint8Array}
    */
   getEdgeMask() {
      const edgeShader = new GLSL.Shader(this.atlasDimensions);

      const edgeKernel = [
         [0, -1, 0],
         [-1, 4, -1],
         [0, -1, 0],
      ];

      edgeShader.bind();

      const colorPixelArray = GLSL.render(
         new GLSL.Image(this.atlasMask).getPixelColor()
      ).getPixelArray();

      /*const edge = new GLSL.Image(this.atlasMask)
         .applyFilter(edgeKernel)
         .getLuminance();

      const colorPixelArray = GLSL.render(
         new GLSL.Vector4([edge, edge, edge, new GLSL.Float(1)])
      ).getPixelArray();*/

      edgeShader.purge();

      const pixelArray = new Uint8Array(
         this.atlasDimensions.width * this.atlasDimensions.height
      );
      for (let i = 0; i < colorPixelArray.length; i += 4) {
         pixelArray[i / 4] = colorPixelArray[i];
      }

      return pixelArray;
   }

   /**
    * @returns {{x:number, y:number, w:number, h:number}[]}
    */
   getCountryData() {
      /** @type {{x:number, y:number, w:number, h:number}[]} */
      const countryData = [];

      const edgeMask = this.getEdgeMask();

      const countryPixelIndices = [];

      edgeMask.forEach((pixel, index) => {
         if (pixel === 255) {
            let startY = 0;

            while (index > this.atlasDimensions.width) {
               index -= this.atlasDimensions.width;
               startY++;
            }
            //startY = this.atlasDimensions.height - startY;
            const startX = index;

            //console.log({ startX, startY });

            const pixelStack = [[startX, startY]];
            const drawingBoundTop = 0;
            const drawingBoundLeft = 0;
            const drawingBoundBottom = this.atlasDimensions.height - 1;
            const drawingBoundRight = this.atlasDimensions.width - 1;

            while (pixelStack.length > 0) {
               let newPos, x, y, pixelPos, reachLeft, reachRight;

               newPos = pixelStack.pop();
               x = newPos[0];
               y = newPos[1];

               // Get current pixel position
               pixelPos = y * this.atlasDimensions.width + x;

               // Go up as long as the color matches and are inside the canvas
               while (y >= drawingBoundTop && edgeMask[pixelPos] === 255) {
                  y -= 1;
                  pixelPos -= this.atlasDimensions.width;
               }

               pixelPos += this.atlasDimensions.width;
               y += 1;
               reachLeft = false;
               reachRight = false;

               // Go down as long as the color matches and in inside the canvas
               while (y <= drawingBoundBottom && edgeMask[pixelPos] === 255) {
                  y += 1;

                  edgeMask[pixelPos] = 0;
                  countryPixelIndices.push(pixelPos);

                  if (x > drawingBoundLeft) {
                     if (edgeMask[pixelPos - 1] === 255) {
                        if (!reachLeft) {
                           // Add pixel to stack
                           pixelStack.push([x - 1, y]);
                           reachLeft = true;
                        }
                     } else if (reachLeft) {
                        reachLeft = false;
                     }
                  }

                  if (x < drawingBoundRight) {
                     if (edgeMask[pixelPos + 1] === 255) {
                        if (!reachRight) {
                           // Add pixel to stack
                           pixelStack.push([x + 1, y]);
                           reachRight = true;
                        }
                     } else if (reachRight) {
                        reachRight = false;
                     }
                  }

                  pixelPos += this.atlasDimensions.width;
               }
            }
         }

         let left = this.atlasDimensions.width;
         let right = 0;
         let top = this.atlasDimensions.height;
         let bottom = 0;

         countryPixelIndices.forEach((countryPixelIndex) => {
            let y = 0;
            while (countryPixelIndex > this.atlasDimensions.width) {
               countryPixelIndex -= this.atlasDimensions.width;
               y++;
            }
            //y = this.atlasDimensions.heigh - y;
            const x = countryPixelIndex;

            if (x < left) {
               left = x;
            }
            if (x > right) {
               right = x;
            }
            if (y < top) {
               top = y;
            }
            if (y > bottom) {
               bottom = y;
            }
         });

         const width = right - left;
         const height = bottom - top;

         countryData.push({ x: left, y: top, w: width, h: height });
         return countryData;
      });

      return countryData;
   }
}

const testMask = /** @type {HTMLImageElement} */ (
   document.getElementById("testImage")
);
testMask.addEventListener("load", () => {
   const testAtlas = new Atlas(testMask);
   const testCountryData = testAtlas.getCountryData();

   console.log(testCountryData[0]);

   const testCanvas = document.createElement("canvas");
   document.body.appendChild(testCanvas);
   testCanvas.width = testMask.naturalWidth;
   testCanvas.height = testMask.naturalHeight;
   const testContext = testCanvas.getContext("2d");
   testContext.drawImage(testMask, 0, 0);

   testCountryData.forEach((country) => {
      testContext.beginPath();
      testContext.strokeStyle = "green";
      testContext.lineWidth = 1;
      testContext.rect(country.x, country.y, country.w, country.h);
      testContext.stroke();
   });

   testMask.style.display = "none";
});
