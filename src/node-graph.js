class NodeGraph {
   /**
    * @param {HTMLElement} parentElement
    */
   constructor(parentElement) {
      /**
       * @protected
       * @type {GraphNode[]}
       */
      this.registeredNodes = [];

      /**
       * @protected
       * @type {GraphNodeUI[]}
       */
      this.placedNodes = [];

      this.parentElement = parentElement;

      this.domCanvas = document.createElement("canvas");
      this.domCanvas.style.backgroundColor = "transparent";
      this.domCanvas.style.position = "absolute";
      this.domCanvas.style.width = "100%";
      this.domCanvas.style.height = "100%";

      window.addEventListener("resize", this.resizeHandler.bind(this));
      this.parentElement.appendChild(this.domCanvas);
      this.domCanvasContext = this.domCanvas.getContext("2d");

      this.currentMousePosition = {
         x: this.parentElement.clientWidth / 2,
         y: this.parentElement.clientHeight / 2,
      };

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
      this.grabbedNode = null;

      /**
       * @private
       * @type {GraphNodeInputUI | GraphNodeOutputUI}
       */
      this.linkedNodeIO = null;

      this.resizeHandler();
   }

   /**
    * @public
    * @param {Function} nodeExecuter
    * @returns {GraphNode}
    */
   registerNode(nodeExecuter) {
      const graphNode = new GraphNode(nodeExecuter);
      this.registeredNodes.push(graphNode);
      return graphNode;
   }

   /**
    * @param {GraphNode} graphNode
    * @param {{x:number, y:number}} position
    */
   placeNode(graphNode, position = this.currentMousePosition) {
      const graphNodeUI = new GraphNodeUI(graphNode, this);
      this.placedNodes.push(graphNodeUI);
      graphNodeUI.setPosition(position);
      this.parentElement.appendChild(graphNodeUI.domElement);
   }

   /**
    * @param {GraphNodeUI} graphNodeUI
    */
   displaceNode(graphNodeUI) {
      const graphNodeIndex = this.placedNodes.indexOf(graphNodeUI);
      this.placedNodes.splice(graphNodeIndex);
   }

   doubleClickHandler() {
      // TODO Add node selection menu.
      this.placeNode(this.registeredNodes[0]);
   }

   /**
    * @private
    */
   resizeHandler() {
      this.domCanvas.height = this.parentElement.clientHeight;
      this.domCanvas.width = this.parentElement.clientWidth;
   }

   /**
    * @public
    * @param {GraphNodeInputUI | GraphNodeOutputUI} graphNodeIO
    */
   toggleConnection(graphNodeIO) {
      if (this.linkedNodeIO === null) {
         this.linkedNodeIO = graphNodeIO;
      } else if (
         graphNodeIO instanceof GraphNodeInputUI &&
         this.linkedNodeIO instanceof GraphNodeOutputUI
      ) {
         graphNodeIO.addConnection(this.linkedNodeIO);
         this.linkedNodeIO = null;
      } else if (
         graphNodeIO instanceof GraphNodeOutputUI &&
         this.linkedNodeIO instanceof GraphNodeInputUI
      ) {
         this.linkedNodeIO.addConnection(graphNodeIO);
         this.linkedNodeIO = null;
      }
      this.updateConnectionUI();
   }

   /**
    * @private
    * @returns {Promise<{input: GraphNodeInputUI, output: GraphNodeOutputUI}[]>}
    */
   async getConnections() {
      /** @type {{input: GraphNodeInputUI, output: GraphNodeOutputUI}[]} */
      const connections = [];
      this.placedNodes.forEach(async (node) => {
         connections.push(...(await node.getConnections()));
      });
      return connections;
   }

   /**
    * @private
    */
   async updateConnectionUI() {
      this.domCanvasContext.clearRect(
         0,
         0,
         this.domCanvasContext.canvas.width,
         this.domCanvasContext.canvas.height
      );
      this.domCanvasContext.beginPath();
      this.domCanvasContext.strokeStyle = "white";
      this.domCanvasContext.lineWidth = 2;

      const connections = await this.getConnections();
      connections.forEach((connection) => {
         const startRect = connection.input.domElement.getBoundingClientRect();
         const start = {
            x: startRect.left,
            y: (startRect.top + startRect.bottom) / 2,
         };
         const endRect = connection.output.domElement.getBoundingClientRect();
         const end = {
            x: endRect.right,
            y: (endRect.top + endRect.bottom) / 2,
         };
         this.domCanvasContext.moveTo(start.x, start.y);
         this.domCanvasContext.lineTo(end.x, end.y);
      });

      this.domCanvasContext.stroke();
   }

   releaseGrabbedNode() {
      this.grabbedNode = null;
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
         this.updateConnectionUI();
      }

      if (this.linkedNodeIO) {
         this.domCanvasContext.clearRect(
            0,
            0,
            this.domCanvasContext.canvas.width,
            this.domCanvasContext.canvas.height
         );
         this.domCanvasContext.beginPath();
         this.domCanvasContext.strokeStyle = "white";
         this.domCanvasContext.lineWidth = 2;

         const startRect = this.linkedNodeIO.domElement.getBoundingClientRect();
         const start = {
            x: startRect.right,
            y: (startRect.top + startRect.bottom) / 2,
         };
         const end = this.currentMousePosition;
         this.domCanvasContext.moveTo(start.x, start.y);
         this.domCanvasContext.lineTo(end.x, end.y);

         this.domCanvasContext.stroke();
      }
   }
}

