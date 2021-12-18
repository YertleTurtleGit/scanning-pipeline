/* exported FunctionWorker */

class FunctionWorker {
   /**
    * @param {Function} workerFunction
    */
   constructor(workerFunction) {
      this.workerFunction = workerFunction;
      this.worker = this.constructWorker();
   }

   /**
    * @private
    * @returns {Worker}
    */
   constructWorker() {
      const workerFunctionString =
         this.workerFunction.toString() +
         "\n" +
         this.workerFunction.name +
         "();";

      const blob = new Blob([workerFunctionString], {
         type: "text/javascript",
      });
      const workerSrc = window.URL.createObjectURL(blob);
      return new Worker(workerSrc);
   }

   /**
    * @public
    * @param {(this: Worker, messageEvent: MessageEvent) => any} listenerFunction
    */
   addMessageEventListener(listenerFunction) {
      this.worker.addEventListener("message", listenerFunction);
   }

   /**
    * @public
    * @param  {any} message
    */
   postMessage(message) {
      this.worker.postMessage(message);
   }

   /**
    * @public
    */
   terminate() {
      this.worker.terminate();
   }
}
