/* global NodeGraph,  brighten, calculateDepthMap */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const brightenNode = nodeGraph.registerNode(brighten, "./src/glsl-shader.js");
const depthMapNode = nodeGraph.registerNode(
   calculateDepthMap,
   "./src/glsl-shader.js"
);

nodeGraph.placeNode(brightenNode, { x: 500, y: 350 });
nodeGraph.placeNode(brightenNode, { x: 800, y: 350 });
nodeGraph.placeNode(brightenNode, { x: 1100, y: 350 });
