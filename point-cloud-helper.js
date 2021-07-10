/* global THREE */
/* exported PointCloudHelper */

class PointCloudHelper {
   /**
    * @public
    * @param {HTMLImageElement} depthMapImage
    * @param {HTMLCanvasElement} renderCanvas
    * @param {number} depthFactor
    * @param {HTMLImageElement} textureImage
    * @returns {Promise<number[]>}
    */
   static async calculatePointCloud(
      depthMapImage,
      renderCanvas,
      depthFactor = 0.15,
      textureImage = depthMapImage
   ) {
      const pointCloudHelper = new PointCloudHelper(renderCanvas);

      return new Promise((resolve) => {
         setTimeout(async () => {
            if (pointCloudHelper.isRenderObsolete()) return;
            await pointCloudHelper.renderingContext.initialize();
            if (pointCloudHelper.isRenderObsolete()) return;

            const dataCanvas = document.createElement("canvas");
            dataCanvas.width = depthMapImage.naturalWidth;
            dataCanvas.height = depthMapImage.naturalHeight;
            const dataContext = dataCanvas.getContext("2d");

            dataContext.drawImage(depthMapImage, 0, 0);

            if (pointCloudHelper.isRenderObsolete()) return;

            const imageData = dataContext.getImageData(
               0,
               0,
               dataCanvas.width,
               dataCanvas.height
            ).data;

            dataContext.drawImage(textureImage, 0, 0);

            if (pointCloudHelper.isRenderObsolete()) return;

            const textureData = dataContext.getImageData(
               0,
               0,
               dataCanvas.width,
               dataCanvas.height
            ).data;

            const vertices = [];
            const vertexColors = [];

            const maxDimension = Math.max(dataCanvas.width, dataCanvas.height);
            /*const aspectWidth = dataCanvas.width / dataCanvas.height;
        const aspectHeight = dataCanvas.height / dataCanvas.width;*/

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
               if (pointCloudHelper.isRenderObsolete()) return;
            }

            PointCloudHelper.vertices = vertices;
            resolve(vertices);

            pointCloudHelper.renderingContext.geometry.setAttribute(
               "position",
               new THREE.Float32BufferAttribute(vertices, 3)
            );
            pointCloudHelper.renderingContext.geometry.setAttribute(
               "color",
               new THREE.Float32BufferAttribute(vertexColors, 3)
            );

            if (pointCloudHelper.isRenderObsolete()) return;

            pointCloudHelper.renderingContext.geometry.attributes.position.needsUpdate = true;
            pointCloudHelper.renderingContext.geometry.attributes.color.needsUpdate = true;

            pointCloudHelper.renderingContext.render();

            pointCloudHelper.renderingContext.handleResize();
         }, 100);
      });
   }

   static async downloadOBJ() {
      const vertices = PointCloudHelper.vertices;

      if (vertices.length > 3) {
         await new Promise((resolve) => {
            setTimeout(() => {
               const filename = "point_cloud.obj";
               let objString = "";

               for (
                  let i = 0, vertexCount = vertices.length;
                  i < vertexCount;
                  i += 3
               ) {
                  const x = vertices[i];
                  const y = vertices[i + 1];
                  const z = vertices[i + 2];
                  objString += "v " + x + " " + y + " " + z + "\n";
               }

               let element = document.createElement("a");
               element.style.display = "none";

               let blob = new Blob([objString], {
                  type: "text/plain; charset = utf-8",
               });

               let url = window.URL.createObjectURL(blob);
               element.setAttribute("href", window.URL.createObjectURL(blob));
               element.setAttribute("download", filename);

               document.body.appendChild(element);

               element.click();

               window.URL.revokeObjectURL(url);
               element.remove();

               resolve();
            });
         });
      }
   }

   /**
    * @public
    */
   static cancelRenderJobs() {
      PointCloudHelper.renderId++;
   }

   /**
    * @public
    * @param {HTMLCanvasElement} canvas
    */
   static clearCanvas(canvas) {
      const pointCloudHelperRenderingContext =
         PointCloudHelperRenderingContext.getInstance(canvas);

      pointCloudHelperRenderingContext.geometry.setAttribute(
         "position",
         new THREE.Float32BufferAttribute([], 3)
      );
      pointCloudHelperRenderingContext.geometry.setAttribute(
         "color",
         new THREE.Float32BufferAttribute([], 3)
      );

      pointCloudHelperRenderingContext.geometry.attributes.position.needsUpdate = true;
      pointCloudHelperRenderingContext.geometry.attributes.color.needsUpdate = true;

      pointCloudHelperRenderingContext.render();
   }

   /**
    * @private
    * @param {HTMLCanvasElement} renderCanvas
    */
   constructor(renderCanvas) {
      this.renderId = PointCloudHelper.renderId;

      this.renderingContext =
         PointCloudHelperRenderingContext.getInstance(renderCanvas);
   }

   /**
    * @private
    * @returns {boolean}
    */
   isRenderObsolete() {
      return this.renderId < PointCloudHelper.renderId;
   }
}
PointCloudHelper.renderId = 0;

