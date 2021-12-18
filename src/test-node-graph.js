/* global NodeGraph,  brighten, DepthMapHelper */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const brightenNode = nodeGraph.registerNode(brighten, "./src/glsl-shader.js");
const depthMapNode = nodeGraph.registerNode(
   DepthMapHelper.calculateDepthMap,
   "./src/glsl-shader.js"
);

nodeGraph.placeNode(depthMapNode, { x: 500, y: 350 });
nodeGraph.placeNode(brightenNode, { x: 800, y: 350 });
nodeGraph.placeNode(brightenNode, { x: 1100, y: 350 });
