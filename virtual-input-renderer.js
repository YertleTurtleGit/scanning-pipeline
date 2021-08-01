/* global THREE */
/* exported VirtualInputRenderer */

class VirtualInputRenderer {
   /**
    * @private
    * @param {HTMLCanvasElement} renderCanvas
    * @param {string} modelUrl
    * @param {{width: number, height: number}} renderDimensions
    */
   constructor(
      renderCanvas,
      modelUrl = "./test-datasets/models/torus.glb",
      renderDimensions = { width: 150, height: 150 }
   ) {
      this.renderCanvas = renderCanvas;
      this.modelUrl = modelUrl;
      this.renderDimensions = renderDimensions;
      this.lightDistance = 8; //TODO: remove hard code
      this.initialized = false;
      this.initialize();
   }

   async initialize() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color("rgb(32, 32, 32)");

      this.camera = new THREE.PerspectiveCamera(
         25,
         this.renderDimensions.width / this.renderCanvas.clientHeight,
         6,
         9
      );

      this.uiCamera = new THREE.PerspectiveCamera(
         75,
         this.renderCanvas.clientWidth / this.renderCanvas.clientHeight
      );

      this.cameraHelper = new THREE.CameraHelper(this.camera);
      this.scene.add(this.cameraHelper);
      this.cameraHelper.visible = false;

      this.renderer = new THREE.WebGLRenderer({
         preserveDrawingBuffer: true,
      });
      this.renderer.physicallyCorrectLights = true;
      this.renderer.setClearColor("rgb(32, 32, 32)");
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(
         this.renderDimensions.width,
         this.renderDimensions.height
      );
      this.renderer.shadowMap.enabled = true;

      this.lights = new Array(8);
      this.lightHelpers = new Array(8);

      for (let i = 0; i < 8; i++) {
         this.lights[i] = new THREE.PointLight("white", 25);
         this.lights[i].position.set(0, 0, this.lightDistance);
         this.lights[i].castShadow = true;
         this.lights[i].distance = this.lightDistance * 2;
         this.lights[i].shadow.mapSize.width = 512 * 2;
         this.lights[i].shadow.mapSize.height = 512 * 2;
         this.lightHelpers[i] = new THREE.PointLightHelper(this.lights[i], 0.2);
         this.scene.add(this.lights[i]);
         this.scene.add(this.lightHelpers[i]);
      }

      const loader = new THREE.GLTFLoader();

      const data = await new Promise((resolve, reject) => {
         loader.load(this.modelUrl, (data) => resolve(data), null, reject);
      });

      this.object = data.scene;

      this.object.position.set(0, 0, 0);
      this.object.rotation.x = 90 * (Math.PI / 180);

      this.object.castShadow = true;
      this.object.receiveShadow = true;

      this.scene.add(this.object);
   }
}