/** @type {PointCloudHelperRenderingContext[]} */
const PointCloudHelperRenderingContext_instances = [];

class PointCloudHelperRenderingContext {
   /**
    * @public
    * @param {HTMLCanvasElement} renderCanvas
    * @returns {PointCloudHelperRenderingContext}
    */
   static getInstance(renderCanvas) {
      for (
         let i = 0;
         i < PointCloudHelperRenderingContext_instances.length;
         i++
      ) {
         const testInstance = PointCloudHelperRenderingContext_instances[i];
         if (testInstance.renderCanvas === renderCanvas) {
            const instance = testInstance;
            return instance;
         }
      }

      const instance = new PointCloudHelperRenderingContext(renderCanvas);
      return instance;
   }

   /**
    * @private
    * @param {HTMLCanvasElement} renderCanvas
    */
   constructor(renderCanvas) {
      this.initialized = false;
      this.renderCanvas = renderCanvas;

      this.renderer = new THREE.WebGLRenderer({
         canvas: renderCanvas,
         alpha: true,
         antialias: true,
      });
      this.camera = new THREE.PerspectiveCamera(
         50,
         renderCanvas.width / renderCanvas.height,
         0.01,
         1000
      );
      this.controls = new THREE.OrbitControls(this.camera, this.renderCanvas);
      this.scene = new THREE.Scene();
      this.geometry = new THREE.BufferGeometry();
      this.material = new THREE.PointsMaterial({
         size: 2,
         vertexColors: true,
      });
      this.pointCloud = new THREE.Points(this.geometry, this.material);

      PointCloudHelperRenderingContext_instances.push(this);

      if (
         PointCloudHelperRenderingContext_instances.length >
         PointCloudHelperRenderingContext.MAX_INSTANCES
      ) {
         console.warn(
            "PointCloudHelperRenderingContext exceeded maximum render canvas instance count. The last instance gets deleted."
         );
         PointCloudHelperRenderingContext_instances.shift();
      }
   }

   async render() {
      await this.initialize();
      this.renderer.render(this.scene, this.camera);
   }

   /**
    * @public
    */
   async initialize() {
      if (this.initialized) {
         return;
      }
      await new Promise((resolve) => {
         setTimeout(() => {
            this.scene.add(this.pointCloud);

            this.camera.position.z = 75;
            this.camera.position.y = -100;

            this.controls.target = new THREE.Vector3(0, 0, 0);

            this.initialized = true;
            resolve();

            this.controls.addEventListener("change", () => {
               this.render();
            });
            window.addEventListener("resize", this.handleResize.bind(this));

            this.controls.update();
            this.handleResize();
         });
      });
   }

   /**
    * @public
    */
   handleResize() {
      const width = this.renderCanvas.clientWidth;
      const height = this.renderCanvas.clientHeight;
      const needResize =
         this.renderCanvas.width !== width ||
         this.renderCanvas.height !== height;
      if (needResize) {
         this.renderer.setSize(width, height);

         this.camera.aspect =
            this.renderCanvas.width / this.renderCanvas.height;
         this.camera.updateProjectionMatrix();
         this.render();
      }
   }
}

PointCloudHelper.vertices = [];

/** @constant */
PointCloudHelperRenderingContext.MAX_INSTANCES = 8;
