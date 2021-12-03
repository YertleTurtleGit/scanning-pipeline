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
    * @param {string[]} dependencies
    * @returns {GraphNode}
    */
   registerNode(nodeExecuter, ...dependencies) {
      const graphNode = new GraphNode(nodeExecuter, ...dependencies);
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
    * @param {string[]} dependencies
    */
   constructor(executer, ...dependencies) {
      /**
       * @public
       * @type {Function}
       */
      this.executer = executer;

      /**
       * @private
       * @type {string[]}
       */
      this.dependencies = dependencies;

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
    * @public
    * @returns {Promise<string>}
    */
   async getDependenciesSource() {
      let dependenciesSource = "";
      for (let i = 0; i < this.dependencies.length; i++) {
         const dependencySource = await new Promise((resolve) => {
            window.fetch(this.dependencies[i]).then(async (response) => {
               resolve(await response.text());
            });
         });
         dependenciesSource += dependencySource;
      }
      return dependenciesSource;
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
      this.uiName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
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
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   clickHandler(mouseEvent) {
      if (mouseEvent.detail === 1) {
         // TODO Handle single click.
         // this.nodeGraph.toggleConnection(this);
      } else {
         this.doubleClickHandler();
      }
   }

   /**
    * @private
    */
   doubleClickHandler() {
      this.nodeGraph.placeInputGraphNode(
         new InputGraphNode(this.nodeGraph, this),
         { x: this.domElement.offsetLeft - 50, y: this.domElement.offsetTop }
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
   async setValue(value) {
      this.value = value;
      const connections = await this.graphNode.getConnections();
      console.log(connections);
      connections.forEach((connection) => {
         connection.input.graphNode.setRefreshFlag();
      });
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

      if (this.graphNode) {
         this.initialize();
      }
   }

   /**
    * @public
    */
   setRefreshFlag() {
      this.refreshFlag = true;
      console.log("Refresh flag of " + this.graphNode.getName() + " set.");
      this.execute();
   }

   /**
    * @public
    */
   async execute() {
      console.log("call " + this.graphNode.executer.name + ".");
      if (this.worker) {
         console.log("terminating " + this.graphNode.executer.name + ".");
         this.worker.terminate();
      }
      if (this.refreshFlag) {
         const parameterValues = this.getParameterValues();
         if (!parameterValues.includes(undefined)) {
            console.log("executing " + this.graphNode.executer.name + ".");

            this.worker = await this.createWorker();

            this.worker.addEventListener("message", (messageEvent) => {
               const resultValue = messageEvent.data;
               // TODO Handle multiple outputs.
               this.graphNodeOutputs[0].setValue(resultValue);
               this.refreshValuePreview(resultValue);
            });

            const encoder = new TextEncoder();

            const encodedParameterValues = [];
            parameterValues.forEach((value) => {
               encodedParameterValues.push(
                  encoder.encode(JSON.stringify(value.src)).buffer
               );
            });

            this.worker.postMessage(
               encodedParameterValues,
               encodedParameterValues
            );
         } else {
            console.warn("Worker not executed. Parameter is undefined.");
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
         value.style.maxWidth = "100%";
         value.style.maxHeight = "5rem";
         this.outputUIElement.style.display = "flex";
         this.outputUIElement.style.justifyContent = "center";
         this.outputUIElement.appendChild(value);
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
    * @returns {Promise<Worker>}
    */
   async createWorker() {
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
            "const decoder = new TextDecoder();\n" +
            "const " +
            input.name +
            " = JSON.parse(decoder.decode(messageEvent.data[" +
            String(index) +
            "]));\n console.log({" +
            input.name +
            "});";
      });

      functionString = functionString.replaceAll(
         functionParameterDeclarationRegExp,
         replaceValue
      );

      console.log(functionString);

      const dependenciesSource = await this.graphNode.getDependenciesSource();
      functionString = dependenciesSource + functionString;

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
    * @param {NodeGraph} nodeGraph
    * @param {GraphNodeInputUI} inputNode
    * @param {string} cssClass
    */
   constructor(nodeGraph, inputNode, cssClass = "graphNode") {
      super(undefined, nodeGraph, cssClass);

      this.type = inputNode.type;
      this.inputNode = inputNode;

      this.initialize();
      this.setConnectionToInputNode();
   }

   /**
    * @private
    */
   async setConnectionToInputNode() {
      this.inputNode.setConnection(this.graphNodeOutput);
      this.nodeGraph.updateConnectionUI();
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

      const domIOElement = document.createElement("div");
      const domInputList = document.createElement("ul");
      const domOutputList = document.createElement("ul");

      domIOElement.style.display = "flex";
      domIOElement.style.justifyContent = "space-between";
      domIOElement.style.marginLeft = "10%";
      domIOElement.style.width = "100%";

      this.domElement.appendChild(domIOElement);
      domIOElement.appendChild(domInputList);
      domIOElement.appendChild(domOutputList);

      const inputElement = document.createElement("input");
      inputElement.style.width = "80%";
      inputElement.style.overflowWrap = "break-word";
      inputElement.style.hyphens = "auto";
      inputElement.style.whiteSpace = "normal";

      if (this.type === "number") {
         inputElement.type = "number";
         domInputList.appendChild(inputElement);
      } else if (this.type === "HTMLImageElement") {
         inputElement.type = "file";
         inputElement.accept = "image/*";
      } else {
         console.error("Input type '" + this.type + "' not supported.");
      }

      inputElement.addEventListener(
         "input",
         this.inputChangeHandler.bind(this)
      );

      domInputList.appendChild(inputElement);

      this.graphNodeOutput = new GraphNodeOutputUI(
         this.type,
         "[" + this.type + "]",
         this.nodeGraph,
         this
      );

      domOutputList.appendChild(this.graphNodeOutput.domElement);
   }

   /**
    * @private
    * @param {InputEvent} inputEvent
    */
   inputChangeHandler(inputEvent) {
      let value;

      if (this.type === "number") {
         value = Number(
            /** @type {HTMLInputElement} */ (inputEvent.target).value
         );
         if (!value) {
            value = 0;
         }
         this.graphNodeOutput.setValue(value);
         this.refreshValuePreview(value);
      } else if (this.type === "HTMLImageElement") {
         value = new Image();
         const reader = new FileReader();
         const cThis = this;

         setTimeout(() => {
            reader.addEventListener("load", () => {
               value.addEventListener("load", () => {
                  cThis.graphNodeOutput.setValue(value);
                  cThis.refreshValuePreview(value);
               });
               value.addEventListener("error", () => {
                  console.error("Error loading image.");
               });
               value.src = reader.result;
            });
            reader.readAsDataURL(
               /** @type {HTMLInputElement} */ (inputEvent.target).files[0]
            );
         });
      }
   }

   /**
    * @override
    * @public
    * @returns {Promise<{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]>}
    */
   async getConnections() {
      return [{ input: this.inputNode, output: this.graphNodeOutput }];
   }

   /**
    * @override
    * @public
    */
   async execute() {
      this.refreshFlag = false;
   }
}
