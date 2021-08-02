/* global THREE */
/* exported VirtualInputRenderer */

class VirtualInputRenderer {
   /**
    * @public
    * @param {HTMLCanvasElement} uiCanvas
    * @param {string} modelUrl
    * @param {{width: number, height: number}} renderDimensions
    */
   constructor(
      uiCanvas,
      modelUrl = "./test-datasets/models/torus.glb",
      renderDimensions = { width: 150, height: 150 }
   ) {
      this.uiCanvas = uiCanvas;
      this.modelUrl = modelUrl;
      this.renderDimensions = renderDimensions;
      this.initialized = false;
   }

   /**
    * @public
    * @param {number} lightPolarAngleDeg
    */
   setLightPolarAngleDeg(lightPolarAngleDeg) {
      this.lightPolarAngleDeg = lightPolarAngleDeg;
      this.render();
   }

   /**
    * @public
    * @param {number} lightDistance
    */
   setLightDistance(lightDistance) {
      this.lightDistance = lightDistance;
      this.render();
   }

   /**
    * @public
    * @param {number} cameraDistance
    */
   setCameraDistance(cameraDistance) {
      this.cameraDistance = cameraDistance;
      this.render();
   }

   /**
    * @private
    */
   setLightPositions() {
      const correctedLightPolarDegree = 360 - 90 - this.lightPolarAngleDeg;

      /**
       * @param {THREE.Light} light
       * @param {number} lightAzimuthalDegree
       */
      const setSingleLightAzimuthalAngle = (light, lightAzimuthalDegree) => {
         let lightVector = new THREE.Vector3(this.lightDistance, 0, 0);

         let lightPolarRotationAxis = new THREE.Vector3(0, 1, 0).normalize();
         lightVector.applyAxisAngle(
            lightPolarRotationAxis,
            correctedLightPolarDegree * (Math.PI / 180)
         );

         lightAzimuthalDegree += 180;
         lightAzimuthalDegree *= -1;
         const lightRotation = lightAzimuthalDegree * (Math.PI / 180);
         const lightRotationAxis = new THREE.Vector3(0, 0, 1).normalize();
         lightVector.applyAxisAngle(lightRotationAxis, lightRotation);

         light.position.set(lightVector.x, lightVector.y, lightVector.z);
      };

      const lightCount = this.lights.length;
      for (let i = 0; i < lightCount; i++) {
         setSingleLightAzimuthalAngle(this.lights[i], i * (360 / lightCount));
      }
   }

   /**
    * @private
    */
   async render() {
      await this.initialize();
   }

   /**
    * @private
    */
   async initialize() {
      if (this.initialized) {
         return;
      }

      const initLightDistance = 8; // TODO: remove hard coding

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color("rgb(32, 32, 32)");

      this.camera = new THREE.PerspectiveCamera(
         25,
         this.renderDimensions.width / this.uiCanvas.clientHeight,
         6,
         9
      );

      this.uiCamera = new THREE.PerspectiveCamera(
         75,
         this.uiCanvas.clientWidth / this.uiCanvas.clientHeight
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
         this.lights[i].position.set(0, 0, initLightDistance);
         this.lights[i].castShadow = true;
         this.lights[i].distance = initLightDistance * 2;
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
/** @type {VirtualInputRenderer[]} */
VirtualInputRenderer.instances = [];
