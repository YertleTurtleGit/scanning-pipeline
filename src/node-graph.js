/* exported NodeGraph, GraphNode */

class NodeGraph {
   constructor() {
      /**
       * @private
       * @type {GraphNode[]}
       */
      this.graphNodes = [];
   }

   /**
    * @param {GraphNode} graphNode
    */
   addNode(graphNode) {
      this.graphNodes.push(graphNode);
   }

   /**
    * @param {GraphNode} graphNode
    */
   removeNode(graphNode) {
      const graphNodeIndex = this.graphNodes.indexOf(graphNode);
      this.graphNodes.splice(graphNodeIndex);
   }
}

class GraphNode {
   /**
    * @param {Function} executer
    */
   constructor(executer) {
      /** @private */
      this.executer = executer;

      /** @private */
      this.name = this.readName();

      /** @private */
      this.graphNodeInputs = this.readInputConnections();

      /** @private */
      this.graphNodeOutputs = this.readOutputConnections();

      /**
       * @private
       * @type {{output: GraphNodeOutput, input: GraphNodeInput}[]}
       */
      this.outputConnections = [];

      this.readFunctionSourceWithDocs();
   }

   /**
    * @private
    * @returns {string}
    */
   readName() {
      return this.executer.name;
   }

   /**
    * @private
    * @returns {GraphNodeInput[]}
    */
   readInputConnections() {}

   /**
    * @private
    * @returns {GraphNodeOutput[]}
    */
   readOutputConnections() {}

   /**
    * @private
    * @returns {Promise<string>}
    */
   async readFunctionSourceWithDocs() {
      const scriptElements = Array.from(document.scripts);

      const functionSource = this.executer.toString();

      for (let i = 0, count = scriptElements.length; i < count; i++) {
         const scriptSource = await new Promise((resolve) => {
            window.fetch(scriptElements[i].src).then(async (response) => {
               resolve(await response.text());
            });
         });

         if (scriptSource.includes(functionSource)) {
            const jsDocExists = scriptSource.includes("*/\n" + functionSource);

            if (jsDocExists) {
               const jsDoc = scriptSource
                  .split("*/\n" + functionSource)[0]
                  .split("/**\n")
                  .pop();
               console.log(jsDoc);
            }
         }
      }
   }
}

class GraphNodeInput {}

class GraphNodeOutput {}

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function add(a, b) {
   const sum = a + b;
   return sum;
}

new GraphNode(add);

console.log("bla");
