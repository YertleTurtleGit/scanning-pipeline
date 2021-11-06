/* exported GraphNode, GraphArea */

class GraphNode {
   /**
    * @param {Function} executer
    * @param {{name:string, type:NODE_TYPE, description:string}[]} inputs
    * @param {{name:string, type:NODE_TYPE, description:string}} output
    * @param {string} displayName
    * @param {Function} thisParameter
    */
   constructor(
      executer,
      inputs,
      output,
      displayName = executer.name,
      thisParameter = null
   ) {
      this.executer = executer;
      this.inputs = inputs;
      this.output = output;
      this.displayName = displayName;
      this.thisParameter = thisParameter;

      this.nodeDiv = undefined;
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

   /**
    * @returns {HTMLDivElement} nodeDiv
    */
   getNodeDiv() {
      if (this.nodeDiv) {
         return this.nodeDiv;
      }
      this.nodeDiv = document.createElement("div");

      const nodeTitleSpan = document.createElement("span");
      nodeTitleSpan.innerText = this.displayName;
      this.nodeDiv.appendChild(nodeTitleSpan);

      const nodeDivInputList = document.createElement("ul");
      this.nodeDiv.appendChild(nodeDivInputList);
      const nodeDivOutputList = document.createElement("ul");
      this.nodeDiv.appendChild(nodeDivOutputList);

      this.inputs.forEach((input) => {
         const inputListItem = document.createElement("li");
         inputListItem.innerText = input.name + input.type;
         nodeDivInputList.appendChild(inputListItem);
      });

      const outputListItem = document.createElement("li");
      outputListItem.innerText = this.output.name + this.output.type;
      nodeDivOutputList.appendChild(outputListItem);

      this.nodeDiv.style.width = "15rem";
      this.nodeDiv.style.padding = "0.5rem";
      this.nodeDiv.style.border = "solid 0.1rem black";
      this.nodeDiv.style.borderRadius = "0.5rem";

      return this.nodeDiv;
   }
}

/**
 * @constant
 * @typedef {string} NODE_TYPE
 */
GraphNode.NODE_TYPE = {
   NUMBER: " ∈ ℝ",
   IMAGE: " ⎚",
};

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
      this.div.appendChild(graphNode.getNodeDiv());
   }
}

/**
 * @param {number} bla1
 * @param {number} bla2
 * @returns {number}
 */
function testFunction(bla1, bla2) {
   return bla1 + bla2;
}

const graphArea = new GraphArea();

const graphNode = new GraphNode(
   testFunction,
   [
      { name: "bla1", type: GraphNode.NODE_TYPE.NUMBER },
      { name: "bla2", type: GraphNode.NODE_TYPE.NUMBER },
   ],
   { name: "resultbla", type: GraphNode.NODE_TYPE.NUMBER }
);

graphArea.addNode(graphNode);
