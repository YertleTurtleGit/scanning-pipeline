/* global NodeGraph,  brighten, DepthMapHelper */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const brightenNode = nodeGraph.registerNodeAsWorker(
   brighten,
   "./src/glsl-shader.js",
   "./test.js"
);
const depthMapNode = nodeGraph.registerNodeAsWorker(
   DepthMapHelper.calculateDepthMap,
   "./src/glsl-shader.js",
   "./src/depth-map-helper.js"
);

const depthMapNodeA = nodeGraph.placeNode(depthMapNode, { x: 500, y: 350 });
const brightenNodeA = nodeGraph.placeNode(brightenNode, { x: 800, y: 350 });
const brightenNodeB = nodeGraph.placeNode(brightenNode, { x: 1100, y: 350 });

nodeGraph.connect(brightenNodeA.getOutput(), brightenNodeB.getInput("image"));
nodeGraph.connect(depthMapNodeA.getOutput(), brightenNodeA.getInput("image"));
nodeGraph.createInputNode(depthMapNodeA.getInput("qualityPercent"), 0.1);
nodeGraph.createInputNode(depthMapNodeA.getInput("normalMap"));
