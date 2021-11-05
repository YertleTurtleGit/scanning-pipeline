/* exported TopologyHelper */

class TopologyHelper {
   /**
    * @param {HTMLImageElement} mask
    * @param {HTMLCanvasElement} uiCanvas
    */
   constructor(mask, uiCanvas = undefined) {
      this.mask = mask;
      this.dimensions = {
         width: this.mask.naturalWidth,
         height: this.mask.naturalHeight,
      };
      if (uiCanvas) {
         this.canvas = uiCanvas;
      } else {
         this.canvas = document.createElement("canvas");
      }
      this.initializeCanvas();

      this.getHorizontalMiddleLine();
      this.getVerticalMiddleLine();
   }

   /**
    * @private
    */
   initializeCanvas() {
      this.canvas.width = this.dimensions.width;
      this.canvas.height = this.dimensions.height;
      this.context = this.canvas.getContext("2d");
      this.context.drawImage(this.mask, 0, 0);
      this.imageData = this.context.getImageData(
         0,
         0,
         this.dimensions.width,
         this.dimensions.height
      ).data;

      this.context.fillStyle = "black";
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.context.save();

      this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
      this.context.rotate(this.getRotationAngle());
      this.context.drawImage(
         this.mask,
         -this.canvas.width / 2,
         -this.canvas.height / 2
      );

      this.context.restore();

      this.imageData = this.context.getImageData(
         0,
         0,
         this.dimensions.width,
         this.dimensions.height
      ).data;
   }

   /**
    * @private
    * @returns {number}
    */
   getRotationAngle() {
      const horizontalMiddleLine = this.getHorizontalMiddleLine();

      let averageSlope = 0;
      let slopeCount = 0;

      for (let i = 1, max = horizontalMiddleLine.length; i < max; i++) {
         if (horizontalMiddleLine[i] && horizontalMiddleLine[i - 1]) {
            const slope = horizontalMiddleLine[i] - horizontalMiddleLine[i - 1];
            averageSlope += slope;
            slopeCount++;
         }
      }
      averageSlope /= slopeCount;

      return Math.atan(averageSlope);
   }

   /**
    * @private
    * @returns {number[]} xCoordinates
    */
   getHorizontalMiddleLine() {
      const xCoordinates = [];

      for (let y = 0; y < this.dimensions.height - 1; y++) {
         let middleValue = 0;
         let rowCount = 0;

         for (let x = 0; x < this.dimensions.width - 1; x++) {
            const index = (x + y * this.dimensions.width) * 4;
            if (this.imageData[index] !== 0) {
               middleValue += x;
               rowCount++;
            }
         }

         if (rowCount > 0) {
            middleValue = Math.round(middleValue / rowCount);
            this.context.fillStyle = "red";
            this.context.fillRect(middleValue, y, 1, 1);
         } else {
            middleValue = undefined;
         }

         xCoordinates.push(middleValue);
      }

      return xCoordinates;
   }

   /**
    * @private
    * @returns {number[]} yCoordinates
    */
   getVerticalMiddleLine() {
      const yCoordinates = [];

      for (let x = 0; x < this.dimensions.width - 1; x++) {
         let middleValue = 0;
         let rowCount = 0;

         for (let y = 0; y < this.dimensions.height - 1; y++) {
            const index = (x + y * this.dimensions.width) * 4;
            if (this.imageData[index] !== 0) {
               middleValue += y;
               rowCount++;
            }
         }

         if (rowCount > 0) {
            middleValue = Math.round(middleValue / rowCount);
            this.context.fillStyle = "blue";
            this.context.fillRect(x, middleValue, 1, 1);
         } else {
            middleValue = undefined;
         }

         yCoordinates.push(middleValue);
      }

      return yCoordinates;
   }
}
