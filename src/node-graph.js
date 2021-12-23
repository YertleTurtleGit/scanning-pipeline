/* exported NodeCallback */

class NodeCallback {
   /**
    * @param {GraphNodeUI} graphNodeUI
    */
   constructor(graphNodeUI) {
      this.graphNodeUI = graphNodeUI;
      /**
       * @public
       * @type {boolean}
       */
      this.abortFlag = false;
   }

   /**
    * @public
    * @param {string} info
    */
   setInfo(info) {}

   /**
    * @public
    * @param {number} progressPercent
    */
   setProgressPercent(progressPercent) {
      if (progressPercent <= 0 || progressPercent === 100) {
         this.graphNodeUI.domProgressElement.hidden = true;
      } else {
         this.graphNodeUI.domProgressElement.hidden = false;
         this.graphNodeUI.domProgressElement.value = progressPercent;
      }
   }
}

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
         this.mouseUpHandler.bind(this)
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
      const graphNode = new GraphNode(nodeExecuter, false);
      this.registeredNodes.push(graphNode);
      return graphNode;
   }

   /**
    * @public
    * @param {Function} nodeExecuter
    * @param {string[]} dependencies
    * @returns {GraphNode}
    */
   registerNodeAsWorker(nodeExecuter, ...dependencies) {
      const graphNode = new GraphNode(nodeExecuter, true, ...dependencies);
      this.registeredNodes.push(graphNode);
      return graphNode;
   }

   /**
    * @param {GraphNode} graphNode
    * @param {{x:number, y:number}} position
    * @returns {GraphNodeUI}
    */
   placeNode(graphNode, position = this.currentMousePosition) {
      const graphNodeUI = new GraphNodeUI(graphNode, this);
      this.placedNodes.push(graphNodeUI);
      graphNodeUI.setPosition(position);
      this.parentElement.appendChild(graphNodeUI.domElement);
      return graphNodeUI;
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
      this.updateConnectionUI();
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

   mouseUpHandler() {
      this.grabbedNode = null;
      this.linkedNodeIO = null;
      this.updateConnectionUI();
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
    * @param {boolean} asWorker
    * @param {string[]} dependencies
    */
   constructor(executer, asWorker, ...dependencies) {
      /**
       * @public
       * @type {Function}
       */
      this.executer = executer;

      this.asWorker = asWorker;

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
                  const argumentVarType = argument
                     .split("{")[1]
                     .split("}")[0]
                     .replace("Promise<", "")
                     .replace(">", "");
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
                  const argumentVarType = argument
                     .split("{")[1]
                     .split("}")[0]
                     .replace("Promise<", "")
                     .replace(">", "");
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
      //this.name = name.replace(/([A-Z])/g, " $1");
      this.name = name;
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
    * @param {GraphNodeUI} graphNodeUI
    * @param {string} cssClass
    */
   constructor(
      name,
      type,
      description = undefined,
      nodeGraph,
      graphNodeUI,
      cssClass = "graphNodeInput"
   ) {
      super(name, type, description);
      /**
       * @private
       * @type {GraphNodeOutputUI}
       */
      this.connection = null;

      this.nodeGraph = nodeGraph;
      this.graphNodeUI = graphNodeUI;
      this.domElement = document.createElement("li");
      this.domElement.innerText = name;
      this.domElement.title = "[" + this.type + "]\n" + this.description;
      this.domElement.style.textAlign = "left";
      this.domElement.classList.add(cssClass);

      this.domElement.addEventListener("click", this.clickHandler.bind(this));
      this.domElement.addEventListener(
         "mousedown",
         this.mouseHandler.bind(this)
      );
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   clickHandler(mouseEvent) {
      if (mouseEvent.detail > 1) {
         this.doubleClickHandler();
      }
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   mouseHandler(mouseEvent) {
      mouseEvent.stopPropagation();
      mouseEvent.preventDefault();
      this.nodeGraph.toggleConnection(this);
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
      if (this.connection) {
         this.connection.removeConnection(this);
      }
      graphNodeOutput.addConnection(this);
      this.connection = graphNodeOutput;
      this.graphNodeUI.setRefreshFlag();
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
       * @public
       * @type {GraphNodeUI}
       */
      this.graphNodeUI = graphNode;
      /**
       * @private
       * @type {GraphNodeInputUI[]}
       */
      this.connections = [];
      this.domElement = document.createElement("li");
      this.domElement.innerText = "▶";
      this.domElement.title = "[" + this.type + "]";
      this.domElement.style.textAlign = "right";
      this.domElement.classList.add(cssClass);

      this.domElement.addEventListener(
         "mousedown",
         this.mouseHandler.bind(this)
      );
   }

   /**
    * @public
    * @param {GraphNodeInputUI} graphNodeInputUI
    */
   addConnection(graphNodeInputUI) {
      this.connections.push(graphNodeInputUI);
   }

   /**
    * @public
    * @param {GraphNodeInputUI} graphNodeInputUI
    */
   removeConnection(graphNodeInputUI) {
      const id = this.connections.indexOf(graphNodeInputUI);
      this.connections.splice(id);
   }

   /**
    * @public
    * @returns {GraphNodeInputUI[]}
    */
   getConnections() {
      return this.connections;
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

      const outputNodes = this.graphNodeUI.getOutputNodes();

      outputNodes.forEach((outputNode) => {
         if (outputNode !== this.graphNodeUI) {
            outputNode.setRefreshFlag();
         }
      });
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   mouseHandler(mouseEvent) {
      mouseEvent.stopPropagation();
      mouseEvent.preventDefault();
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

      if (this.graphNode) {
         this.initialize();
      }
   }

   /**
    * @public
    */
   setRefreshFlag() {
      console.log("Set refresh flag of '" + this.graphNode.getName() + "'.");
      this.refreshFlag = true;
      this.execute();
   }

   /**
    * @public
    */
   async execute() {
      if (this.graphNode.asWorker) {
         if (this.worker) {
            console.log("terminating " + this.graphNode.executer.name + ".");
            this.worker.terminate();
         }
      } else {
         if (this.executerPromiseCallback) {
            console.log("aborting " + this.graphNode.executer.name + ".");
            this.executerPromiseCallback.abortFlag = true;
         }
      }

      if (this.refreshFlag) {
         this.refreshFlag = false;

         const parameterValues = this.getParameterValues();
         if (parameterValues.includes(undefined)) return;

         console.log(
            "Calling function '" + this.graphNode.executer.name + "'."
         );

         if (this.graphNode.asWorker) {
            this.executeAsWorker(parameterValues);
         } else {
            this.executeAsPromise(parameterValues);
         }

         if (!parameterValues.includes(undefined)) {
            console.log("Executing " + this.graphNode.executer.name + ".");
         } else {
            console.log(
               "Function '" +
                  this.graphNode.executer.name +
                  "' did not pick up, because at least one parameter is undefined."
            );
         }
      }
   }

   /**
    * @private
    * @param {any[]} parameterValues
    */
   async executeAsPromise(parameterValues) {
      setTimeout(async () => {
         this.executerPromiseCallback = new NodeCallback(this);
         const result = await this.graphNode.executer(
            ...parameterValues,
            this.executerPromiseCallback
         );

         this.graphNodeOutputs[0].setValue(result);
         this.refreshValuePreview(result);
      });
   }

   /**
    * @private
    * @param {any[]} parameterValues
    */
   async executeAsWorker(parameterValues) {
      const toTransfer = [];
      const toCopy = [];

      let parameterValuesString = "(";
      let pointerCount = 0;
      let copyCount = 0;

      parameterValues.forEach((parameterValue) => {
         if (parameterValue instanceof ImageBitmap) {
            toTransfer.push(parameterValue);
            parameterValuesString +=
               "messageEvent.data.pointer[" + String(pointerCount) + "]";
            pointerCount++;
         } else {
            toCopy.push(parameterValue);
            parameterValuesString +=
               "messageEvent.data.copy[" + String(copyCount) + "]";
            copyCount++;
         }
         parameterValuesString += ",";
      });
      parameterValuesString += ")";

      this.worker = await this.createWorker(parameterValuesString);

      const cThis = this;
      this.worker.addEventListener(
         "message",
         async function handler(messageEvent) {
            cThis.worker.removeEventListener(messageEvent.type, handler);
            const resultValue = messageEvent.data;
            // TODO Handle multiple outputs.
            cThis.graphNodeOutputs[0].setValue(resultValue);
            cThis.refreshValuePreview(resultValue);

            cThis.worker.terminate();
            cThis.worker = undefined;
         }
      );

      console.log({ toCopy });

      this.worker.postMessage(
         { pointer: toTransfer, copy: toCopy },
         toTransfer
      );
   }

   /**
    * @private
    * @param {string} parameterValuesString
    * @returns {Promise<Worker>}
    */
   async createWorker(parameterValuesString) {
      const dependenciesSource = await this.graphNode.getDependenciesSource();

      const workerSource =
         dependenciesSource +
         "\n" +
         "const cSelf = self;\n" +
         "self.addEventListener('message', async (messageEvent) => {\n" +
         // "console.log(messageEvent.data.parameterValues[0]);\n" +
         "cSelf.postMessage(await DepthMapHelper." + // TODO Find solution.
         this.graphNode.executer.name +
         parameterValuesString +
         ");\n" +
         "});";

      const blob = new Blob([workerSource], {
         type: "text/javascript",
      });
      const workerSrc = window.URL.createObjectURL(blob);
      return new Worker(workerSrc);
   }

   /**
    * @protected
    * @param {any} value
    */
   refreshValuePreview(value) {
      this.outputUIElement.innerHTML = "";

      if (value instanceof ImageBitmap) {
         const imageCanvas = document.createElement("canvas");
         imageCanvas.width = value.width;
         imageCanvas.height = value.height;
         const context = imageCanvas.getContext("2d");
         context.drawImage(value, 0, 0, value.width, value.height);
         const imageElement = new Image();
         imageElement.style.maxWidth = "100%";
         imageCanvas.style.maxHeight = "5rem";
         this.outputUIElement.style.display = "flex";
         this.outputUIElement.style.justifyContent = "center";
         this.outputUIElement.appendChild(imageElement);
         imageElement.src = imageCanvas.toDataURL();
      } else if (typeof value === "number") {
         const numberElement = document.createElement("div");
         numberElement.innerText = String(value);
         numberElement.style.textAlign = "center";
         this.outputUIElement.appendChild(numberElement);
      } else if (typeof value === "string") {
         const valueImage = new Image();
         valueImage.src = value;
         valueImage.style.maxWidth = "100%";
         valueImage.style.maxHeight = "5rem";
         this.outputUIElement.style.display = "flex";
         this.outputUIElement.style.justifyContent = "center";
         this.outputUIElement.appendChild(valueImage);
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

      this.domProgressElement = document.createElement("progress");
      this.domProgressElement.style.width = "100%";
      this.domProgressElement.value = 0;
      this.domProgressElement.max = 100;
      this.domElement.appendChild(this.domProgressElement);
      this.domProgressElement.hidden = true;

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
         if (graphNodeInput.graphNodeUI === this) {
            const output = graphNodeInput.getConnection();
            if (output) {
               connections.push({
                  input: graphNodeInput,
                  output: output,
               });
            }
         }
      });

      return connections;
   }

   /**
    * @public
    * @returns {GraphNodeUI[]}
    */
   getOutputNodes() {
      /** @type {GraphNodeUI[]} */
      const outputNodes = [];

      this.graphNodeOutputs.forEach((graphNodeOutput) => {
         graphNodeOutput.getConnections().forEach((connection) => {
            outputNodes.push(connection.graphNodeUI);
         });
      });
      return outputNodes;
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
      } else if (this.type === "ImageBitmap") {
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
      } else if (this.type === "ImageBitmap") {
         value = new Image();
         const reader = new FileReader();
         const cThis = this;

         setTimeout(() => {
            reader.addEventListener("load", () => {
               value.addEventListener("load", async () => {
                  value = await createImageBitmap(value);
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
      // TODO Handle multiple outputs.
      return [{ input: this.inputNode, output: this.graphNodeOutput }];
   }

   /**
    * @override
    * @public
    * @returns {GraphNodeUI[]}
    */
   getOutputNodes() {
      return [this.inputNode.graphNodeUI];
   }

   /**
    * @override
    * @public
    */
   async execute() {
      this.refreshFlag = false;
   }
}
