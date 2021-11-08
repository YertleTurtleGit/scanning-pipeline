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

      this.updateLines();
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

/**
 * @constant
 * @typedef {string} NODE_TYPE
 */
GraphNode.NODE_TYPE = {
   NUMBER: " ∈ ℝ",
   IMAGE: " ⎚",
};

class NodeGraph {
   /**
    * @param {HTMLElement} parentElement
    */
   constructor(parentElement = document.body) {
      this.div = document.createElement("div");
      this.div.classList.add("nodeGraphArea");
      parentElement.appendChild(this.div);

      this.svg = document.createElement("svg");
      this.div.appendChild(this.svg);

      this.outputLines = [];
   }

   /**
    * @param {GraphNode} graphNode
    */
   addNode(graphNode) {
      this.div.appendChild(graphNode.getNodeDiv(this.div));
   }

   connect(outputElement, inputElement) {
      const line = /** @type {HTMLElement} */ document.createElement("line");
      this.svg.appendChild(line);
      this.svg.style.display = "block";
      this.svg.style.width = "100%";
      this.svg.style.height = "100%";

      line.style.height = "100%";
      line.style.width = "100%";

      line.setAttribute("stroke", "rgb(255,0,0)");
      line.setAttribute("stroke-width", "2");

      this.outputLines.push({
         lineObject: line,
         a: outputElement,
         b: inputElement,
      });

      this.updateLines();
   }

   updateLines() {
      this.outputLines.forEach((outputLine) => {
         const line = outputLine.lineObject;
         const a = outputLine.a;
         const b = outputLine.b;

         const x1 = a.offsetLeft + a.clientWidth / 2;
         const y1 = a.offsetTop + a.clientHeight / 2;
         const x2 = b.offsetLeft + b.clientWidth / 2;
         const y2 = b.offsetTop + b.clientHeight / 2;

         line.setAttribute("x1", String(x1));
         line.setAttribute("y1", String(y1));
         line.setAttribute("x2", String(x2));
         line.setAttribute("y2", String(y2));
      });
   }
}

function add(numberA, numberB) {
   const sum = numberA + numberB;
   return sum;
}

function add_2(bla1) {
   return bla1 + 2;
}

const graphArea = new NodeGraph();

const graphNode_1 = new GraphNode(add);
graphArea.addNode(graphNode_1);

const graphNode_2 = new GraphNode(add_2);
graphArea.addNode(graphNode_2);

graphNode_1.connectOutputTo(graphNode_2.nodeDiv);
