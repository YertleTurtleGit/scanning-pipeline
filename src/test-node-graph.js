/* global NodeGraph,  brighten, DepthMapHelper */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const brightenNode = nodeGraph.registerNode(brighten);
const depthMapNode = nodeGraph.registerNodeAsWorker(
   DepthMapHelper.calculateDepthMap,
   "./src/glsl-shader.js",
   "./src/depth-map-helper.js"
);

nodeGraph.placeNode(depthMapNode, { x: 500, y: 350 });
nodeGraph.placeNode(brightenNode, { x: 800, y: 350 });
nodeGraph.placeNode(brightenNode, { x: 1100, y: 350 });
