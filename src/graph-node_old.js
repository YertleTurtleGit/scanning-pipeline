/* exported GraphNode, GraphArea */

class GraphNode_old {
   /**
    * @param {Function} executer
    * @param {NodeGraph} nodeGraph
    * @param {string} displayName
    * @param {Function} thisParameter
    */
   constructor(
      executer,
      nodeGraph,
      displayName = executer.name,
      thisParameter = null
   ) {
      this.executer = executer;
      this.nodeGraph = nodeGraph;
      this.displayName = displayName;
      this.thisParameter = thisParameter;

      this.nodeDiv = this.createNodeDiv(nodeGraph.div);

      this.position = { x: 0, y: 0 };

      this.mouseGrab = false;
      this.initialMouseGrabPosition = undefined;

      this.inputConnectors = this.createInputConnectors();
      this.outputConnector = this.createOutputConnector();
   }

   /**
    * @returns {GraphNodeConnector}
    */
   getOutputConnector() {
      return this.outputConnector;
   }

   /**
    * @param {string} name
    * @returns {GraphNodeConnector}
    */
   getInputConnector(name) {
      for (let i = 0; i < this.inputConnectors.length; i++) {
         const inputConnector = this.inputConnectors[i];
         if (inputConnector.name === name) {
            return inputConnector;
         }
      }
      return undefined;
   }

   /**
    * @private
    * @returns {GraphNodeConnector}
    */
   createOutputConnector() {
      const nodeDivOutputList = document.createElement("ul");
      this.nodeIODiv.appendChild(nodeDivOutputList);

      const outputListItem = document.createElement("li");
      const outputName = this.getOutputName();
      outputListItem.innerText = outputName;

      nodeDivOutputList.appendChild(outputListItem);

      const outputConnector = new GraphNodeConnector(
         this,
         outputListItem,
         outputName,
         false
      );

      outputListItem.addEventListener("click", () => {
         this.nodeGraph.connectorClicked(outputConnector);
      });

      return outputConnector;
   }

   /**
    * @private
    * @returns {GraphNodeConnector[]}
    */
   createInputConnectors() {
      /** @type {GraphNodeConnector[]} */
      const inputConnectors = [];
      const inputNames = this.getInputNames();

      const nodeDivInputList = document.createElement("ul");
      this.nodeIODiv.appendChild(nodeDivInputList);

      inputNames.forEach((inputName) => {
         const inputListItem = document.createElement("li");
         inputListItem.innerText = inputName;
         nodeDivInputList.appendChild(inputListItem);

         const inputConnector = new GraphNodeConnector(
            this,
            inputListItem,
            inputName,
            true
         );

         inputListItem.addEventListener("click", () => {
            this.nodeGraph.connectorClicked(inputConnector);
         });

         inputConnectors.push(inputConnector);
      });

      return inputConnectors;
   }

   /**
    * @private
    * @returns {string[]}
    */
   getInputNames() {
      const source = this.executer.toString();
      const inputNames = source
         .split(this.executer.name, 2)[1]
         .split("{", 1)[0]
         .replace(" ", "")
         .replace("(", "")
         .replace(")", "")
         .split(",");

      return inputNames;
   }

