/* exported NodeGraphUI */

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
    * @protected
    * @returns {string}
    */
   getName() {
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

class GraphNodeInputUI extends GraphNodeInput {
   /**
    * @param {string} name
    * @param {string} type
    * @param {string} description
    * @param {string} cssClass
    */
   constructor(
      name,
      type,
      description = undefined,
      cssClass = "graphNodeInput"
   ) {
      super(name, type, description);
      this.domElement = document.createElement("li");
      this.domElement.classList.add(cssClass);
   }

   /**
    * @public
    * @override
    * @param {GraphNodeOutputUI} graphNodeOutput
    */
   addConnection(graphNodeOutput) {
      super.addConnection(graphNodeOutput);
   }

   /**
    * @public
    * @override
    * @param {GraphNodeOutputUI} graphNodeOutput
    */
   removeConnection(graphNodeOutput) {
      super.removeConnection(graphNodeOutput);
   }
}

class GraphNodeOutputUI extends GraphNodeOutput {
   /**
    * @param {string} type
    * @param {string} description
    * @param {string} cssClass
    */
   constructor(type, description = undefined, cssClass = "graphNodeInput") {
      super(type, description);
      this.domElement = document.createElement("li");
      this.domElement.classList.add(cssClass);
   }
}

class NodeGraphUI extends NodeGraph {
   /**
    * @param {HTMLElement} parentElement
    */
   constructor(parentElement) {
      super();
      this.parentElement = parentElement;

      this.domCanvas = document.createElement("canvas");
      this.domCanvas.style.backgroundColor = "transparent";
      this.domCanvas.style.position = "absolute";
      this.domCanvas.style.width = "100%";
      this.domCanvas.style.height = "100%";

      this.domCanvasContext = this.domCanvas.getContext("2d");
      window.addEventListener("resize", this.resizeHandler.bind(this));
      this.parentElement.appendChild(this.domCanvas);

      this.currentMousePosition = { x: 0, y: 0 };

      this.parentElement.addEventListener(
         "mousemove",
         this.mousemoveHandler.bind(this)
      );
      this.parentElement.addEventListener(
         "dblclick",
         this.doubleClickHandler.bind(this)
      );
   }

   doubleClickHandler() {
      this.addNode(new GraphNodeUI(add));
   }

   /**
    * @private
    */
   resizeHandler() {
      this.domCanvas.width = this.domCanvas.offsetWidth;
      this.domCanvas.height = this.domCanvas.offsetHeight;
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   mousemoveHandler(mouseEvent) {
      this.currentMousePosition = {
         x: mouseEvent.pageX - this.parentElement.offsetLeft,
         y: mouseEvent.pageY - this.parentElement.offsetTop,
      };
   }

   /**
    * @override
    * @param {GraphNodeUI} graphNodeUI
    */
   addNode(graphNodeUI) {
      super.addNode(graphNodeUI);
      graphNodeUI.setPosition(this.currentMousePosition);
      this.parentElement.appendChild(graphNodeUI.domElement);
   }
}

class GraphNodeUI extends GraphNode {
   /**
    * @param {Function} executer
    * @param {string} cssClass
    */
   constructor(executer, cssClass = "graphNode") {
      super(executer);
      this.domElement = document.createElement("span");
      this.domElement.classList.add(cssClass);

      const domTitleElement = document.createElement("h1");
      domTitleElement.innerText = super.getName();
      domTitleElement.style.backgroundColor = "transparent";
      this.domElement.appendChild(domTitleElement);

      this.position = { x: 0, y: 0 };
   }

   /**
    * @param {{x:number, y:number}} position
    */
   setPosition(position) {
      this.position = position;
      this.domElement.style.transform =
         "translate(calc(" +
         this.position.x +
         "px - 50%), calc(" +
         this.position.y +
         "px - 0.25rem))";
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

new NodeGraphUI(document.getElementById("nodeGraphDiv"));

console.log("finished");
