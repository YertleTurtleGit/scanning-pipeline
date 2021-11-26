/* global NodeGraph, DepthMapHelper */

const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

const depthMapNode = nodeGraph.registerNode(DepthMapHelper.calculateDepthMap);

nodeGraph.placeNode(depthMapNode);
