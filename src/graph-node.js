/* exported GraphNode, GraphArea */

class GraphNode {
   /**
    * @param {Function} executer
    * @param {{name:string, type:NODE_TYPE, description:string}[]} inputs
    * @param {{name:string, type:NODE_TYPE, description:string}} output
    * @param {string} displayName
    * @param {Function} thisParameter
    */
   constructor(
      executer,
      inputs,
      output,
      displayName = executer.name,
      thisParameter = null
   ) {
      this.executer = executer;
      this.inputs = inputs;
      this.output = output;
      this.displayName = displayName;
      this.thisParameter = thisParameter;

      this.mouseGrab = false;
      this.initialMouseGrabPosition = undefined;
      this.nodeDiv = undefined;
      this.nodeGraph = undefined;
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
   }

   /**
    * @returns {HTMLDivElement} nodeDiv
    */
   getNodeDiv() {
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
      window.addEventListener("mousemove", this.mouseMoved.bind(this));
      this.nodeDiv.appendChild(this.nodeTitle);

      this.nodeIODiv = document.createElement("div");
      this.nodeIODiv.classList.add("graphNodeIO");
      this.nodeDiv.appendChild(this.nodeIODiv);

      const nodeDivInputList = document.createElement("ul");
      this.nodeIODiv.appendChild(nodeDivInputList);
      const nodeDivOutputList = document.createElement("ul");
      this.nodeIODiv.appendChild(nodeDivOutputList);

      this.inputs.forEach((input) => {
         const inputListItem = document.createElement("li");
         inputListItem.innerText = input.name + input.type;
         inputListItem.title =
            input.name + input.type + " . " + input.description;
         nodeDivInputList.appendChild(inputListItem);
      });

      const outputListItem = document.createElement("li");
      outputListItem.innerText = this.output.name + this.output.type;
      outputListItem.title =
         this.output.name + this.output.type + " . " + this.output.description;
      nodeDivOutputList.appendChild(outputListItem);

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
   }

   /**
    * @param {GraphNode} graphNode
    */
   addNode(graphNode) {
      this.div.appendChild(graphNode.getNodeDiv());
   }
}

function add_1(bla1) {
   return bla1 + 1;
}

function add_2(bla1) {
   return bla1 + 2;
}

const graphArea = new NodeGraph();

const graphNode_1 = new GraphNode(
   add_1,
   [
      {
         name: "bla1",
         type: GraphNode.NODE_TYPE.NUMBER,
         description: "lalala.",
      },
   ],
   {
      name: "resultbla",
      type: GraphNode.NODE_TYPE.NUMBER,
      description: "blubliblub",
   }
);

graphArea.addNode(graphNode_1);

const graphNode_2 = new GraphNode(
   add_2,
   [
      {
         name: "bla1",
         type: GraphNode.NODE_TYPE.NUMBER,
         description: "lalala.",
      },
   ],
   {
      name: "resultbla",
      type: GraphNode.NODE_TYPE.NUMBER,
      description: "blubliblub",
   }
);

graphArea.addNode(graphNode_2);