class GraphNode {
   /**
    * @param {Function} executer
    */
   constructor(executer) {
      /** @public */
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
    * @public
    * @returns {Promise<GraphNodeInput[]>}
    */
   async getInputs() {
      await this.initialize();
      return this.graphNodeInputs;
   }

   /**
    * @public
    * @returns {Promise<GraphNodeOutput[]>}
    */
   async getOutputs() {
      await this.initialize();
      return this.graphNodeOutputs;
   }

   /**
    * @public
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
   }
}

class GraphNodeOutput {
   /**
    * @param {GraphNodeOutput[]} graphNodeOutput
    * @param {NodeGraph} nodeGraph
    * @returns {GraphNodeOutputUI[]}
    */
   static getFromGraphNodeInputs(graphNodeOutput, nodeGraph) {
      /** @type {GraphNodeOutputUI[]} */
      const graphNodeOutputUI = [];

      graphNodeOutput.forEach((graphNodeOutput) => {
         graphNodeOutputUI.push(
            new GraphNodeOutputUI(
               graphNodeOutput.type,
               graphNodeOutput.description,
               nodeGraph
            )
         );
      });

      return graphNodeOutputUI;
   }

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
    * @param {NodeGraph} nodeGraph
    * @returns {GraphNodeInputUI[]}
    */
   static getFromGraphNodeInputs(graphNodeInputs, nodeGraph) {
      /** @type {GraphNodeInputUI[]} */
      const graphNodeInputsUI = [];

      graphNodeInputs.forEach((graphNodeInput) => {
         graphNodeInputsUI.push(
            new GraphNodeInputUI(
               graphNodeInput.name,
               graphNodeInput.type,
               graphNodeInput.description,
               nodeGraph
            )
         );
      });

      return graphNodeInputsUI;
   }

   /**
    * @param {string} name
    * @param {string} type
    * @param {string} description
    * @param {NodeGraph} nodeGraph
    * @param {string} cssClass
    */
   constructor(
      name,
      type,
      description = undefined,
      nodeGraph,
      cssClass = "graphNodeInput"
   ) {
      super(name, type, description);
      /**
       * @private
       * @type {GraphNodeOutputUI[]}
       */
      this.connections = [];

      this.nodeGraph = nodeGraph;
      this.domElement = document.createElement("li");
      this.domElement.innerText = name + " [" + type + "]";
      this.domElement.style.textAlign = "left";
      this.domElement.classList.add(cssClass);

      this.domElement.addEventListener("click", this.clickHandler.bind(this));
   }

   /**
    * @private
    */
   clickHandler() {
      this.nodeGraph.toggleConnection(this);
   }

   /**
    * @public
    * @returns {GraphNodeOutputUI[]}
    */
   getConnections() {
      return this.connections;
   }

   /**
    * @public
    * @param {GraphNodeOutputUI} graphNodeOutput
    */
   addConnection(graphNodeOutput) {
      this.connections.push(graphNodeOutput);
   }

   /**
    * @public
    * @param {GraphNodeOutputUI} graphNodeOutput
    */
   removeConnection(graphNodeOutput) {
      const connectionIndex = this.connections.indexOf(graphNodeOutput);
      this.connections.splice(connectionIndex);
   }
}

class GraphNodeOutputUI extends GraphNodeOutput {
   /**
    * @param {GraphNodeOutput[]} graphNodeOutputs
    * @param {NodeGraph} nodeGraph
    * @returns {GraphNodeOutputUI[]}
    */
   static getFromGraphNodeOutputs(graphNodeOutputs, nodeGraph) {
      /** @type {GraphNodeOutputUI[]} */
      const graphNodeOutputsUI = [];

      graphNodeOutputs.forEach((graphNodeOutput) => {
         graphNodeOutputsUI.push(
            new GraphNodeOutputUI(
               graphNodeOutput.type,
               graphNodeOutput.description,
               nodeGraph
            )
         );
      });

      return graphNodeOutputsUI;
   }

