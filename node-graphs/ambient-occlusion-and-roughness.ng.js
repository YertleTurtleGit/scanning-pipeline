/* global NodeGraph, ambientOcclusionMap, roughnessMap */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const ambientOcclusionMapNode = nodeGraph.registerNodeAsWorker(
   ambientOcclusionMap,
   "./src/glsl-shader.js",
   "./src/ambient-occlusion-map.js"
);
const roughnessMapNode = nodeGraph.registerNodeAsWorker(
   roughnessMap,
   "./src/glsl-shader.js",
   "./src/roughness-map.js"
);

const ambientOcclusionMapNodeA = nodeGraph.placeNode(ambientOcclusionMapNode, {
   x: 800,
   y: 100,
});
const roughnessMapNodeA = nodeGraph.placeNode(roughnessMapNode, {
   x: 800,
   y: 500,
});

const normalMapInputNode = nodeGraph.createInputNode("ImageBitmap", {
   x: 200,
   y: 100,
});
const depthMapInputNode = nodeGraph.createInputNode("ImageBitmap", {
   x: 200,
   y: 500,
});

nodeGraph.connect(
   normalMapInputNode.getOutput(),
   ambientOcclusionMapNodeA.getInput("normalMap")
);
nodeGraph.connect(
   depthMapInputNode.getOutput(),
   ambientOcclusionMapNodeA.getInput("depthMap")
);

nodeGraph.connect(
   normalMapInputNode.getOutput(),
   roughnessMapNodeA.getInput("normalMap")
);
nodeGraph.connect(
   depthMapInputNode.getOutput(),
   roughnessMapNodeA.getInput("depthMap")
);
