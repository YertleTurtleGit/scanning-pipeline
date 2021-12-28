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
         "self.addEventListener('message', (messageEvent) => {\n" +
         this.workerFunction.name +
         "(messageEvent);\n}\n);";

      const blob = new Blob([workerFunctionString], {
         type: "text/javascript",
      });
      const workerSrc = URL.createObjectURL(blob);
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
    * @param {Transferable[]} transfer
    */
   postMessage(message, transfer = undefined) {
      this.worker.postMessage(message, transfer);
   }

   /**
    * @public
    */
   terminate() {
      this.worker.terminate();
   }
}
