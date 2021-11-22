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

      /**
       * @protected
       * @type {GraphNodeInput[]}
       */
      this.graphNodeInputs = [];

      /**
       * @protected
       * @type {GraphNodeOutput[]}
       */
      this.graphNodeOutputs = [];

      /**
       * @protected
       * @type {{output: GraphNodeOutput, input: GraphNodeInput}[]}
       */
      this.outputConnections = [];

      /**
       * @private
       * @type {boolean}
       */
      this.initialized = false;

      /**
       * @private
       * @type {boolean}
       */
      this.initializing = false;
   }

   /**
    * @private
    */
   async initialize() {
      while (this.initializing === true) {
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }
      if (this.initialized === false) {
         this.initializing = true;
         await this.readFunctionSourceWithDocs();
         this.initialized = true;
         this.initializing = false;
      }
   }

   /**
    * @protected
    * @returns {Promise<GraphNodeInput[]>}
    */
   async getGraphNodeInputs() {
      await this.initialize();
      return this.graphNodeInputs;
   }

   /**
    * @protected
    * @returns {Promise<GraphNodeOutput[]>}
    */
   async getGraphNodeOutputs() {
      await this.initialize();
      return this.graphNodeOutputs;
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
    * @param {GraphNodeInput[]} graphNodeInputs
    * @returns {GraphNodeInputUI[]}
    */
   static getFromGraphNodeInputs(graphNodeInputs) {
      /** @type {GraphNodeInputUI[]} */
      const graphNodeInputsUI = [];

      graphNodeInputs.forEach((graphNodeInput) => {
         graphNodeInputsUI.push(
            new GraphNodeInputUI(
               graphNodeInput.name,
               graphNodeInput.type,
               graphNodeInput.description
            )
         );
      });

      return graphNodeInputsUI;
   }

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
      this.domElement.innerText = name + " [" + type + "]";
      this.domElement.style.textAlign = "left";
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
    * @param {GraphNodeOutput[]} graphNodeOutputs
    * @returns {GraphNodeOutputUI[]}
    */
   static getFromGraphNodeOutputs(graphNodeOutputs) {
      /** @type {GraphNodeOutputUI[]} */
      const graphNodeOutputsUI = [];

      graphNodeOutputs.forEach((graphNodeOutput) => {
         graphNodeOutputsUI.push(
            new GraphNodeOutputUI(
               graphNodeOutput.type,
               graphNodeOutput.description
            )
         );
      });
      return graphNodeOutputsUI;
   }

   /**
    * @param {string} type
    * @param {string} description
    * @param {string} cssClass
    */
   constructor(type, description = undefined, cssClass = "graphNodeInput") {
      super(type, description);
      this.domElement = document.createElement("li");
      this.domElement.innerText = "[" + type + "]";
      this.domElement.style.textAlign = "right";
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
         "mouseup",
         this.releaseGrabbedNode.bind(this)
      );
      this.parentElement.addEventListener(
         "dblclick",
         this.doubleClickHandler.bind(this)
      );

      /**
       * @private
       * @type {GraphNodeUI}
       */
      this.grabbedNode = undefined;
   }

   doubleClickHandler() {
      this.addNode(new GraphNodeUI(add, this));
   }

   /**
    * @private
    */
   resizeHandler() {
      this.domCanvas.width = this.domCanvas.offsetWidth;
      this.domCanvas.height = this.domCanvas.offsetHeight;
   }

   releaseGrabbedNode() {
      this.grabbedNode = undefined;
   }

   /**
    * @param {GraphNodeUI} graphNode
    */
   setGrabbedNode(graphNode) {
      this.grabbedNode = graphNode;
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

      if (this.grabbedNode) {
         this.grabbedNode.setPosition(this.currentMousePosition);
      }
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
    * @param {NodeGraphUI} nodeGraph
    * @param {string} cssClass
    */
   constructor(executer, nodeGraph, cssClass = "graphNode") {
      super(executer);
      this.nodeGraph = nodeGraph;
      this.cssClass = cssClass;
      this.domElement = document.createElement("span");
      this.position = { x: 0, y: 0 };
      this.initializeUI();
   }

   /**
    * @private
    */
   async initializeUI() {
      /**
       * @override
       * @protected
       * @type {GraphNodeInputUI[]}
       */
      this.graphNodeInputs = GraphNodeInputUI.getFromGraphNodeInputs(
         await super.getGraphNodeInputs()
      );

      /**
       * @override
       * @protected
       * @type {GraphNodeOutputUI[]}
       */
      this.graphNodeOutputs = GraphNodeOutputUI.getFromGraphNodeOutputs(
         await super.getGraphNodeOutputs()
      );

      this.domElement.classList.add(this.cssClass);

      const domTitleElement = document.createElement("h1");
      domTitleElement.style.cursor = "grab";
      domTitleElement.addEventListener(
         "mousedown",
         this.mousedownGrabHandler.bind(this)
      );
      domTitleElement.innerText = super.getName();
      domTitleElement.style.backgroundColor = "transparent";
      this.domElement.appendChild(domTitleElement);

      const domIOElement = document.createElement("div");
      const domInputList = document.createElement("ul");
      const domOutputList = document.createElement("ul");

      domIOElement.style.display = "flex";
      domIOElement.style.justifyContent = "space-between";
      domIOElement.style.marginLeft = "-10%";
      domIOElement.style.width = "120%";

      this.domElement.appendChild(domIOElement);
      domIOElement.appendChild(domInputList);
      domIOElement.appendChild(domOutputList);

      this.graphNodeInputs.forEach((graphNodeInput) => {
         domInputList.appendChild(graphNodeInput.domElement);
      });
      this.graphNodeOutputs.forEach((graphNodeOutput) => {
         domOutputList.appendChild(graphNodeOutput.domElement);
      });
   }

   /**
    * @private
    */
   mousedownGrabHandler() {
      this.nodeGraph.setGrabbedNode(this);
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
 * @param {number} aVeeeryLooongVariableName description of a
 * @param {number} b description of b
 * @returns {number} description of the return
 */
function add(aVeeeryLooongVariableName, b) {
   const sum = a + b;
   return sum;
}

new NodeGraphUI(document.getElementById("nodeGraphDiv"));

console.log("finished");
