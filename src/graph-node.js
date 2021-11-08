/* exported GraphNode, GraphArea */

class GraphNode {
   /**
    * @param {Function} executer
    * @param {string} displayName
    * @param {Function} thisParameter
    */
   constructor(executer, displayName = executer.name, thisParameter = null) {
      this.executer = executer;
      this.displayName = displayName;
      this.thisParameter = thisParameter;

      this.inputNames = this.getInputNames();
      this.outputName = this.getOutputName();

      this.mouseGrab = false;
      this.initialMouseGrabPosition = undefined;
      this.nodeDiv = undefined;
      this.nodeGraph = undefined;
      this.outputListItem = undefined;
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
    * @param {NodeGraph} nodeGraph
    */
   setNodeGraph(nodeGraph) {
      this.nodeGraph = nodeGraph;
   }

   /**
    * @private
    * @param {MouseEvent} mouseEvent
    */
   mouseGrabbed(mouseEvent) {
      mouseEvent.preventDefault();

      this.initialMouseGrabPosition = {
         x:
            mouseEvent.clientX -
            Number(this.nodeDiv.style.left.replace("px", "")),
         y:
            mouseEvent.clientY -
            Number(this.nodeDiv.style.top.replace("px", "")),
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
         this.nodeDiv.style.left = String(translation.x) + "px";
         this.nodeDiv.style.top = String(translation.y) + "px";
      }

      this.nodeGraph.updateLines();
   }

   /**
    * @param {HTMLElement} moveableArea
    * @returns {HTMLDivElement} nodeDiv
    */
   getNodeDiv(moveableArea) {
      if (this.nodeDiv) {
         return this.nodeDiv;
      }
      this.nodeDiv = document.createElement("div");
      this.nodeDiv.classList.add("graphNode");

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
      this.nodeDiv.appendChild(this.nodeTitle);

      this.nodeIODiv = document.createElement("div");
      this.nodeIODiv.classList.add("graphNodeIO");
      this.nodeDiv.appendChild(this.nodeIODiv);

      const nodeDivInputList = document.createElement("ul");
      this.nodeIODiv.appendChild(nodeDivInputList);
      const nodeDivOutputList = document.createElement("ul");
      this.nodeIODiv.appendChild(nodeDivOutputList);

      this.inputNames.forEach((inputName) => {
         const inputListItem = document.createElement("li");
         inputListItem.innerText = inputName;
         nodeDivInputList.appendChild(inputListItem);
      });

      this.outputListItem = document.createElement("li");
      this.outputListItem.innerText = this.outputName;
      nodeDivOutputList.appendChild(this.outputListItem);

      return this.nodeDiv;
   }
}

class GraphNodeConnector {
   /**
    * @param {HTMLElement} htmlElement
    * @param {string} name
    * @param {boolean} isInput
    */
   constructor(htmlElement, name, isInput) {
      this.htmlElement = htmlElement;
      this.name = name;
      this.isInput = isInput;
   }
}

class NodeGraph {
   /**
    * @param {HTMLElement} parentElement
    */
   constructor(parentElement = document.body) {
      this.div = document.createElement("div");
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
   }

   /**
    * @param {GraphNode} graphNode
    */
   addNode(graphNode) {
      this.div.appendChild(graphNode.getNodeDiv(this.div));
      graphNode.setNodeGraph(this);
   }

   /**
    * @param {GraphNodeConnector} graphNodeConnectorOutput
    * @param {GraphNodeConnector} graphNodeConnectorInput
    */
   connect(graphNodeConnectorOutput, graphNodeConnectorInput) {
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

      this.updateLines();
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

const graphNode_1 = new GraphNode(add);
nodeGraph.addNode(graphNode_1);

const graphNode_2 = new GraphNode(add_2);
nodeGraph.addNode(graphNode_2);

nodeGraph.connect(graphNode_1.nodeDiv, graphNode_2.nodeDiv);
