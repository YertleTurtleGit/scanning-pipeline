/* global NodeGraph,  brighten */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const brightenNode = nodeGraph.registerNode(brighten, "./src/glsl-shader.js");

nodeGraph.placeNode(brightenNode);
