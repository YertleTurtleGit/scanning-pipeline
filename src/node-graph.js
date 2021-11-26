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
      /*this.parentElement.addEventListener(
         "dblclick",
         this.doubleClickHandler.bind(this)
      );*/

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
    * @public
    * @param {InputGraphNode} inputGraphNode
    * @param {{x:number, y:number}} position
    */
   placeInputGraphNode(inputGraphNode, position) {
      this.placedNodes.push(inputGraphNode);
      inputGraphNode.setPosition(position);
      this.parentElement.appendChild(inputGraphNode.domElement);
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
         graphNodeIO.setConnection(this.linkedNodeIO);
         this.linkedNodeIO = null;
      } else if (
         graphNodeIO instanceof GraphNodeOutputUI &&
         this.linkedNodeIO instanceof GraphNodeInputUI
      ) {
         this.linkedNodeIO.setConnection(graphNodeIO);
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
    * @public
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
            const jsDoc = new RegExp(
               "(\\/\\*\\*\\s*\\n([^\\*]|(\\*(?!\\/)))*\\*\\/)(\\s*\\n*\\s*)(.*)" +
                  this.getName() +
                  "\\s*\\(",
               "mg"
            )
               .exec(scriptSource)[0]
               .replaceAll("\n", "")
               .replaceAll("*", "");

            const jsDocArguments = jsDoc.split("@");
            jsDocArguments.shift();

            jsDocArguments.forEach((argument) => {
               const argumentType = argument.split(" ")[0];

               if (argumentType === "param") {
                  const argumentVarType = argument.split("{")[1].split("}")[0];
                  const argumentVarName = argument.split("} ")[1].split(" ")[0];
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
                  const argumentVarType = argument.split("{")[1].split("}")[0];
                  const argumentDescription = argument.split("} ")[1];

                  this.graphNodeOutputs.push(
                     new GraphNodeOutput(argumentVarType, argumentDescription)
                  );
               }
            });
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
      this.name = name.replace(/([A-Z])/g, " $1");
      this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1);
      this.type = type;
      this.description = description.replaceAll(/\s\s+/g, " ");
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
    * @param {NodeGraph} nodeGraph
    * @param {GraphNodeUI} graphNode
    * @returns {GraphNodeInputUI[]}
    */
   static getFromGraphNodeInputs(graphNodeInputs, nodeGraph, graphNode) {
      /** @type {GraphNodeInputUI[]} */
      const graphNodeInputsUI = [];

      graphNodeInputs.forEach((graphNodeInput) => {
         graphNodeInputsUI.push(
            new GraphNodeInputUI(
               graphNodeInput.name,
               graphNodeInput.type,
               graphNodeInput.description,
               nodeGraph,
               graphNode
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
    * @param {GraphNodeUI} graphNode
    * @param {string} cssClass
    */
   constructor(
      name,
      type,
      description = undefined,
      nodeGraph,
      graphNode,
      cssClass = "graphNodeInput"
   ) {
      super(name, type, description);
      /**
       * @private
       * @type {GraphNodeOutputUI}
       */
      this.connection = null;

      this.nodeGraph = nodeGraph;
      this.graphNode = graphNode;
      this.domElement = document.createElement("li");
      this.domElement.innerText = name;
      this.domElement.title = "[" + this.type + "]\n" + this.description;
      this.domElement.style.textAlign = "left";
      this.domElement.classList.add(cssClass);

      this.domElement.addEventListener("click", this.clickHandler.bind(this));
      this.domElement.addEventListener(
         "dblclick",
         this.doubleClickHandler.bind(this)
      );
   }

   /**
    * @private
    */
   clickHandler() {
      this.nodeGraph.toggleConnection(this);
   }

   /**
    * @private
    */
   doubleClickHandler() {
      this.nodeGraph.placeInputGraphNode(
         new InputGraphNode(this.type, this.nodeGraph),
         { x: this.domElement.clientLeft - 200, y: this.domElement.clientTop }
      );
   }

   /**
    * @public
    * @returns {GraphNodeOutputUI}
    */
   getConnection() {
      return this.connection;
   }

   /**
    * @public
    * @param {GraphNodeOutputUI} graphNodeOutput
    */
   setConnection(graphNodeOutput) {
      this.connection = graphNodeOutput;
      this.graphNode.setRefreshFlag();
   }

   /**
    * @public
    */
   removeConnection() {
      this.connection = null;
   }
}

class GraphNodeOutputUI extends GraphNodeOutput {
   /**
    * @param {GraphNodeOutput[]} graphNodeOutputs
    * @param {NodeGraph} nodeGraph
    * @param {GraphNodeUI} graphNode
    * @returns {GraphNodeOutputUI[]}
    */
   static getFromGraphNodeOutputs(graphNodeOutputs, nodeGraph, graphNode) {
      /** @type {GraphNodeOutputUI[]} */
      const graphNodeOutputsUI = [];

      graphNodeOutputs.forEach((graphNodeOutput) => {
         graphNodeOutputsUI.push(
            new GraphNodeOutputUI(
               graphNodeOutput.type,
               graphNodeOutput.description,
               nodeGraph,
               graphNode
            )
         );
      });

      return graphNodeOutputsUI;
   }

   /**
    * @param {string} type
    * @param {string} description
    * @param {NodeGraph} nodeGraph
    * @param {GraphNodeUI} graphNode
    * @param {string} cssClass
    */
   constructor(
      type,
      description = undefined,
      nodeGraph,
      graphNode,
      cssClass = "graphNodeInput"
   ) {
      super(type, description);
      /**
       * @private
       * @type {any}
       */
      this.value = undefined;
      this.nodeGraph = nodeGraph;
      /**
       * @private
       * @type {GraphNodeUI}
       */
      this.graphNode = graphNode;
      this.domElement = document.createElement("li");
      this.domElement.innerText = "▶";
      this.domElement.title = "[" + this.type + "]";
      this.domElement.style.textAlign = "right";
      this.domElement.classList.add(cssClass);

      this.domElement.addEventListener("click", this.clickHandler.bind(this));
   }

   /**
    * @public
    * @returns {any}
    */
   getValue() {
      return this.value;
   }

   /**
    * @public
    * @param {any} value
    */
   setValue(value) {
      this.value = value;
      // TODO Notify all connected inputs.
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
    * @param {GraphNode} graphNode
    * @param {NodeGraph} nodeGraph
    * @param {string} cssClass
    */
   constructor(graphNode, nodeGraph, cssClass = "graphNode") {
      this.graphNode = graphNode;
      this.nodeGraph = nodeGraph;
      this.cssClass = cssClass;
      this.domElement = document.createElement("span");
      this.position = {
         x: this.nodeGraph.parentElement.clientWidth / 2,
         y: this.nodeGraph.parentElement.clientHeight / 2,
      };
      this.refreshFlag = true;
      this.worker = undefined;
      this.initialize();
   }

   /**
    * @public
    */
   setRefreshFlag() {
      this.refreshFlag = true;
      this.execute();
   }

   /**
    * @public
    */
   async execute() {
      if (this.worker) {
         this.worker.terminate();
      }
      if (this.refreshFlag) {
         const parameterValues = this.getParameterValues();
         if (!parameterValues.includes(undefined)) {
            console.log("executing " + this.graphNode.executer.name + ".");

            this.worker = this.createWorker();

            this.worker.addEventListener("message", (messageEvent) => {
               const resultValue = messageEvent.data;
               // TODO Handle multiple outputs.
               this.graphNodeOutputs[0].setValue(resultValue);
               this.refreshValuePreview(resultValue);
            });

            this.worker.postMessage(parameterValues);
         }
         this.refreshFlag = false;
      }
   }

   /**
    * @protected
    * @param {any} value
    */
   refreshValuePreview(value) {
      this.outputUIElement.innerHTML = "";
      if (typeof value === "number") {
         const numberElement = document.createElement("div");
         numberElement.innerText = String(value);
         numberElement.style.textAlign = "center";
         this.outputUIElement.appendChild(numberElement);
      } else if (value instanceof HTMLImageElement) {
         const imageElement = document.createElement("img");
         imageElement.src = value.src;
         this.outputUIElement.appendChild(imageElement);
      }
      this.nodeGraph.updateConnectionUI();
   }

   /**
    * @private
    * @returns {any[]}
    */
   getParameterValues() {
      const parameterValues = [];
      this.graphNodeInputs.forEach((input) => {
         const connection = input.getConnection();
         if (connection) {
            parameterValues.push(connection.getValue());
         } else {
            parameterValues.push(undefined);
         }
      });
      return parameterValues;
   }

   /**
    * @private
    * @returns {Worker}
    */
   createWorker() {
      let functionString = this.graphNode.executer.toString();

      functionString = functionString.replaceAll(
         "return ",
         "self.postMessage("
      );

      functionString = functionString.replaceAll(
         /(self\.postMessage\(.*?);/gm,
         "$1);"
      );

      functionString =
         "'use strict';\nself.addEventListener('message', " +
         functionString +
         ");";

      const functionParameterRegExp = new RegExp(
         "(" + this.graphNode.getName() + "\\s*\\()(.*?)(\\)\\s*{)",
         "gm"
      );

      functionString = functionString.replaceAll(
         functionParameterRegExp,
         "$1messageEvent$3"
      );

      const functionParameterDeclarationRegExp = new RegExp(
         this.graphNode.getName() + "\\s*\\(messageEvent\\)\\s*{(.*?|\\n)\\s",
         "gm"
      );

      let replaceValue = "$&";

      this.graphNodeInputs.forEach((input, index) => {
         replaceValue +=
            "const " +
            input.name +
            " = messageEvent.data[" +
            String(index) +
            "];\n";
      });

      functionString = functionString.replaceAll(
         functionParameterDeclarationRegExp,
         replaceValue
      );

      const blob = new Blob([functionString], {
         type: "text/javascript",
      });
      const workerSrc = window.URL.createObjectURL(blob);
      return new Worker(workerSrc);
   }

   /**
    * @protected
    */
   async initialize() {
      if (!this.graphNode) {
         return;
      }
      /**
       * @override
       * @protected
       * @type {GraphNodeInputUI[]}
       */
      this.graphNodeInputs = GraphNodeInputUI.getFromGraphNodeInputs(
         await this.graphNode.getInputs(),
         this.nodeGraph,
         this
      );

      /**
       * @override
       * @protected
       * @type {GraphNodeOutputUI[]}
       */
      this.graphNodeOutputs = GraphNodeOutputUI.getFromGraphNodeOutputs(
         await this.graphNode.getOutputs(),
         this.nodeGraph,
         this
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

      this.outputUIElement = document.createElement("div");
      this.domElement.appendChild(this.outputUIElement);

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

      this.execute();
   }

   /**
    * @public
    * @returns {Promise<{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]>}
    */
   async getConnections() {
      /** @type {{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]} */
      const connections = [];

      this.graphNodeInputs.forEach((graphNodeInput) => {
         const output = graphNodeInput.getConnection();
         if (output) {
            connections.push({
               input: graphNodeInput,
               output: output,
            });
         }
      });

      return connections;
   }

   /**
    * @protected
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

class InputGraphNode extends GraphNodeUI {
   /**
    * @param {string} type
    * @param {NodeGraph} nodeGraph
    * @param {GraphNodeInputUI} inputNode
    * @param {string} cssClass
    */
   constructor(type, nodeGraph, inputNode, cssClass = "graphNode") {
      super(undefined, nodeGraph, cssClass);
      this.type = type;
      this.inputNode = inputNode;
      inputNode.setConnection(this.graphNodeOutputs[0]);
   }

   /**
    * @override
    * @protected
    */
   async initialize() {
      this.domElement.classList.add(this.cssClass);

      const domTitleElement = document.createElement("h1");
      domTitleElement.style.cursor = "grab";
      domTitleElement.addEventListener(
         "mousedown",
         this.mousedownGrabHandler.bind(this)
      );
      domTitleElement.innerText = this.type;
      domTitleElement.style.backgroundColor = "transparent";
      this.domElement.appendChild(domTitleElement);

      this.outputUIElement = document.createElement("div");
      this.domElement.appendChild(this.outputUIElement);

      if (this.type === "number") {
         const inputElement = document.createElement("input");
         inputElement.type = "number";
         this.domElement.appendChild(inputElement);
      }
   }

   /**
    * @override
    * @public
    * @returns {Promise<{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]>}
    */
   async getConnections() {
      return [];
   }

   /**
    * @override
    * @public
    */
   async execute() {
      if (this.worker) {
         this.worker.terminate();
      }
      if (this.refreshFlag) {
         this.refreshValuePreview(resultValue);
      }
      this.refreshFlag = false;
   }
}
