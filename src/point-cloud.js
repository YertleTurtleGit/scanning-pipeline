/* global THREE */
/* exported pointCloud */

/**
 * @global
 */
class PointCloudHelper {
   /**
    * This functions calculates a point cloud by a given
    * depth mapping.
    *
    * @public
    * @param {ImageBitmap} depthMap The depth
    * mapping that is used to calculate the point cloud.
    * @param {number} depthFactor The factor that is
    * multiplied with the z-coordinate (depth-coordinate).
    * @param {ImageBitmap} texture The texture
    * that is used for the point cloud vertex color.
    * @returns {Promise<number[]>} The vertices of the
    * calculated point cloud in an array. [x1, y1, z1, x2,
    * y2, z2, ...]
    */
   static async pointCloud(depthMap, depthFactor = 0.15, texture = depthMap) {
      return new Promise((resolve) => {
         setTimeout(async () => {
            const dim = new Uint32Array(2);
            dim[0] = depthMap.width;
            dim[1] = depthMap.height;
            const dataCanvas = new OffscreenCanvas(dim[0], dim[1]);

            dataCanvas.width = depthMap.width;
            dataCanvas.height = depthMap.height;
            const dataContext = dataCanvas.getContext("2d");

            dataContext.drawImage(depthMap, 0, 0);

            const imageData = dataContext.getImageData(
               0,
               0,
               dataCanvas.width,
               dataCanvas.height
            ).data;

            dataContext.drawImage(depthMap, 0, 0);

            const textureData = dataContext.getImageData(
               0,
               0,
               dataCanvas.width,
               dataCanvas.height
            ).data;

            const vertices = [];
            const vertexColors = [];

            const maxDimension = Math.max(dataCanvas.width, dataCanvas.height);

            for (let x = 0; x < dataCanvas.width; x++) {
               for (let y = 0; y < dataCanvas.height; y++) {
                  const index = (y * dataCanvas.width + x) * 4;

                  const r = textureData[index + 0];
                  const g = textureData[index + 1];
                  const b = textureData[index + 2];

                  if (r !== 0 || g !== 0 || b !== 0) {
                     const xC = (x / maxDimension - 0.5) * 100;
                     const yC = (1 - y / maxDimension - 0.75) * 100;
                     const zC = (imageData[index] / 255) * 100 * depthFactor;

                     vertices.push(xC, yC, zC);
                     vertexColors.push(r / 255, g / 255, b / 255);
                  }
               }
            }

            resolve(vertices);
         }, 100);
      });
   }

   /**
    * @param {number[]} vertices
    */
   static async downloadOBJ(vertices) {
      await new Promise((resolve) => {
         setTimeout(() => {
            const filename = "point_cloud.obj";
            let objString = "";

            for (
               let i = 0, vertexCount = vertices.length;
               i < vertexCount;
               i += 3
            ) {
               const x = vertices[i + 0];
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
      this.renderingContext =
         PointCloudHelperRenderingContext.getInstance(renderCanvas);
   }
}

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

      // @ts-ignore
      this.controls = new THREE.OrbitControls(this.camera, this.renderCanvas);
      this.scene = new THREE.Scene();
      this.geometry = new THREE.BufferGeometry();
      this.material = new THREE.PointsMaterial({
         size: 2,
         vertexColors: true,
      });
      this.pointCloud = new THREE.Points(this.geometry, this.material);

      this.pointCloud.rotateX(35 * (Math.PI / 180));
      this.pointCloud.translateY(15);

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

            /*
            await pointCloudHelper.renderingContext.initialize();

            pointCloudHelper.renderingContext.geometry.setAttribute(
               "position",
               new THREE.Float32BufferAttribute(vertices, 3)
            );
            pointCloudHelper.renderingContext.geometry.setAttribute(
               "color",
               new THREE.Float32BufferAttribute(vertexColors, 3)
            );

            pointCloudHelper.renderingContext.geometry.attributes.position.needsUpdate = true;
            pointCloudHelper.renderingContext.geometry.attributes.color.needsUpdate = true;

            pointCloudHelper.renderingContext.render();

            pointCloudHelper.renderingContext.handleResize();
            */
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

/** @constant */
PointCloudHelperRenderingContext.MAX_INSTANCES = 8;

const pointCloud = PointCloudHelper.pointCloud;