   /**
    * @param {string} type
    * @param {string} description
    * @param {NodeGraph} nodeGraph
    * @param {string} cssClass
    */
   constructor(
      type,
      description = undefined,
      nodeGraph,
      cssClass = "graphNodeInput"
   ) {
      super(type, description);
      this.nodeGraph = nodeGraph;
      this.domElement = document.createElement("li");
      this.domElement.innerText = "[" + type + "]";
      this.domElement.style.textAlign = "right";
      this.domElement.classList.add(cssClass);

      this.domElement.addEventListener("click", this.clickHandler.bind(this));
   }

   /**
    * @private
    */
   clickHandler() {
      this.nodeGraph.toggleConnection(this);
   }
}

class GraphNodeUI {
   /**
    * @public
    * @param {GraphNode[]} graphNodes
    * @param {NodeGraph} nodeGraph
    * @returns {GraphNodeUI[]}
    */
   static getFromGraphNodes(graphNodes, nodeGraph) {
      /** @type {GraphNodeUI[]} */
      const graphNodesUI = [];

      graphNodes.forEach((graphNode) => {
         graphNodesUI.push(new GraphNodeUI(graphNode, nodeGraph));
      });

      return graphNodesUI;
   }

   /**
    * @param {GraphNode} graphNode
    * @param {NodeGraph} nodeGraph
    * @param {string} cssClass
    */
   constructor(graphNode, nodeGraph, cssClass = "graphNode") {
      this.graphNode = graphNode;
      this.nodeGraph = nodeGraph;
      this.cssClass = cssClass;
      this.domElement = document.createElement("span");
      this.position = { x: 0, y: 0 };
      this.initialize();
   }

   /**
    * @private
    */
   async initialize() {
      /**
       * @override
       * @protected
       * @type {GraphNodeInputUI[]}
       */
      this.graphNodeInputs = GraphNodeInputUI.getFromGraphNodeInputs(
         await this.graphNode.getInputs(),
         this.nodeGraph
      );

      /**
       * @override
       * @protected
       * @type {GraphNodeOutputUI[]}
       */
      this.graphNodeOutputs = GraphNodeOutputUI.getFromGraphNodeOutputs(
         await this.graphNode.getOutputs(),
         this.nodeGraph
      );

      this.domElement.classList.add(this.cssClass);

      const domTitleElement = document.createElement("h1");
      domTitleElement.style.cursor = "grab";
      domTitleElement.addEventListener(
         "mousedown",
         this.mousedownGrabHandler.bind(this)
      );
      domTitleElement.innerText = this.graphNode.getName();
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
    * @public
    * @returns {Promise<{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]>}
    */
   async getConnections() {
      /** @type {{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]} */
      const connections = [];

      this.graphNodeInputs.forEach((graphNodeInput) => {
         graphNodeInput.getConnections().forEach((graphNodeOutput) => {
            connections.push({
               input: graphNodeInput,
               output: graphNodeOutput,
            });
         });
      });

      return connections;
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
 * @param {number} a description of a
 * @param {number} b description of b
 * @returns {number} description of the return
 */
function add(a, b) {
   const sum = a + b;
   return sum;
}

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const addNode = nodeGraph.registerNode(add);
nodeGraph.placeNode(addNode);

console.log("finished");
