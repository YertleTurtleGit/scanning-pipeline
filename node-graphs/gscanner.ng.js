/* global NodeGraph, NODE_TYPE, ambientOcclusionMap, roughnessMap, photometricStereoNormalMap, depthMap, albedoMap, translucencyMap, opacityMap, applyMasks */

async function main() {
   const nodeGraph = new NodeGraph(document.getElementById("nodeGraphDiv"));

   const opacityMapNode = nodeGraph.registerNode(opacityMap, NODE_TYPE.IMAGE);
   const applyMasksNode = nodeGraph.registerNode(
      applyMasks,
      NODE_TYPE.IMAGE_ARRAY
   );
   const albedoMapNode = nodeGraph.registerNode(
      albedoMap,
      NODE_TYPE.IMAGE /*[
      "./src/glsl-shader.js",
      "./src/albedo-map.js",
   ]*/
   );
   const translucencyMapNode = nodeGraph.registerNode(
      translucencyMap,
      NODE_TYPE.IMAGE /*[
      "./src/glsl-shader.js",
      "./src/translucency-map.js",
   ]*/
   );
   const normalMapNode = nodeGraph.registerNode(
      photometricStereoNormalMap,
      NODE_TYPE.IMAGE
      /*["./src/glsl-shader.js", "./src/normal-map.js"]*/
   );
   const depthMapNode = nodeGraph.registerNodeAsWorker(depthMap, [
      "./src/glsl-shader.js",
      "./src/function-worker.js",
      "./src/depth-map.js",
   ]);
   const ambientOcclusionMapNode = nodeGraph.registerNode(
      ambientOcclusionMap,
      NODE_TYPE.IMAGE
      /*["./src/glsl-shader.js", "./src/ambient-occlusion-map.js"]*/
   );
   const roughnessMapNode = nodeGraph.registerNode(
      roughnessMap,
      /*[
      "./src/glsl-shader.js",
      "./src/roughness-map.js",
   ]*/ NODE_TYPE.IMAGE
   );

   const opacityMapNodeA = nodeGraph.placeNode(opacityMapNode, {
      x: 450,
      y: 750,
   });
   const applyMasksNodeA = nodeGraph.placeNode(applyMasksNode, {
      x: 750,
      y: 600,
   });
   const applyMasksNodeB = nodeGraph.placeNode(applyMasksNode, {
      x: 750,
      y: 750,
   });
   const albedoMapNodeA = nodeGraph.placeNode(albedoMapNode, {
      x: 1000,
      y: 850,
   });
   const translucencyMapNodeA = nodeGraph.placeNode(translucencyMapNode, {
      x: 750,
      y: 875,
   });
   const normalMapNodeA = nodeGraph.placeNode(normalMapNode, {
      x: 1000,
      y: 150,
   });
   const depthMapNodeA = nodeGraph.placeNode(depthMapNode, { x: 1250, y: 600 });
   const ambientOcclusionMapNodeA = nodeGraph.placeNode(
      ambientOcclusionMapNode,
      {
         x: 1500,
         y: 50,
      }
   );
   const roughnessMapNodeA = nodeGraph.placeNode(roughnessMapNode, {
      x: 1500,
      y: 400,
   });

   const lightAzimuthalAngleInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER_ARRAY,
      {
         x: 200,
         y: 250,
      },
      [
         206.499435031581, 167.879650327573, 126.36394528385, 81.7247591127658,
         32.1198146232726, 338.27518442, 293.793555106, 249.544608574549,
      ]
   );
   const lightPolarAnglesInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER_ARRAY,
      {
         x: 200,
         y: 25,
      },
      [
         23.467122771563, 22.8644705728031, 21.9724553502188, 21.2483517939196,
         21.7445722878563, 22.1634927437071, 23.3351065461532, 23.9783114460722,
      ]
   );

   const lightImagesInputNode = nodeGraph.createInputNode(
      NODE_TYPE.IMAGE_ARRAY,
      {
         x: 200,
         y: 450,
      },
      0.001
   );
   const backlightImagesInputNode = nodeGraph.createInputNode(
      NODE_TYPE.IMAGE_ARRAY,
      {
         x: 200,
         y: 750,
      },
      0.001
   );
   const opacityThresholdInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER,
      {
         x: 200,
         y: 1050,
      },
      0.005
   );

   const qualityPercentInputNode = nodeGraph.createInputNode(
      NODE_TYPE.NUMBER,
      {
         x: 1000,
         y: 750,
      },
      0.001
   );

   nodeGraph.connect(
      lightImagesInputNode.getOutput(),
      opacityMapNodeA.getInput("frontLightImages")
   );
   nodeGraph.connect(
      backlightImagesInputNode.getOutput(),
      opacityMapNodeA.getInput("backLightImages")
   );
   nodeGraph.connect(
      lightImagesInputNode.getOutput(),
      applyMasksNodeA.getInput("images")
   );
   nodeGraph.connect(
      backlightImagesInputNode.getOutput(),
      applyMasksNodeB.getInput("images")
   );
   nodeGraph.connect(
      opacityThresholdInputNode.getOutput(),
      opacityMapNodeA.getInput("threshold")
   );
   nodeGraph.connect(
      opacityMapNodeA.getOutput(),
      applyMasksNodeA.getInput("mask")
   );
   nodeGraph.connect(
      opacityMapNodeA.getOutput(),
      applyMasksNodeB.getInput("mask")
   );
   nodeGraph.connect(
      applyMasksNodeA.getOutput(),
      normalMapNodeA.getInput("lightImages")
   );
   nodeGraph.connect(
      applyMasksNodeA.getOutput(),
      albedoMapNodeA.getInput("lightImages")
   );
   nodeGraph.connect(
      applyMasksNodeB.getOutput(),
      translucencyMapNodeA.getInput("backlightImages")
   );
   nodeGraph.connect(
      lightPolarAnglesInputNode.getOutput(),
      normalMapNodeA.getInput("lightPolarAnglesDeg")
   );
   nodeGraph.connect(
      lightAzimuthalAngleInputNode.getOutput(),
      normalMapNodeA.getInput("lightAzimuthalAnglesDeg")
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

   const downloadAll = document.createElement("button");
   downloadAll.style.zIndex = "9999";
   downloadAll.style.position = "absolute";
   downloadAll.style.left = "50%";
   downloadAll.style.top = "10px";
   downloadAll.innerText = "download all maps";

   const outputMaps = [
      { name: "OpacityMap", node: opacityMapNodeA },
      { name: "AlbedoMap", node: albedoMapNodeA },
      { name: "TranslucencyMap", node: translucencyMapNodeA },
      { name: "NormalMap", node: normalMapNodeA },
      { name: "HeightMap", node: depthMapNodeA },
      { name: "AmbientOcclusionMap", node: ambientOcclusionMapNodeA },
      { name: "RoughnessMap", node: roughnessMapNodeA },
   ];

   downloadAll.addEventListener("click", () => {
      outputMaps.forEach((map) => {
         const mapImage = map.node.outputUIElement.children[0];
         if (mapImage instanceof HTMLImageElement) {
            const tmpElement = document.createElement("a");
            tmpElement.setAttribute("href", mapImage.src);
            tmpElement.setAttribute("download", map.name + ".png");
            document.body.appendChild(tmpElement);
            tmpElement.click();
            tmpElement.remove();
         }
      });
   });

   document.body.appendChild(downloadAll);
}
main();
