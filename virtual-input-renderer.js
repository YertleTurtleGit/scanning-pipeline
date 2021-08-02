/* global THREE */
/* exported VirtualInputRenderer */

// TODO: make abstract and implement spherical gradient
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
      this.renderId = 0;
   }

   /**
    * @public
    * @param {number} lightPolarAngleDeg
    */
   setLightPolarAngleDeg(lightPolarAngleDeg = 35) {
      this.lightPolarAngleDeg = lightPolarAngleDeg;
      this.updateLightPositions;
      this.render();
   }

   /**
    * @public
    * @param {number} lightDistance
    */
   setLightDistance(lightDistance = 8) {
      this.lightDistance = lightDistance;
      this.updateLightPositions();

      this.lights.forEach((light) => {
         light.distance = this.lightDistance * 2;
      });

      this.render();
   }

   /**
    * @public
    * @param {number} cameraDistance
    */
   setCameraDistance(cameraDistance = 8) {
      this.cameraDistance = cameraDistance;
      this.camera.position.set(0, 0, this.cameraDistance);
      this.uiCamera.lookAt(new THREE.Vector3(0, 0, this.cameraDistance / 3));
      this.render();
   }

   /**
    * @private
    */
   updateLightPositions() {
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
    * @returns {Promise<HTMLImageElement[]>}
    */
   async render() {
      this.renderId++;
      const renderId = this.renderId;

      await this.initialize();

      console.log("rendering...");

      if (renderId < this.renderId) return;

      setTimeout(
         this.uiRenderer.render.bind(this.uiRenderer, this.scene, this.uiCamera)
      );

      const renderPromises = [];

      const lightCount = this.lights.length;
      for (let i = 0; i < lightCount; i++) {
         for (let j = 0; j < lightCount; j++) {
            if (j === i) {
               this.lights[j].visible = true;
            } else {
               this.lights[j].visible = false;
            }
         }

         if (renderId < this.renderId) return;

         this.renderer.render(this.scene, this.camera);
         const renderImageDataUrl = this.renderer.domElement.toDataURL();

         renderPromises.push(
            new Promise((resolve) => {
               setTimeout(() => {
                  const image = new Image();
                  image.addEventListener("load", () => {
                     resolve(image);
                  });
                  image.src = renderImageDataUrl;
               });
            })
         );
      }

      return Promise.all(renderPromises);
   }

   /**
    * @private
    */
   async initialize() {
      if (this.initialized) {
         return;
      }

      this.initialized = true;

      const initLightDistance = 8; // TODO: remove hard coding

      this.scene = new THREE.Scene();

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
      this.uiCamera.position.set(10, 2, 10 / 2);
      this.uiCamera.lookAt(new THREE.Vector3(0, 0, this.cameraDistance / 3));
      this.uiCamera.rotateZ(90 * (Math.PI / 180));

      this.cameraHelper = new THREE.CameraHelper(this.camera);
      this.scene.add(this.cameraHelper);
      this.cameraHelper.visible = false;

      // TODO: remove preserve to enable swapping for better performance
      this.renderer = new THREE.WebGLRenderer({
         preserveDrawingBuffer: true,
      });
      this.renderer.physicallyCorrectLights = true;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(
         this.renderDimensions.width,
         this.renderDimensions.height
      );
      this.renderer.shadowMap.enabled = true;

      this.uiRenderer = new THREE.WebGL1Renderer({
         canvas: this.uiCanvas,
         alpha: true,
      });
      this.uiRenderer.setClearColor(0x000000, 0);
      this.uiRenderer.setPixelRatio(window.devicePixelRatio);
      this.uiRenderer.setSize(
         this.uiCanvas.clientWidth,
         this.uiCanvas.clientHeight
      );

      this.lights = new Array(8).fill(new THREE.PointLight("white", 25));
      this.lightHelpers = new Array(8);

      this.lights.forEach((light, index) => {
         light.position.set(0, 0, initLightDistance);
         light.castShadow = true;
         light.distance = initLightDistance * 2;
         light.shadow.mapSize.width = 512 * 2;
         light.shadow.mapSize.height = 512 * 2;
         this.lightHelpers[index] = new THREE.PointLightHelper(light, 0.2);
         this.scene.add(light);
         this.scene.add(this.lightHelpers[index]);
      });

      const loader = new THREE.GLTFLoader();

      const data = await new Promise((resolve, reject) => {
         loader.load(this.modelUrl, (data) => resolve(data), null, reject);
      });

      this.object = data.scene;

      this.object.position.set(0, 0, 0);
      this.object.rotation.x = 90 * (Math.PI / 180);

      this.object.castShadow = true;
      this.object.receiveShadow = true;

      this.scene.background = null;

      this.scene.add(this.object);

      this.setCameraDistance();
      this.setLightDistance();
      this.setLightPolarAngleDeg();
   }
}
/** @type {VirtualInputRenderer[]} */
VirtualInputRenderer.instances = [];
