/* global THREE */
/* exported NodeCallback, NODE_TYPE */

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
      this.graphNodeUI.domProgressElement.hidden = false;
      if (progressPercent <= 0) {
         this.graphNodeUI.domProgressElement.removeAttribute("value");
      } else if (progressPercent >= 100) {
         this.graphNodeUI.domProgressElement.hidden = true;
      } else {
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
    * @param {NODE_TYPE} uiPreviewType
    * @returns {GraphNode}
    */
   registerNode(nodeExecuter, uiPreviewType) {
      const graphNode = new GraphNode(nodeExecuter, false, [], uiPreviewType);
      this.registeredNodes.push(graphNode);
      return graphNode;
   }

   /**
    * @public
    * @param {Function} nodeExecuter
    * @param {string[]} dependencies
    * @param {NODE_TYPE} uiPreviewType
    * @returns {GraphNode}
    */
   registerNodeAsWorker(
      nodeExecuter,
      dependencies = [],
      uiPreviewType = NODE_TYPE.AUTO
   ) {
      const graphNode = new GraphNode(
         nodeExecuter,
         true,
         dependencies,
         uiPreviewType
      );
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
      if (position) inputGraphNode.setPosition(position);
      this.parentElement.appendChild(inputGraphNode.domElement);
   }

   /**
    * @public
    * @param {string} type
    * @param {{x:number, y:number}} position
    * @param {any} initValue
    * @returns {GraphNodeUI}
    */
   createInputNode(type, position, initValue = undefined) {
      const inputGraphNode = new InputGraphNode(this, type);
      if (initValue) {
         inputGraphNode.setValue(initValue);
      }
      this.placeInputGraphNode(inputGraphNode, position);
      return inputGraphNode;
   }

   /**
    * @public
    * @param {Promise<GraphNodeOutputUI>} output
    * @param {Promise<GraphNodeInputUI>} input
    */
   async connect(output, input) {
      const inputResolved = await input;
      const outputResolved = await output;
      inputResolved.setConnection(outputResolved);
      this.updateConnectionUI();
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
      // this.placeNode(this.registeredNodes[0]);
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
         if (connection.input && connection.output) {
            const startRect =
               connection.input.domElement.getBoundingClientRect();
            const start = {
               x: startRect.left,
               y: (startRect.top + startRect.bottom) / 2,
            };
            const endRect =
               connection.output.domElement.getBoundingClientRect();
            const end = {
               x: endRect.right,
               y: (endRect.top + endRect.bottom) / 2,
            };
            this.domCanvasContext.moveTo(start.x, start.y);
            this.domCanvasContext.lineTo(end.x, end.y);
         }
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
    * @param {GraphNodeInputUI | GraphNodeOutputUI} linkedNodeIO
    */
   setLinkedNodeIO(linkedNodeIO) {
      this.linkedNodeIO = linkedNodeIO;
      this.updateConnectionUI();
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
    * @param {NODE_TYPE} uiPreviewType
    */
   constructor(executer, asWorker, dependencies, uiPreviewType) {
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
       * @public
       * @type {NODE_TYPE}
       */
      this.uiPreviewType = uiPreviewType;

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

/** @typedef {string} NODE_TYPE */
const NODE_TYPE = {
   AUTO: "auto",
   NUMBER: "number",
   NUMBER_ARRAY: "number[]",
   IMAGE: "ImageBitmap",
   IMAGE_ARRAY: "ImageBitmap[]",
   POINT_CLOUD: "{vertices:number,colors:number}",
};

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
      this.domElement.addEventListener("mouseup", this.mouseHandler.bind(this));
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
    */
   mouseHandler() {
      this.nodeGraph.toggleConnection(this);
   }

   /**
    * @private
    */
   async doubleClickHandler() {
      this.nodeGraph.setLinkedNodeIO(null);
      this.removeConnection();

      const boundingRect = this.domElement.getBoundingClientRect();
      const inputNode = this.nodeGraph.createInputNode(this.type, {
         x: boundingRect.left - 200,
         y: boundingRect.top - 25,
      });
      this.nodeGraph.connect(
         inputNode.getOutput(),
         new Promise((resolve) => {
            resolve(this);
         })
      );

      this.nodeGraph.updateConnectionUI();
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
    */
   mouseHandler() {
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
    * @param {string} name
    * @returns {Promise<GraphNodeInputUI>}
    */
   async getInput(name) {
      await this.initialize();

      for (let i = 0; i < this.graphNodeInputs.length; i++) {
         if (this.graphNodeInputs[i].name === name)
            return this.graphNodeInputs[i];
      }
   }

   /**
    * @public
    * @param {string} description
    * @returns {Promise<GraphNodeOutputUI>}
    */
   async getOutput(description = undefined) {
      await this.initialize();

      if (this.graphNodeOutputs.length === 1) {
         return this.graphNodeOutputs[0];
      } else {
         for (let i = 0; i < this.graphNodeOutputs.length; i++) {
            if (this.graphNodeOutputs[i].description === description)
               return this.graphNodeOutputs[i];
         }
      }
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
      if (this.graphNode.asWorker) {
         if (this.worker) {
            console.log("terminating " + this.graphNode.executer.name + ".");
            this.worker.postMessage("CLOSE");
            this.worker.terminate();
         }
      } else {
         if (this.executerCallback) {
            console.log("aborting " + this.graphNode.executer.name + ".");
            this.executerCallback.abortFlag = true;
         }
      }

      if (this.refreshFlag) {
         this.refreshFlag = false;

         const parameterValues = this.getParameterValues();
         if (parameterValues.includes(undefined)) return;

         console.log(
            "Calling function '" + this.graphNode.executer.name + "'."
         );

         this.executerCallback = new NodeCallback(this);
         this.executerCallback.setProgressPercent(0);

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
         const result = await this.graphNode.executer(
            ...parameterValues,
            this.executerCallback
         );

         this.graphNodeOutputs[0].setValue(result);
         this.refreshValuePreview(result);
         this.executerCallback.setProgressPercent(100);
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
         if (false && parameterValue instanceof ImageBitmap) {
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
            cThis.executerCallback.setProgressPercent(100);
         }
      );

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
         "if(messageEvent.data === 'CLOSE' && onClose) {onClose();} else {\n" +
         "cSelf.postMessage(await " +
         this.graphNode.executer.name +
         parameterValuesString +
         ");\n" +
         "}});";

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

      if (
         this.graphNode &&
         this.graphNode.uiPreviewType === NODE_TYPE.POINT_CLOUD
      ) {
         const pointCloudDownloadButton = document.createElement("button");
         pointCloudDownloadButton.innerText = "download";
         pointCloudDownloadButton.addEventListener("click", () => {
            const filename = "point_cloud.obj";
            let objString = "";

            for (
               let i = 0, vertexCount = value.vertices.length;
               i < vertexCount;
               i += 3
            ) {
               const x = value.vertices[i + 0];
               const y = value.vertices[i + 1];
               const z = value.vertices[i + 2];

               const r = value.colors[i + 0];
               const g = value.colors[i + 1];
               const b = value.colors[i + 2];
               objString += "v " + x + " " + y + " " + z + " ";
               objString += r + " " + g + " " + b + "\n";
            }

            let element = document.createElement("a");
            element.style.display = "none";

            let blob = new Blob([objString], {
               type: "text/plain; charset = utf-8",
            });

            let url = window.URL.createObjectURL(blob);
            element.setAttribute("href", window.URL.createObjectURL(blob));
            element.setAttribute("download", filename);

            document.body.appendChild(element);

            element.click();

            window.URL.revokeObjectURL(url);
            element.remove();
         });

         this.outputUIElement.appendChild(pointCloudDownloadButton);

         const pointCloudCanvas = document.createElement("canvas");
         pointCloudCanvas.width = 200;
         pointCloudCanvas.height = 200;

         const renderer = new THREE.WebGLRenderer({
            canvas: pointCloudCanvas,
            alpha: true,
            antialias: true,
         });
         const camera = new THREE.PerspectiveCamera(
            50,
            pointCloudCanvas.width / pointCloudCanvas.height,
            0.01,
            1000
         );

         // @ts-ignore
         const controls = new THREE.OrbitControls(camera, pointCloudCanvas);
         const scene = new THREE.Scene();
         const geometry = new THREE.BufferGeometry();
         const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
         });
         const pointCloud = new THREE.Points(geometry, material);

         pointCloud.rotateX(35 * (Math.PI / 180));
         pointCloud.translateY(15);

         scene.add(pointCloud);

         camera.position.z = 75;
         camera.position.y = -100;

         controls.target = new THREE.Vector3(0, 0, 0);

         geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(value.vertices, 3)
         );
         geometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(value.colors, 3)
         );
         geometry.attributes.position.needsUpdate = true;
         geometry.attributes.color.needsUpdate = true;

         pointCloudCanvas.style.width = "100%";
         pointCloudCanvas.style.height = "100%";
         pointCloudCanvas.style.cursor = "move";
         this.outputUIElement.appendChild(pointCloudCanvas);

         controls.addEventListener("change", () => {
            renderer.render(scene, camera);
         });
         renderer.render(scene, camera);
         controls.update();
      } else if (value instanceof ImageBitmap) {
         const imageCanvas = document.createElement("canvas");
         imageCanvas.width = value.width;
         imageCanvas.height = value.height;
         const context = imageCanvas.getContext("2d");
         context.drawImage(value, 0, 0, value.width, value.height);
         const imageElement = new Image();
         imageElement.style.maxWidth = "100%";
         imageCanvas.style.maxHeight = "5rem";

         const dataUrl = imageCanvas.toDataURL();
         imageElement.src = dataUrl;

         const imageDownloadButton = document.createElement("button");
         imageDownloadButton.innerText = "download";
         imageDownloadButton.addEventListener("click", () => {
            const tmpElement = document.createElement("a");
            tmpElement.setAttribute("href", dataUrl);
            tmpElement.setAttribute("download", "image.png");
            document.body.appendChild(tmpElement);
            tmpElement.click();
            tmpElement.remove();
         });

         this.outputUIElement.appendChild(imageDownloadButton);
         this.outputUIElement.appendChild(imageElement);
      } else if (Array.isArray(value) && value[0] instanceof ImageBitmap) {
         const imageCanvas = document.createElement("canvas");
         imageCanvas.width = value[0].width;
         imageCanvas.height = value[0].height;
         const context = imageCanvas.getContext("2d");
         value.forEach((singleValue, valueIndex) => {
            valueIndex = value.length - 1 - valueIndex;
            context.drawImage(
               singleValue,
               (singleValue.width / (value.length * 1.75)) * valueIndex,
               (singleValue.height / (value.length * 1.75)) * valueIndex,
               (singleValue.width / value.length) * 4,
               (singleValue.height / value.length) * 4
            );
         });
         const imageElement = new Image();
         imageElement.style.maxWidth = "100%";
         imageCanvas.style.maxHeight = "5rem";
         this.outputUIElement.style.display = "flex";
         this.outputUIElement.style.justifyContent = "center";
         this.outputUIElement.appendChild(imageElement);
         imageElement.src = imageCanvas.toDataURL();
      } else if (typeof value === "string") {
         const valueImage = new Image();
         valueImage.src = value;
         valueImage.style.maxWidth = "100%";
         valueImage.style.maxHeight = "5rem";
         this.outputUIElement.style.display = "flex";
         this.outputUIElement.style.justifyContent = "center";
         this.outputUIElement.appendChild(valueImage);
      } else if (Array.isArray(value) && typeof value[0] === "number") {
         value.forEach((singleValue) => {
            const numberElement = document.createElement("div");
            numberElement.innerText = String(singleValue);
            numberElement.style.textAlign = "center";
            this.outputUIElement.appendChild(numberElement);
         });
      } else if (typeof value === "number") {
         const numberElement = document.createElement("div");
         numberElement.innerText = String(value);
         numberElement.style.textAlign = "center";
         this.outputUIElement.appendChild(numberElement);
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
    * @public
    */
   async initialize() {
      while (this.initializing) {
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }
      if (this.initialized) {
         return;
      }
      this.initialized = false;
      this.initializing = true;

      if (this.graphNode) {
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
      }

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

      this.initialized = true;
      this.initializing = false;
   }

   /**
    * @public
    * @returns {Promise<{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]>}
    */
   async getConnections() {
      /** @type {{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]} */
      const connections = [];

      if (!this.graphNodeInputs) return connections;

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
    * @public
    * @returns {{x:number, y:number}}
    */
   getPosition() {
      const boundingRect = this.domElement.getBoundingClientRect();
      return {
         x: boundingRect.left + boundingRect.width / 2,
         y: boundingRect.top + 5,
      };
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
    * @param {GraphNodeInputUI | string} inputNodeOrType
    * @param {string} cssClass
    */
   constructor(nodeGraph, inputNodeOrType, cssClass = "graphNode") {
      super(undefined, nodeGraph, cssClass);

      if (inputNodeOrType instanceof GraphNodeInputUI) {
         this.type = inputNodeOrType.type;
         this.inputNode = inputNodeOrType;
      } else {
         this.type = inputNodeOrType;
      }

      this.initialize();

      if (inputNodeOrType instanceof GraphNodeInputUI)
         this.setConnectionToInputNode();
   }

   /**
    * @private
    */
   async setConnectionToInputNode() {
      this.inputNode.setConnection(this.graphNodeOutputs);
      this.nodeGraph.updateConnectionUI();
   }

   /**
    * @override
    */
   async initialize() {
      while (this.initializing) {
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }
      if (this.initialized) {
         return;
      }

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
      domIOElement.style.marginLeft = "10%";
      domIOElement.style.width = "100%";

      this.domElement.appendChild(domIOElement);
      domIOElement.appendChild(domInputList);
      domIOElement.appendChild(domOutputList);

      this.inputElement = document.createElement("input");
      this.inputElement.style.width = "80%";
      this.inputElement.style.overflowWrap = "break-word";
      this.inputElement.style.hyphens = "auto";
      this.inputElement.style.whiteSpace = "normal";
      this.inputElement.multiple = false;

      if (this.type === NODE_TYPE.NUMBER) {
         this.inputElement.type = "number";
         domInputList.appendChild(this.inputElement);
      } else if (this.type === NODE_TYPE.IMAGE) {
         this.inputElement.type = "file";
         this.inputElement.accept = "image/*";
      } else if (this.type === NODE_TYPE.IMAGE_ARRAY) {
         this.inputElement.type = "file";
         this.inputElement.accept = "image/*";
         this.inputElement.multiple = true;
      } else if (this.type === NODE_TYPE.NUMBER_ARRAY) {
         this.inputElement.type = "text";
      } else {
         console.error("Input type '" + this.type + "' not supported.");
      }

      this.inputElement.addEventListener(
         "input",
         this.inputChangeHandler.bind(this)
      );
      this.inputElement.addEventListener(
         "change",
         this.inputChangeHandler.bind(this)
      );

      domInputList.appendChild(this.inputElement);

      this.graphNodeOutputs = [
         new GraphNodeOutputUI(
            this.type,
            "[" + this.type + "]",
            this.nodeGraph,
            this
         ),
      ];

      domOutputList.appendChild(this.graphNodeOutputs[0].domElement);

      this.initialized = true;
      this.initializing = false;
   }

   /**
    * @public
    * @param {any} value
    */
   async setValue(value) {
      this.inputElement.value = value;
      this.inputElement.dispatchEvent(new Event("input"));
   }

   /**
    * @private
    * @param {InputEvent} inputEvent
    */
   inputChangeHandler(inputEvent) {
      if (this.type === NODE_TYPE.NUMBER) {
         let value = Number(
            /** @type {HTMLInputElement} */ (inputEvent.target).value
         );
         if (!value) {
            value = 0;
         }
         this.graphNodeOutputs[0].setValue(value);
         this.refreshValuePreview(value);
      } else if (this.type === NODE_TYPE.IMAGE) {
         const nodeCallback = new NodeCallback(this);
         nodeCallback.setProgressPercent(0);

         const imageLoaderWorker = new Worker("./src/image-loader-worker.js");

         imageLoaderWorker.addEventListener("message", async (messageEvent) => {
            const imageBitmap = messageEvent.data.imageBitmap;
            this.graphNodeOutputs[0].setValue(imageBitmap);
            this.refreshValuePreview(imageBitmap);
            nodeCallback.setProgressPercent(100);
         });
         imageLoaderWorker.postMessage(inputEvent.target.files[0]);
      } else if (this.type === NODE_TYPE.IMAGE_ARRAY) {
         const nodeCallback = new NodeCallback(this);
         nodeCallback.setProgressPercent(0);

         const files = Array.from(inputEvent.target.files);

         const imageCount = files.length;
         const imageBitmapArray = [];

         files.forEach((file) => {
            const imageLoaderWorker = new Worker(
               "./src/image-loader-worker.js"
            );

            imageLoaderWorker.addEventListener(
               "message",
               async (messageEvent) => {
                  const name = messageEvent.data.name;
                  const imageBitmap = messageEvent.data.imageBitmap;
                  imageBitmapArray.push({
                     name: name,
                     imageBitmap: imageBitmap,
                  });
                  if (imageBitmapArray.length === imageCount) {
                     imageBitmapArray.sort(function (a, b) {
                        if (a.name < b.name) return -1;
                        if (a.name > b.name) return 1;
                        return 0;
                     });

                     const rawImageBitmapArray = [];
                     imageBitmapArray.forEach((imageBitmap) => {
                        rawImageBitmapArray.push(imageBitmap.imageBitmap);
                     });
                     this.graphNodeOutputs[0].setValue(rawImageBitmapArray);
                     this.refreshValuePreview(imageBitmap);
                  }
                  nodeCallback.setProgressPercent(
                     (imageBitmapArray.length / imageCount) * 100
                  );
               }
            );
            imageLoaderWorker.postMessage(file);
         });
      } else if (this.type === NODE_TYPE.NUMBER_ARRAY) {
         const valueStringArray = /** @type {HTMLInputElement} */ (
            inputEvent.target
         ).value.split(",");

         const value = new Array(valueStringArray.length);

         valueStringArray.forEach((element, index) => {
            value[index] = Number(element);
         });
         this.graphNodeOutputs[0].setValue(value);
         this.refreshValuePreview(value);
      }
   }

   /**
    * @override
    * @public
    * @returns {Promise<{input: GraphNodeInputUI, output:GraphNodeOutputUI}[]>}
    */
   async getConnections() {
      // TODO Handle multiple outputs.
      return [{ input: this.inputNode, output: this.graphNodeOutputs[0] }];
   }

   /**
    * @override
    * @public
    */
   async execute() {
      this.refreshFlag = false;
   }
}