   /**
    * @private
    * @returns {string}
    */
   getOutputName() {
      const source = this.executer.toString();
      const outputName = source.split("return")[1].split(";", 2)[0];

      return outputName;
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
    * @private
    * @param {MouseEvent} mouseEvent
    */
   mouseGrabbed(mouseEvent) {
      mouseEvent.preventDefault();

      this.initialMouseGrabPosition = {
         x: mouseEvent.clientX - this.position.x,
         y: mouseEvent.clientY - this.position.y,
      };
      this.mouseGrab = true;
      this.nodeTitle.style.cursor = "grabbing";
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   mouseReleased(mouseEvent) {
      mouseEvent.preventDefault();
      this.mouseGrab = false;
      this.nodeTitle.style.cursor = "grab";
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   mouseMoved(mouseEvent) {
      mouseEvent.preventDefault();

      if (this.mouseGrab) {
         const currentMousePosition = {
            x: mouseEvent.clientX,
            y: mouseEvent.clientY,
         };
         const translation = {
            x: currentMousePosition.x - this.initialMouseGrabPosition.x,
            y: currentMousePosition.y - this.initialMouseGrabPosition.y,
         };
         this.setPosition(translation);
      }

      this.nodeGraph.updateLines();
   }

   /**
    * @private
    * @param {{x:number, y:number}} position
    */
   setPosition(position) {
      this.nodeDiv.style.transform =
         "translate(" +
         String(position.x) +
         "px, " +
         String(position.y) +
         "px)";
      this.position = position;
   }

   /**
    * @private
    * @param {HTMLElement} moveableArea
    * @returns {HTMLDivElement} nodeDiv
    */
   createNodeDiv(moveableArea) {
      const nodeDiv = document.createElement("div");
      nodeDiv.classList.add("graphNode");

      this.nodeTitle = document.createElement("div");
      this.nodeTitle.classList.add("graphNodeTitle");
      this.nodeTitle.innerText = this.displayName;
      this.nodeTitle.addEventListener(
         "mousedown",
         this.mouseGrabbed.bind(this)
      );
      this.nodeTitle.addEventListener("mouseup", this.mouseReleased.bind(this));
      moveableArea.addEventListener(
         "mouseleave",
         this.mouseReleased.bind(this)
      );
      window.addEventListener("mousemove", this.mouseMoved.bind(this));
      nodeDiv.appendChild(this.nodeTitle);

      this.nodeIODiv = document.createElement("div");
      this.nodeIODiv.classList.add("graphNodeIO");
      nodeDiv.appendChild(this.nodeIODiv);

      moveableArea.append(nodeDiv);

      return nodeDiv;
   }
}

class GraphNodeConnector_old {
   /**
    * @param {GraphNode} graphNode
    * @param {HTMLElement} htmlElement
    * @param {string} name
    * @param {boolean} isInput
    */
   constructor(graphNode, htmlElement, name, isInput) {
      this.graphNode = graphNode;
      this.htmlElement = htmlElement;
      this.name = name;
      this.isInput = isInput;
   }
}

class NodeGraph_old {
   /**
    * @param {HTMLElement} parentElement
    */
   constructor(parentElement = document.body) {
      this.div = document.createElement("div");
      this.div.addEventListener("mousemove", this.mouseMove.bind(this));
      this.div.classList.add("nodeGraphArea");
      parentElement.appendChild(this.div);

      const lineCanvas = document.createElement("canvas");
      lineCanvas.width = this.div.clientWidth;
      lineCanvas.height = this.div.clientHeight;
      lineCanvas.style.objectFit = "contain";
      lineCanvas.style.position = "absolute";

      this.lineContext = lineCanvas.getContext("2d");
      this.div.appendChild(lineCanvas);

      /** @type {{start: HTMLElement, end: HTMLElement}[]} */
      this.outputLines = [];

      /** @type {GraphNodeConnector} */
      this.selectedConnector = undefined;
   }

   /**
    * @param {GraphNodeConnector} connector
    */
   connectorClicked(connector) {
      if (this.connected(this.selectedConnector, connector)) {
         this.disconnect(this.selectedConnector, connector);
      } else {
         if (this.selectedConnector) {
            if (
               this.selectedConnector.isInput !== connector.isInput &&
               this.selectedConnector.graphNode !== connector.graphNode
            ) {
               this.connect(this.selectedConnector, connector);
               this.selectedConnector = undefined;
            } else {
               this.selectedConnector = undefined;
            }
         } else {
            this.selectedConnector = connector;
         }
      }
      this.updateLines();
   }

   /**
    * @private
    * @param {GraphNodeConnector} graphNodeConnectorA
    * @param {GraphNodeConnector} graphNodeConnectorB
    * @returns {boolean}
    */
   connected(graphNodeConnectorA, graphNodeConnectorB) {}

   /**
    * @private
    * @param {GraphNodeConnector} graphNodeConnectorA
    * @param {GraphNodeConnector} graphNodeConnectorB
    */
   disconnect(graphNodeConnectorA, graphNodeConnectorB) {}

   /**
    * @private
    * @param {GraphNodeConnector} graphNodeConnectorA
    * @param {GraphNodeConnector} graphNodeConnectorB
    */
   connect(graphNodeConnectorA, graphNodeConnectorB) {
      let graphNodeConnectorInput, graphNodeConnectorOutput;

      if (graphNodeConnectorA.isInput) {
         graphNodeConnectorInput = graphNodeConnectorA;
         graphNodeConnectorOutput = graphNodeConnectorB;
      } else {
         graphNodeConnectorInput = graphNodeConnectorB;
         graphNodeConnectorOutput = graphNodeConnectorA;
      }
      this.uiConnect(
         graphNodeConnectorOutput.htmlElement,
         graphNodeConnectorInput.htmlElement
      );
   }

   /**
    * @private
    * @param {HTMLElement} outputElement
    * @param {HTMLElement} inputElement
    */
   uiConnect(outputElement, inputElement) {
      this.outputLines.push({
         start: outputElement,
         end: inputElement,
      });
   }

   /**
    * @param {MouseEvent} mouseEvent
    */
   mouseMove(mouseEvent) {
      this.mousePosition = { x: mouseEvent.clientX, y: mouseEvent.clientY };
   }

   updateLines() {
      this.lineContext.clearRect(
         0,
         0,
         this.lineContext.canvas.width,
         this.lineContext.canvas.height
      );
      this.lineContext.beginPath();
      this.lineContext.strokeStyle = "white";
      this.lineContext.lineWidth = 2;

      this.outputLines.forEach((outputLine) => {
         const startRect = outputLine.start.getBoundingClientRect();
         const start = {
            x: startRect.right,
            y: (startRect.top + startRect.bottom) / 2,
         };
         const endRect = outputLine.end.getBoundingClientRect();
         const end = {
            x: endRect.left,
            y: (endRect.top + endRect.bottom) / 2,
         };
         this.lineContext.moveTo(start.x, start.y);
         this.lineContext.lineTo(end.x, end.y);
      });

      if (this.selectedConnector) {
         const startRect =
            this.selectedConnector.htmlElement.getBoundingClientRect();
         const start = {
            x: startRect.right,
            y: (startRect.top + startRect.bottom) / 2,
         };
         const end = this.mousePosition;
         this.lineContext.moveTo(start.x, start.y);
         this.lineContext.lineTo(end.x, end.y);
      }

      this.lineContext.stroke();
   }
}

function add(numberA, numberB) {
   const sum = numberA + numberB;
   return sum;
}

function add_2(bla1) {
   return bla1 + 2;
}

const nodeGraph = new NodeGraph();

new GraphNode(add, nodeGraph);
new GraphNode(add_2, nodeGraph);
