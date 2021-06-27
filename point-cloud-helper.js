//@ts-check
"use strict";

class PointCloudHelper {
   /**
    * @public
    * @param {HTMLImageElement} depthMapImage
    * @param {HTMLCanvasElement} renderCanvas
    * @param {HTMLImageElement} textureImage
    */
   static async calculatePointCloud(
      depthMapImage,
      renderCanvas,
      depthFactor = 0.15,
      textureImage = undefined
   ) {
      await new Promise((resolve) => {
         setTimeout(() => {
            const pointCloudHelper = PointCloudHelper.getInstance(renderCanvas);

            const dataCanvas = document.createElement("canvas");
            dataCanvas.width = depthMapImage.naturalWidth;
            dataCanvas.height = depthMapImage.naturalHeight;
            const dataContext = dataCanvas.getContext("2d");

            dataContext.drawImage(depthMapImage, 0, 0);

            const imageData = dataContext.getImageData(
               0,
               0,
               dataCanvas.width,
               dataCanvas.height
            ).data;

            if (!textureImage) {
               textureImage = depthMapImage;
            }

            dataContext.drawImage(textureImage, 0, 0);

            const textureData = dataContext.getImageData(
               0,
               0,
               dataCanvas.width,
               dataCanvas.height
            ).data;

            const vertexColors = [];
            const vertices = [];

            const maxDimension = Math.max(dataCanvas.width, dataCanvas.height);

            for (let x = 0; x < dataCanvas.width; x++) {
               for (let y = 0; y < dataCanvas.height; y++) {
                  const index = (y * dataCanvas.width + x) * 4;
                  vertices.push(
                     (x / maxDimension - 0.5) * 100,
                     (1 - y / maxDimension - 0.75) * 100,
                     (imageData[index] / 255) * 100 * depthFactor
                  );
                  vertexColors.push(
                     textureData[index + 0] / 255,
                     textureData[index + 1] / 255,
                     textureData[index + 2] / 255
                  );
               }
            }

            pointCloudHelper.geometry.setAttribute(
               "position",
               new THREE.Float32BufferAttribute(vertices, 3)
            );
            pointCloudHelper.geometry.attributes.position.needsUpdate = true;

            pointCloudHelper.geometry.setAttribute(
               "color",
               new THREE.Float32BufferAttribute(vertexColors, 3)
            );
            pointCloudHelper.geometry.attributes.color.needsUpdate = true;

            resolve();
         });
      });
   }

   /**
    * @private
    * @type {PointCloudHelper[]}
    */
   static instances = [];

   /**
    * @private
    * @param {HTMLCanvasElement} renderCanvas
    * @returns {PointCloudHelper}
    */
   static getInstance(renderCanvas) {
      PointCloudHelper.instances.forEach((instance) => {
         if (instance.renderCanvas === renderCanvas) {
            return instance;
         }
      });
      return new PointCloudHelper(renderCanvas);
   }

   /**
    * @private
    * @param {HTMLCanvasElement} renderCanvas
    */
   constructor(renderCanvas) {
      this.renderCanvas = renderCanvas;
      this.renderer = new THREE.WebGLRenderer({
         canvas: this.renderCanvas,
         alpha: true,
         antialias: true,
      });
      this.camera = new THREE.PerspectiveCamera(
         25,
         this.renderCanvas.width / this.renderCanvas.height
      );
      this.controls = new THREE.OrbitControls(this.camera, this.renderCanvas);
      this.scene = new THREE.Scene();
      this.geometry = new THREE.BufferGeometry();

      this.material = new THREE.PointsMaterial({
         size: 2,
         vertexColors: true,
      });
      this.pointCloud = new THREE.Points(this.geometry, this.material);

      this.scene.add(this.pointCloud);

      this.camera.position.z = 75;
      this.camera.position.y = -100;

      this.controls.minDistance = 1;
      this.controls.maxDistance = 250;

      this.controls.addEventListener("change", () => {
         this.renderer.render(this.scene, this.camera);
      });

      setTimeout(this.controls.update);

      window.addEventListener("resize", this.handleResize.bind(this));

      PointCloudHelper.instances.push(this);
   }

   /**
    * @private
    */
   handleResize() {
      console.log("resized!");
         const width = this.renderCanvas.clientWidth;
      const height = this.renderCanvas.clientHeight;
      const needResize = this.renderCanvas.width !== width || this.renderCanvas.height !== height;
      if (needResize) {
         this.renderer.setSize(width, height, false);

         this.camera.aspect = this.renderCanvas.width / this.renderCanvas.height;
         this.camera.updateProjectionMatrix();
         this.renderer.render(this.scene, this.camera);
      }
   }
}
