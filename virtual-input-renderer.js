/* global THREE, GLSL */
/* exported VirtualInputRenderer, PhotometricStereoRenderer, SphericalGradientRenderer */

/**
 * @abstract
 */
class VirtualInputRenderer {
   /**
    * @protected
    * @param {HTMLCanvasElement} uiCanvas
    * @param {string} modelUrl
    * @param {{width: number, height: number}} renderDimensions
    */
   constructor(uiCanvas, modelUrl, renderDimensions) {
      this.uiCanvas = uiCanvas;
      this.modelUrl = modelUrl;
      this.renderDimensions = renderDimensions;
      this.initialized = false;
      this.initializing = false;
      this.renderId = 0;

      this.lights = undefined;
      this.lightHelpers = undefined;
   }

   /**
    * @abstract
    * @throws {Error} Cannot call an abstract method.
    * @param {number} lightDistance
    */
   // eslint-disable-next-line no-unused-vars
   async setLightDistance(lightDistance) {
      throw new Error("Cannot call an abstract method.");
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
      if (this.uiControls) {
         this.uiControls.update();
      }
   }

   /**
    * @abstract
    * @throws {Error} Cannot call an abstract method.
    */
   async updateLightPositions() {
      throw new Error("Cannot call an abstract method.");
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

      this.mesh.material = new THREE.MeshNormalMaterial();
      this.renderer.render(this.scene, this.camera);
      this.mesh.material = this.material;

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

      this.mesh.material = new THREE.MeshDepthMaterial();
      this.renderer.render(this.scene, this.camera);
      this.mesh.material = this.material;

      const renderImageDataUrl = this.renderer.domElement.toDataURL();

      const renderImage = await new Promise((resolve) => {
         const image = new Image();
         image.addEventListener("load", () => {
            resolve(image);
         });
         image.src = renderImageDataUrl;
      });

      const width = renderImage.width;
      const height = renderImage.height;

      const imageCanvas = document.createElement("canvas");
      imageCanvas.width = width;
      imageCanvas.height = height;
      const imageContext = imageCanvas.getContext("2d");
      imageContext.drawImage(renderImage, 0, 0, width, height);
      const imageData = imageContext.getImageData(0, 0, width, height).data;

      let min = 255;
      let max = 0;

      for (let x = 0; x < width - 1; x++) {
         for (let y = 0; y < height - 1; y++) {
            const index = (x + y * width) * 4;
            const localDepth = imageData[index] / 255;
            min = Math.min(min, localDepth);
            max = Math.max(max, localDepth);
         }
      }

      const normalizeShader = new GLSL.Shader({ width: width, height: height });
      normalizeShader.bind();

      const depthValue = GLSL.Image.load(renderImage).channel(0);

      let normalizedDepthValue;

      if (min === max) {
         normalizedDepthValue = new GLSL.Float(0.5);
      } else {
         normalizedDepthValue = depthValue
            .subtractFloat(new GLSL.Float(min))
            .multiplyFloat(new GLSL.Float(1 / max));
      }

      const normalizedDepthImage = GLSL.render(
         new GLSL.Vector4([
            normalizedDepthValue,
            normalizedDepthValue,
            normalizedDepthValue,
            new GLSL.Float(1),
         ])
      ).getJsImage();

      normalizeShader.purge();

      return normalizedDepthImage;
   }

   /**
    * @private
    */
   async updateCameraPlanes() {
      if (this.object) {
         let boundingBox = new THREE.Box3();

         boundingBox.setFromObject(this.object);

         let min = boundingBox.min.z;
         let max = boundingBox.max.z;

         const minPlaneDistance = 0.5;

         if (min + minPlaneDistance >= max) {
            min = -minPlaneDistance;
            max = minPlaneDistance;
         }

         this.camera.near = min + this.cameraDistance;
         this.camera.far = max + this.cameraDistance;

         this.camera.updateProjectionMatrix();

         this.cameraHelper.update();
         this.uiRenderer.render(this.scene, this.uiCamera);
      }
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
         this.lights[i].intensity = 25 * (this.cameraDistance / 8);

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

      this.updateCameraPlanes();
      this.uiRenderer.render(this.scene, this.uiCamera);

      return Promise.all(renderPromises);
   }

   /**
    * @protected
    */
   async initialize() {
      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(
         25,
         this.renderDimensions.width / this.renderDimensions.height
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

      // @ts-ignore
      const loader = new THREE.GLTFLoader();

      const data = await new Promise((resolve, reject) => {
         loader.load(this.modelUrl, (data) => resolve(data), null, reject);
      });

      if (!data) {
         this.initializing = false;
         return;
      }

      this.object = data.scene;
      this.mesh = this.object.children[0];

      this.object.position.set(0, 0, 0);
      this.object.rotation.x = 90 * (Math.PI / 180);

      this.object.castShadow = true;
      this.object.receiveShadow = true;

      this.scene.background = null;

      this.material = new THREE.MeshPhysicalMaterial({
         precision: "highp",
      });

      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      this.mesh.material = this.material;

      this.scene.add(this.object);

      // @ts-ignore
      this.uiControls = new THREE.OrbitControls(this.uiCamera, this.uiCanvas);
      this.uiControls.target = new THREE.Vector3(0, 0, 0);
      this.uiControls.addEventListener("change", () => {
         this.cameraHelper.visible = true;

         this.lightHelpers.forEach((lightHelper) => {
            lightHelper.visible = true;
         });

         this.uiRenderer.render(this.scene, this.uiCamera);
      });

      window.addEventListener("resize", () => {
         this.handleResize();
      });

      this.handleResize();
      this.updateCameraPlanes();
   }
}
/** @type {VirtualInputRenderer[]} */
VirtualInputRenderer.instances = [];

class PhotometricStereoRenderer extends VirtualInputRenderer {
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
      super(uiCanvas, modelUrl, renderDimensions);
   }

   /**
    * @protected
    * @override
    */
   async initialize() {
      if (this.initialized || (!this.initialized && this.initializing)) {
         return;
      }
      this.initializing = true;

      super.initialize();

      super.lights = new Array(8);
      super.lightHelpers = new Array(8);

      const initLightDistance = 8; // TODO Remove hard coding.

      for (let i = 0; i < 8; i++) {
         super.lights[i] = new THREE.PointLight("white", 0.25);
         super.lights[i].position.set(0, 0, initLightDistance);
         super.lights[i].castShadow = true;
         super.lights[i].distance = initLightDistance * 2;
         super.lights[i].shadow.mapSize.width = 512 * 2;
         super.lights[i].shadow.mapSize.height = 512 * 2;
         super.lightHelpers[i] = new THREE.PointLightHelper(
            super.lights[i],
            0.2
         );
         super.scene.add(this.lights[i]);
         super.scene.add(this.lightHelpers[i]);
      }

      this.initialized = true;
      this.initializing = false;
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
    * @override
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

      const lightCount = super.lights.length;
      for (let i = 0; i < lightCount; i++) {
         setSingleLightAzimuthalAngle(super.lights[i], i * (360 / lightCount));
      }
   }
}

class SphericalGradientRenderer extends VirtualInputRenderer {
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
      super(uiCanvas, modelUrl, renderDimensions);
   }
}
