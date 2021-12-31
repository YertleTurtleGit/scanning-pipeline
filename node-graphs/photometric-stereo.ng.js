/* global NodeGraph, ambientOcclusionMap, roughnessMap, photometricStereoNormalMap, depthMap, albedoMap, PhotometricStereoRenderer */

async function main() {
   const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

   const albedoMapNode = nodeGraph.registerNodeAsWorker(
      albedoMap,
      "./src/glsl-shader.js",
      "./src/albedo-map.js"
   );
   const normalMapNode = nodeGraph.registerNodeAsWorker(
      photometricStereoNormalMap,
      "./src/glsl-shader.js",
      "./src/normal-map.js"
   );
   const depthMapNode = nodeGraph.registerNodeAsWorker(
      depthMap,
      "./src/glsl-shader.js",
      "./src/function-worker.js",
      "./src/depth-map.js"
   );
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

   const albedoMapNodeA = nodeGraph.placeNode(albedoMapNode, {
      x: 750,
      y: 500,
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
         y: 150,
      }
   );
   const roughnessMapNodeA = nodeGraph.placeNode(roughnessMapNode, {
      x: 1300,
      y: 500,
   });

   /*const testImageUrls = [
      "./../test-datasets/photometric-stereo/test_000_036.jpg",
      "./../test-datasets/photometric-stereo/test_045_036.jpg",
      "./../test-datasets/photometric-stereo/test_090_036.jpg",
      "./../test-datasets/photometric-stereo/test_135_036.jpg",
      "./../test-datasets/photometric-stereo/test_180_036.jpg",
      "./../test-datasets/photometric-stereo/test_225_036.jpg",
      "./../test-datasets/photometric-stereo/test_270_036.jpg",
      "./../test-datasets/photometric-stereo/test_315_036.jpg",
   ];

   const testImages = [];

   for (let i = 0; i < testImageUrls.length; i++) {
      await new Promise((resolve) => {
         const htmlImage = new Image();
         htmlImage.addEventListener("load", async () => {
            const imageBitmap = await createImageBitmap(htmlImage);
            testImages.push(imageBitmap);
            resolve();
         });
         htmlImage.src = testImageUrls[i];
      });
   }*/

   const lightPolarAngleInputNode = nodeGraph.createInputNode(
      "number",
      {
         x: 200,
         y: 300,
      },
      45
   );
   const cameraDistanceInputNode = nodeGraph.createInputNode(
      "number",
      {
         x: 200,
         y: 500,
      },
      18
   );
   const lightDistanceInputNode = nodeGraph.createInputNode(
      "number",
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
   await PhotometricStereoRenderer.renderedLightImages(45, 18, 18);

   const lightImagesRenderNode = nodeGraph.registerNode(
      PhotometricStereoRenderer.renderedLightImages
   );
   const lightImagesRenderNodeA = nodeGraph.placeNode(lightImagesRenderNode, {
      x: 450,
      y: 400,
   });

   const qualityPercentInputNode = nodeGraph.createInputNode(
      "number",
      {
         x: 750,
         y: 800,
      },
      1
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
      lightPolarAngleInputNode.getOutput(),
      normalMapNodeA.getInput("lightPolarAngleDeg")
   );
   nodeGraph.connect(
      lightPolarAngleInputNode.getOutput(),
      lightImagesRenderNodeA.getInput("lightPolarAngleDeg")
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
}
main();
