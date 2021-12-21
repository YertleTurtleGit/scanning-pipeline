/* exported createBreakablePromise */

/**
 * @param {Function} executer
 * @returns {{promise: Promise, break:Function}}
 */
function createBreakablePromise(executer) {
   let global_reject;
   const promise = new Promise((resolve, reject) => {
      global_reject = reject;
      resolve(executer());
   });
   return { promise: promise, break: global_reject };
}
