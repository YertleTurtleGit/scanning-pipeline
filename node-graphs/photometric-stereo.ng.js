/* global NodeGraph, ambientOcclusionMap, roughnessMap, photometricStereoNormalMap, depthMap, albedoMap */

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
      x: 450,
      y: 500,
   });
   const normalMapNodeA = nodeGraph.placeNode(normalMapNode, {
      x: 450,
      y: 150,
   });
   const depthMapNodeA = nodeGraph.placeNode(depthMapNode, { x: 700, y: 600 });
   const ambientOcclusionMapNodeA = nodeGraph.placeNode(
      ambientOcclusionMapNode,
      {
         x: 1000,
         y: 150,
      }
   );
   const roughnessMapNodeA = nodeGraph.placeNode(roughnessMapNode, {
      x: 1000,
      y: 500,
   });

   const testImageUrls = [
      "./../test-datasets/photometric-stereo/test_000_036.jpg",
      "./../test-datasets/photometric-stereo/test_045_036.jpg",
      "./../test-datasets/photometric-stereo/test_090_036.jpg",
      "./../test-datasets/photometric-stereo/test_135_036.jpg",
      "./../test-datasets/photometric-stereo/test_180_036.jpg",
      "./../test-datasets/photometric-stereo/test_225_036.jpg",
      "./../test-datasets/photometric-stereo/test_270_036.jpg",
      "./../test-datasets/photometric-stereo/test_315_036.jpg",
   ];

   /** @type {ImageBitmap[]} */
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
   }

   const lightPolarAngleInputNode = nodeGraph.createInputNode("number", {
      x: 200,
      y: 300,
   });
   const lightImagesInputNode = nodeGraph.createInputNode(
      "ImageBitmap[]",
      {
         x: 200,
         y: 400,
      },
      testImageUrls.join(",")
   );
   const qualityPercentInputNode = nodeGraph.createInputNode("number", {
      x: 450,
      y: 800,
   });

   nodeGraph.connect(
      lightImagesInputNode.getOutput(),
      normalMapNodeA.getInput("lightImages")
   );
   nodeGraph.connect(
      lightImagesInputNode.getOutput(),
      albedoMapNodeA.getInput("lightImages")
   );
   nodeGraph.connect(
      lightPolarAngleInputNode.getOutput(),
      normalMapNodeA.getInput("lightPolarAngleDeg")
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
