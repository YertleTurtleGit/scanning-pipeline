/* global Chart */
/* exported BulkChartHelper */

/**
 * @global
 */
class BulkChartHelper {
   /**
    * @public
    * @param {HTMLCanvasElement} chartCanvas
    * @param {HTMLInputElement} rangeInput
    * @param {Function} preHook
    * @param {Function} normalMapDifferenceValueFunction
    * @param {Function} depthMapDifferenceValueFunction
    */
   static async bulkChartRangeInput(
      chartCanvas,
      rangeInput,
      preHook,
      normalMapDifferenceValueFunction,
      depthMapDifferenceValueFunction
   ) {
      const min = Number(rangeInput.min);
      const max = Number(rangeInput.max);
      const step = Number(rangeInput.step);

      const bulkChartHelper = new BulkChartHelper(
         chartCanvas,
         min,
         max,
         step,
         rangeInput.title
      );

      let fraction = 1;
      let fractionStep = max / fraction - step - min;

      do {
         if (fractionStep < step * 2) fractionStep = step;

         for (let i = min - step; i < max; i += fractionStep) {
            if (BulkChartHelper.abortFlag) {
               bulkChartHelper.abort();
               return;
            }
            while (BulkChartHelper.pauseFlag) {
               if (BulkChartHelper.abortFlag) {
                  bulkChartHelper.abort();
                  return;
               }
               await new Promise((resolve) => {
                  setTimeout(resolve, 1000);
               });
            }

            if (!bulkChartHelper.isDataPoint(0, Math.round(i))) {
               rangeInput.value = String(Math.round(i));

               console.log(Math.round(i));

               await preHook();

               const normalMapDifferenceValue =
                  await normalMapDifferenceValueFunction();

               bulkChartHelper.setDataPoint(
                  0,
                  Math.round(i),
                  1 - normalMapDifferenceValue
               );

               const depthMapDifferenceValue =
                  await depthMapDifferenceValueFunction();

               bulkChartHelper.setDataPoint(
                  1,
                  Math.round(i),
                  1 - depthMapDifferenceValue
               );
            }
         }
         fraction *= 2;
         fractionStep = max / fraction;
      } while (fractionStep >= step);

      while (!BulkChartHelper.abortFlag) {
         await new Promise((resolve) => {
            setTimeout(resolve, 1000);
         });
      }

      bulkChartHelper.abort();
   }

   /**
    * @private
    * @param {HTMLCanvasElement} canvas
    * @param {number} minimum
    * @param {number} maximum
    * @param {number} step
    * @param {string} title
    */
   constructor(canvas, minimum, maximum, step, title = "untitled") {
      BulkChartHelper.currentInstance = this;

      this.context = canvas.getContext("2d");

      this.title = title;

      this.dataA = [];
      this.dataB = [];
      this.labels = [];

      for (let i = minimum; i < maximum + step; i += step) {
         this.dataA.push(undefined);
         this.dataB.push(undefined);
         this.labels.push(String(i));
      }

      this.data = {
         labels: this.labels,
         datasets: [
            {
               label: "Normal Mapping Accuracy",
               data: this.dataA,
               backgroundColor: "hsl(180, 50%, 50%)",
               borderColor: "hsl(180, 50%, 50%)",
            },
            {
               label: "Depth Mapping Accuracy",
               data: this.dataB,
               backgroundColor: "hsl(90, 50%, 50%)",
               borderColor: "hsl(90, 50%, 50%)",
            },
         ],
      };

      this.config = {
         type: "line",
         data: this.data,
         options: {
            spanGaps: true,
            animation: false,
            responsive: true,
            plugins: {
               legend: {
                  position: "bottom",
               },
            },
         },
      };

      // @ts-ignore
      this.chart = new Chart(this.context, this.config);
   }

   /**
    * @public
    */
   static downloadCurrentDataFile() {
      BulkChartHelper.currentInstance.downloadDataFile();
   }

   /**
    * @public
    * @param {string} filename
    */
   downloadDataFile(filename = "accuracy") {
      const element = document.createElement("a");
      element.style.display = "none";

      const blob = new Blob([this.getDataFileString()], {
         type: "text/plain; charset = utf-8",
      });

      const url = window.URL.createObjectURL(blob);
      element.setAttribute("href", window.URL.createObjectURL(blob));
      element.setAttribute("download", filename);

      document.body.appendChild(element);

      element.click();

      window.URL.revokeObjectURL(url);
      element.remove();
   }

   /**
    * @private
    * @returns {string}
    */
   getDataFileString() {
      this.dataFileString =
         this.title.replace(" ", "_") +
         " normal_mapping_accuracy depth_mapping_accuracy";

      const length = this.data.datasets[0].data.length;

      for (let i = 0; i < length; i++) {
         const normalAccuracy = this.data.datasets[0].data[i];
         const depthAccuracy = this.data.datasets[1].data[i];

         if (normalAccuracy && depthAccuracy) {
            this.dataFileString +=
               "\n" +
               String(i) +
               " " +
               String(normalAccuracy) +
               " " +
               String(depthAccuracy);
         }
      }

      return this.dataFileString;
   }

   /**
    * @public
    * @param {number} dataset
    * @param {number} index
    * @returns {boolean}
    */
   isDataPoint(dataset, index) {
      return this.chart.data.datasets[dataset].data[index] !== undefined;
   }

   /**
    * @public
    * @param {number} dataset
    * @param {number} index
    * @param {number} value
    */
   setDataPoint(dataset, index, value) {
      this.chart.data.datasets[dataset].data[index] = value;
      this.chart.update();
   }

   /**
    * @public
    */
   abort() {
      this.chart.destroy();
   }

   /**
    * @public
    */
   static pauseAll() {
      BulkChartHelper.pauseFlag = true;
   }

   /**
    * @public
    */
   static abortAll() {
      BulkChartHelper.abortFlag = true;
   }

   /**
    * @public
    */
   static resetAll() {
      BulkChartHelper.abortFlag = false;
      BulkChartHelper.pauseFlag = false;
   }
}

BulkChartHelper.currentInstance = undefined;
BulkChartHelper.pauseFlag = false;
BulkChartHelper.abortFlag = false;
