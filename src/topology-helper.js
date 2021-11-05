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
            middleValue = null;
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
            middleValue = null;
         }

         yCoordinates.push(middleValue);
      }

      return yCoordinates;
   }
}
