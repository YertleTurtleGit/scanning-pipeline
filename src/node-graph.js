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
      this.graphNodeInputs = [];
      /** @private */
      this.graphNodeOutputs = [];

      this.readFunctionSourceWithDocs();

      /**
       * @private
       * @type {{output: GraphNodeOutput, input: GraphNodeInput}[]}
       */
      this.outputConnections = [];
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
                  .pop()
                  .replaceAll("\n", "")
                  .replaceAll("*", "");

               const jsDocArguments = jsDoc.split("@");
               jsDocArguments.shift();

               jsDocArguments.forEach((argument) => {
                  const argumentType = argument.split(" ")[0];

                  if (argumentType === "param") {
                     const argumentVarType = argument
                        .split("{")[1]
                        .split("}")[0];
                     const argumentVarName = argument
                        .split("} ")[1]
                        .split(" ")[0];
                     const argumentDescription = argument.split(
                        " " + argumentVarName + " ",
                        2
                     )[1];

                     this.graphNodeInputs.push(
                        new GraphNodeInput(
                           argumentVarName,
                           argumentVarType,
                           argumentDescription
                        )
                     );
                  } else if (argumentType === "returns") {
                     const argumentVarType = argument
                        .split("{")[1]
                        .split("}")[0];
                     const argumentDescription = argument.split("} ")[1];

                     this.graphNodeOutputs.push(
                        new GraphNodeOutput(
                           argumentVarType,
                           argumentDescription
                        )
                     );
                  }
               });
            }
         }
      }
   }
}

class GraphNodeInput {
   /**
    * @param {string} name
    * @param {string} type
    * @param {string} description
    */
   constructor(name, type, description = undefined) {
      this.name = name;
      this.type = type;
      this.description = description;
      /**
       * @private
       * @type {GraphNodeOutput[]}
       */
      this.connections = [];
   }

   /**
    * @public
    * @param {GraphNodeOutput} graphNodeOutput
    */
   addConnection(graphNodeOutput) {
      this.connections.push(graphNodeOutput);
   }

   /**
    * @public
    * @param {GraphNodeOutput} graphNodeOutput
    */
   removeConnection(graphNodeOutput) {
      const connectionIndex = this.connections.indexOf(graphNodeOutput);
      this.connections.splice(connectionIndex);
   }
}

class GraphNodeOutput {
   /**
    * @param {string} type
    * @param {string} description
    */
   constructor(type, description = undefined) {
      this.type = type;
      this.description = description;
   }
}

/**
 * @param {number} a description of a
 * @param {number} b description of b
 * @returns {number} description of the return
 */
function add(a, b) {
   const sum = a + b;
   return sum;
}

new GraphNode(add);

console.log("finished");
