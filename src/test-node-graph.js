/* global NodeGraph,  brighten, calculateDepthMap */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const brightenNode = nodeGraph.registerNode(brighten, "./src/glsl-shader.js");
const depthMapNode = nodeGraph.registerNode(
   calculateDepthMap,
   "./src/glsl-shader.js"
);

nodeGraph.placeNode(brightenNode);
//nodeGraph.placeNode(depthMapNode);
