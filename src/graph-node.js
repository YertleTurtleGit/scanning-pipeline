/* exported GraphNode, GraphArea */

class GraphNode {
   /**
    * @param {Function} executer
    * @param {{name:string, type:string}[]} inputs
    * @param {{name:string, type:string}} output
    * @param {Function} thisParameter
    */
   constructor(executer, inputs, output, thisParameter = null) {
      this.executer = executer;
      this.inputs = inputs;
      this.output = output;
      this.thisParameter = thisParameter;
   }

   /**
    * @param  {...any} parameters
    */
   async execute(...parameters) {
      await new Promise((resolve) => {
         setTimeout(async () => {
            const executerFunction = this.executer.bind(
               this.thisParameter,
               parameters
            );
            resolve(await executerFunction());
         });
      });
   }
}

class GraphArea {
   /**
    * @param {HTMLElement} parentElement
    */
   constructor(parentElement = document.body) {
      this.div = document.createElement("div");
      parentElement.appendChild(this.div);
   }

   /**
    * @param {GraphNode} graphNode
    */
   addNode(graphNode) {
      this.div.appendChild(this.getNodeDiv(graphNode));
   }

   /**
    * @private
    * @param {GraphNode} graphNode
    * @returns {HTMLDivElement} nodeDiv
    */
   getNodeDiv(graphNode) {
      graphNode.inputs.forEach((input) => {});
   }
}

function testFunction(bla1, bla2) {
   return bla1 + bla2;
}

const graphArea = new GraphArea();

const graphNode = new GraphNode(
   testFunction,
   [
      { name: "bla1", type: typeof Number },
      { name: "bla2", type: typeof Number },
   ],
   { name: "resultbla", type: typeof Number }
);
