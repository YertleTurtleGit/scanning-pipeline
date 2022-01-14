/* global NodeGraph, NODE_TYPE, ambientOcclusionMap, roughnessMap, photometricStereoNormalMap, depthMap, albedoMap, PhotometricStereoRenderer, pointCloud */

async function main() {
   const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

   const albedoMapNode = nodeGraph.registerNodeAsWorker(albedoMap, [
      "./src/glsl-shader.js",
      "./src/albedo-map.js",
   ]);
   const normalMapNode = nodeGraph.registerNodeAsWorker(
      photometricStereoNormalMap,
      ["./src/glsl-shader.js", "./src/normal-map.js"]
   );
   const depthMapNode = nodeGraph.registerNodeAsWorker(depthMap, [
      "./src/glsl-shader.js",
      "./src/function-worker.js",
      "./src/depth-map.js",
   ]);
   const ambientOcclusionMapNode = nodeGraph.registerNodeAsWorker(
      ambientOcclusionMap,
      ["./src/glsl-shader.js", "./src/ambient-occlusion-map.js"]
   );
   const roughnessMapNode = nodeGraph.registerNodeAsWorker(roughnessMap, [
      "./src/glsl-shader.js",
      "./src/roughness-map.js",
   ]);
   const pointCloudNode = nodeGraph.registerNodeAsWorker(
      pointCloud,
      ["./src/point-cloud.js"],
      NODE_TYPE.POINT_CLOUD
   );

   const albedoMapNodeA = nodeGraph.placeNode(albedoMapNode, {
      x: 750,
      y: 850,
   });
   const normalMapNodeA = nodeGraph.placeNode(normalMapNode, {
      x: 750,
      y: 150,
   });
   const depthMapNodeA = nodeGraph.placeNode(depthMapNode, { x: 1025, y: 600 });
   const ambientOcclusionMapNodeA = nodeGraph.placeNode(
      ambientOcclusionMapNode,
      {
         x: 1300,
         y: 50,
      }
   );
   const roughnessMapNodeA = nodeGraph.placeNode(roughnessMapNode, {
      x: 1300,
      y: 400,
   });
   const pointCloudNodeA = nodeGraph.placeNode(pointCloudNode, {
      x: 1300,
      y: 800,
   });

   const lightAzimuthalAngleInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER_ARRAY,
      {
         x: 200,
         y: 25,
      },
      [0, 45, 90, 135, 180, 225, 270, 315]
   );
   const lightPolarAnglesInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER_ARRAY,
      {
         x: 200,
         y: 300,
      },
      [45, 45, 45, 45, 45, 45, 45, 45]
   );
   const cameraDistanceInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER,
      {
         x: 200,
         y: 500,
      },
      18
   );
   const lightDistanceInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER,
      {
         x: 200,
         y: 600,
      },
      18
   );
   /*const lightImagesInputNode = nodeGraph.createInputNode("ImageBitmap[]", {
      x: 200,
      y: 400,
   });*/

   const uiCanvas = document.createElement("canvas");
   uiCanvas.width = 250;
   uiCanvas.height = 250;
   uiCanvas.style.zIndex = "999";
   document.body.appendChild(uiCanvas);

   new PhotometricStereoRenderer(
      uiCanvas,
      "./test-datasets/models/mesh_plane.glb",
      {
         width: 250,
         height: 250,
      }
   );
   await PhotometricStereoRenderer.renderedLightImages(
      [45, 45, 45, 45, 45, 45, 45, 45],
      [0, 45, 90, 135, 180, 225, 270, 315],
      18,
      18
   );

   const lightImagesRenderNode = nodeGraph.registerNode(
      PhotometricStereoRenderer.renderedLightImages,
      NODE_TYPE.IMAGE
   );
   const lightImagesRenderNodeA = nodeGraph.placeNode(lightImagesRenderNode, {
      x: 450,
      y: 400,
   });
   const qualityPercentInputNode = nodeGraph.createInputNode(
      "number",
      {
         x: 750,
         y: 750,
      },
      1
   );
   const depthFactorInputNode = nodeGraph.createInputNode(
      "number",
      {
         x: 1025,
         y: 950,
      },
      0.5
   );

   /*nodeGraph.connect(
      lightImagesInputNode.getOutput(),
      normalMapNodeA.getInput("lightImages")
   );
   nodeGraph.connect(
      lightImagesInputNode.getOutput(),
      albedoMapNodeA.getInput("lightImages")
   );*/
   nodeGraph.connect(
      lightPolarAnglesInputNode.getOutput(),
      normalMapNodeA.getInput("lightPolarAnglesDeg")
   );
   nodeGraph.connect(
      lightPolarAnglesInputNode.getOutput(),
      lightImagesRenderNodeA.getInput("lightPolarAnglesDeg")
   );
   nodeGraph.connect(
      lightAzimuthalAngleInputNode.getOutput(),
      normalMapNodeA.getInput("lightAzimuthalAnglesDeg")
   );
   nodeGraph.connect(
      lightAzimuthalAngleInputNode.getOutput(),
      lightImagesRenderNodeA.getInput("lightAzimuthalAnglesDeg")
   );
   nodeGraph.connect(
      cameraDistanceInputNode.getOutput(),
      lightImagesRenderNodeA.getInput("cameraDistance")
   );
   nodeGraph.connect(
      lightDistanceInputNode.getOutput(),
      lightImagesRenderNodeA.getInput("lightDistance")
   );
   nodeGraph.connect(
      lightImagesRenderNodeA.getOutput(),
      normalMapNodeA.getInput("lightImages")
   );
   nodeGraph.connect(
      lightImagesRenderNodeA.getOutput(),
      albedoMapNodeA.getInput("lightImages")
   );
   nodeGraph.connect(
      normalMapNodeA.getOutput(),
      depthMapNodeA.getInput("normalMap")
   );
   nodeGraph.connect(
      qualityPercentInputNode.getOutput(),
      depthMapNodeA.getInput("qualityPercent")
   );
   nodeGraph.connect(
      normalMapNodeA.getOutput(),
      ambientOcclusionMapNodeA.getInput("normalMap")
   );
   nodeGraph.connect(
      depthMapNodeA.getOutput(),
      ambientOcclusionMapNodeA.getInput("depthMap")
   );
   nodeGraph.connect(
      normalMapNodeA.getOutput(),
      roughnessMapNodeA.getInput("normalMap")
   );
   nodeGraph.connect(
      depthMapNodeA.getOutput(),
      roughnessMapNodeA.getInput("depthMap")
   );
   nodeGraph.connect(
      depthMapNodeA.getOutput(),
      pointCloudNodeA.getInput("depthMap")
   );
   nodeGraph.connect(
      albedoMapNodeA.getOutput(),
      pointCloudNodeA.getInput("texture")
   );
   nodeGraph.connect(
      depthFactorInputNode.getOutput(),
      pointCloudNodeA.getInput("depthFactor")
   );
}
main();
