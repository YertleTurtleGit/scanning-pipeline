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
      modelUrl = "./test-datasets/models/monkey.glb",
      renderDimensions = { width: 300, height: 300 }
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
   async setLightPolarAngleDeg(lightPolarAngleDeg) {
      await this.initialize();
      this.lightPolarAngleDeg = lightPolarAngleDeg;
      this.updateLightPositions();
   }

   /**
    * @public
    * @param {number} lightDistance
    */
   async setLightDistance(lightDistance) {
      await this.initialize();
      this.lightDistance = lightDistance;
      for (let i = 0; i < this.lights.length; i++) {
         this.lights[i].distance = this.lightDistance * 2;
      }
      this.updateLightPositions();
   }

   /**
    * @public
    * @param {number} cameraDistance
    */
   async setCameraDistance(cameraDistance) {
      await this.initialize();
      this.cameraDistance = cameraDistance;
      this.camera.position.set(0, 0, this.cameraDistance);
      this.camera.updateProjectionMatrix();
      this.uiCamera.lookAt(new THREE.Vector3(0, 0, this.cameraDistance / 3));
      this.uiCamera.updateProjectionMatrix();
      this.uiControls.update();
   }

   /**
    * @private
    */
   async updateLightPositions() {
      const correctedLightPolarDegree = 360 - this.lightPolarAngleDeg;

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
    * @param {number} renderId
    * @returns {boolean}
    */
   isRenderObsolete(renderId) {
      return this.renderId < renderId;
   }

   /**
    * @public
    */
   handleResize() {
      const width = this.uiCanvas.clientWidth;
      const height = this.uiCanvas.clientHeight;

      if (this.uiCanvas.width !== width || this.uiCanvas.height !== height) {
         this.uiRenderer.setSize(width, height);

         this.camera.aspect = this.uiCanvas.width / this.uiCanvas.height;
         this.camera.updateProjectionMatrix();
         this.uiRenderer.render(this.scene, this.uiCamera);
      }
   }

   /**
    * @public
    * @returns {Promise<HTMLImageElement>}
    */
   async renderNormalMapGroundTruth() {
      await this.initialize();

      for (let i = 0; i < this.lightHelpers.length; i++) {
         this.lightHelpers[i].visible = false;
      }
      this.cameraHelper.visible = false;

      this.scene.traverse((node) => {
         if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = new THREE.MeshNormalMaterial();
         }
      });

      this.renderer.render(this.scene, this.camera);

      this.scene.traverse((node) => {
         if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = this.material;
         }
      });

      const renderImageDataUrl = this.renderer.domElement.toDataURL();

      return new Promise((resolve) => {
         setTimeout(() => {
            const image = new Image();
            image.addEventListener("load", () => {
               resolve(image);
            });
            image.src = renderImageDataUrl;
         });
      });
   }

   /**
    * @public
    * @returns {Promise<HTMLImageElement>}
    */
   async renderDepthMapGroundTruth() {
      await this.initialize();

      for (let i = 0; i < this.lightHelpers.length; i++) {
         this.lightHelpers[i].visible = false;
      }
      this.cameraHelper.visible = false;

      this.scene.traverse((node) => {
         if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = new THREE.MeshDepthMaterial();
         }
      });

      this.renderer.render(this.scene, this.camera);

      this.scene.traverse((node) => {
         if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = this.material;
         }
      });

      const renderImageDataUrl = this.renderer.domElement.toDataURL();

      return new Promise((resolve) => {
         setTimeout(() => {
            const image = new Image();
            image.addEventListener("load", () => {
               resolve(image);
            });
            image.src = renderImageDataUrl;
         });
      });
   }

   /**
    * @public
    * @returns {Promise<HTMLImageElement[]>}
    */
   async render() {
      this.renderId++;
      const renderId = this.renderId;

      await this.initialize();

      if (this.isRenderObsolete(renderId)) return;

      const lightCount = this.lights.length;
      const renderPromises = [];

      for (let i = 0; i < lightCount; i++) {
         this.lightHelpers[i].visible = false;
      }
      this.cameraHelper.visible = false;

      for (let i = 0; i < lightCount; i++) {
         for (let i = 0; i < lightCount; i++) {
            this.lights[i].visible = false;
         }
         this.lights[i].visible = true;
         this.lights[i].intensity = 25;

         if (this.isRenderObsolete(renderId)) return;

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

      for (let i = 0; i < lightCount; i++) {
         this.lights[i].visible = true;
         this.lightHelpers[i].visible = true;
         this.lights[i].intensity = 0.25;
      }
      this.cameraHelper.visible = true;

      this.uiRenderer.render(this.scene, this.uiCamera);

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
         this.renderDimensions.width / this.renderDimensions.height,
         6,
         9
      );

      this.uiCamera = new THREE.PerspectiveCamera(
         75,
         this.uiCanvas.clientWidth / this.uiCanvas.clientHeight
      );
      this.uiCamera.position.set(10, 2, 10 / 2);
      this.uiCamera.lookAt(new THREE.Vector3(0, 0, this.cameraDistance / 3));
      this.uiCamera.rotateZ(180 * (Math.PI / 180));

      this.cameraHelper = new THREE.CameraHelper(this.camera);
      this.scene.add(this.cameraHelper);

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

      this.lights = new Array(8);
      this.lightHelpers = new Array(8);

      for (let i = 0; i < 8; i++) {
         this.lights[i] = new THREE.PointLight("white", 0.25);
         this.lights[i].position.set(0, 0, initLightDistance);
         this.lights[i].castShadow = true;
         this.lights[i].distance = initLightDistance * 2;
         this.lights[i].shadow.mapSize.width = 512 * 2;
         this.lights[i].shadow.mapSize.height = 512 * 2;
         this.lightHelpers[i] = new THREE.PointLightHelper(this.lights[i], 0.2);
         this.scene.add(this.lights[i]);
         this.scene.add(this.lightHelpers[i]);
      }

      // @ts-ignore
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

      this.material = new THREE.MeshPhysicalMaterial({});

      this.object.traverse((node) => {
         if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = this.material;
         }
      });

      this.scene.add(this.object);

      // @ts-ignore
      this.uiControls = new THREE.OrbitControls(this.uiCamera, this.uiCanvas);
      this.uiControls.target = new THREE.Vector3(0, 0, 0);
      this.uiControls.addEventListener("change", () => {
         this.cameraHelper.visible = true;
         this.uiRenderer.render(this.scene, this.uiCamera);
      });

      this.uiControls.update();

      window.addEventListener("resize", () => {
         this.handleResize();
      });
      this.handleResize();

      this.initialized = true;
   }
}
/** @type {VirtualInputRenderer[]} */
VirtualInputRenderer.instances = [];
