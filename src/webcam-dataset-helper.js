/* global DOM_ELEMENT */
/* exported WebcamDatasetHelper */

/**
 * @global
 */
class WebcamDatasetHelper {
   /**
    * @public
    * @param {HTMLVideoElement} webcamPreview
    * @param {HTMLInputElement} captureButton
    * @returns {Promise<HTMLImageElement[]>}
    */
   static async getPhotometricStereoDataset(webcamPreview, captureButton) {
      const webcamDatasetHelper = new WebcamDatasetHelper(
         webcamPreview,
         captureButton
      );

      await webcamDatasetHelper.initialize();

      return new Promise((resolve) => {
         const handler = async () => {
            captureButton.disabled = true;
            captureButton.removeEventListener("click", handler);

            const lightDivBackground = /**@type {HTMLDivElement} */ (
               document.createElement("div")
            );
            const lightCanvas = /**@type {HTMLCanvasElement} */ (
               document.createElement("canvas")
            );

            lightDivBackground.style.position = "absolute";
            lightDivBackground.style.top = "0";
            lightDivBackground.style.left = "0";
            lightDivBackground.style.width = "100%";
            lightDivBackground.style.width = "100%";
            lightDivBackground.style.backgroundColor = "black";
            lightDivBackground.style.cursor = "none";
            lightDivBackground.appendChild(lightCanvas);
            document.body.appendChild(lightDivBackground);
            await lightDivBackground.requestFullscreen();

            const lightDimension = Math.min(
               lightDivBackground.clientWidth,
               lightDivBackground.clientHeight
            );

            lightCanvas.width = lightDimension;
            lightCanvas.height = lightDimension;
            lightCanvas.style.transition = "none";
            lightCanvas.style.position = "absolute";
            lightCanvas.style.width = String(lightDimension) + "px";
            lightCanvas.style.height = String(lightDimension) + "px";
            lightCanvas.style.top = "50%";
            lightCanvas.style.left = "50%";
            lightCanvas.style.transform = "translate(-50%, -50%)";
            lightCanvas.style.backgroundColor = "black";

            const radius = lightDimension / 7;
            const context = lightCanvas.getContext("2d");

            context.clearRect(0, 0, lightCanvas.width, lightCanvas.width);
            context.beginPath();
            context.arc(
               lightDimension - radius,
               lightDimension / 2,
               radius,
               0,
               2 * Math.PI
            );
            context.fillStyle = "white";
            context.closePath();
            context.fill();

            await new Promise((resolve) => {
               setTimeout(resolve, 1000);
            });

            const lightDegrees = [0, 45, 90, 135, 180, 225, 270, 315];
            const lightImages = new Array(lightDegrees.length + 1);

            /*const halfWidth = lightCanvas.width / 2;
            const halfHeight = lightCanvas.height / 2;*/
            const inheritTransform = lightCanvas.style.transform;

            for (let i = 0; i < lightDegrees.length; i++) {
               console.log(lightDegrees[i]);

               /*context.clearRect(0, 0, lightCanvas.width, lightCanvas.width);

               context.beginPath();
               context.arc(
                  lightDimension - radius,
                  lightDimension / 2,
                  radius,
                  0,
                  2 * Math.PI
               );
               context.fillStyle = "white";
               context.closePath();
               context.fill();

               context.translate(halfWidth, halfHeight);
               context.rotate((Math.PI / 180) * lightDegrees[i]);
               context.translate(-halfWidth, -halfHeight);*/

               lightCanvas.style.transform =
                  inheritTransform +
                  " rotateZ(" +
                  String(lightDegrees[i]) +
                  "deg)";

               await new Promise((resolve) => {
                  setTimeout(resolve, 500);
               });

               console.log("finished! " + String(lightDegrees[i]));

               lightImages[i] = await webcamDatasetHelper.captureImage();
            }

            console.log("no light image");

            context.clearRect(0, 0, lightCanvas.width, lightCanvas.width);
            lightImages[lightImages.length - 1] =
               await webcamDatasetHelper.captureImage();

            console.log("no light image finished!");

            resolve(lightImages);
            lightCanvas.remove();
            lightDivBackground.remove();
            document.exitFullscreen();
            webcamDatasetHelper.purge();
         };

         captureButton.addEventListener("click", handler);
      });
   }

   /**
    * @public
    * @param {HTMLVideoElement} webcamPreview
    * @param {HTMLInputElement} captureButton
    * @returns {Promise<HTMLImageElement[]>}
    */
   static async getRapidGradientDataset(webcamPreview, captureButton) {
      const webcamDatasetHelper = new WebcamDatasetHelper(
         webcamPreview,
         captureButton
      );

      await webcamDatasetHelper.initialize();

      return new Promise((resolve) => {
         const clickEventHandler = async () => {
            captureButton.removeEventListener("click", clickEventHandler);

            const lightDivBackground = /**@type {HTMLDivElement} */ (
               document.createElement("div")
            );
            const lightDiv = /**@type {HTMLDivElement} */ (
               document.createElement("div")
            );

            lightDivBackground.style.transition = "none";
            lightDivBackground.style.position = "absolute";
            lightDivBackground.style.top = "0";
            lightDivBackground.style.left = "0";
            lightDivBackground.style.width = "100%";
            lightDivBackground.style.width = "100%";
            lightDivBackground.style.backgroundColor = "black";
            lightDivBackground.style.cursor = "none";
            lightDivBackground.appendChild(lightDiv);
            document.body.appendChild(lightDivBackground);
            await lightDivBackground.requestFullscreen();

            const lightDimension = Math.min(
               lightDivBackground.clientWidth,
               lightDivBackground.clientHeight
            );

            lightDiv.style.transition = "none";
            lightDiv.style.position = "absolute";
            lightDiv.style.width = String(lightDimension) + "px";
            lightDiv.style.height = String(lightDimension) + "px";
            lightDiv.style.top = "50%";
            lightDiv.style.left = "50%";
            lightDiv.style.transform = "translate(-50%, -50%)";
            lightDiv.style.backgroundColor = "black";

            await new Promise((resolve) => {
               setTimeout(resolve, 1000);
            });

            const noLightImage = await webcamDatasetHelper.captureImage();

            lightDiv.style.backgroundColor = "white";

            await new Promise((resolve) => {
               setTimeout(resolve, 500);
            });

            const allLightImage = await webcamDatasetHelper.captureImage();

            lightDiv.style.backgroundColor = "black";
            lightDiv.style.backgroundImage = "radial-gradient(white, black)";

            await new Promise((resolve) => {
               setTimeout(resolve, 500);
            });

            const frontLightImage = await webcamDatasetHelper.captureImage();

            lightDiv.style.backgroundImage =
               "linear-gradient(to left, white , black)";

            const lightDegrees = [0, 90, 180, 270];
            const inheritTransform = lightDiv.style.transform;
            const lightImages = [];

            for (let i = 0; i < lightDegrees.length; i++) {
               console.log(lightDegrees[i]);

               lightDiv.style.transform =
                  inheritTransform +
                  " rotateZ(" +
                  String(lightDegrees[i]) +
                  "deg)";

               await new Promise((resolve) => {
                  setTimeout(resolve, 500);
               });

               lightImages.push(await webcamDatasetHelper.captureImage());
            }

            lightImages.push(allLightImage, frontLightImage, noLightImage);

            resolve(lightImages);

            document.exitFullscreen();
            lightDiv.remove();
            lightDivBackground.remove();
            webcamDatasetHelper.purge();
         };

         captureButton.addEventListener("click", clickEventHandler);
      });
   }

   /**
    * @private
    * @param {HTMLVideoElement} webcamPreview
    * @param {HTMLInputElement} captureButton
    */
   constructor(webcamPreview, captureButton) {
      captureButton.disabled = true;
      WebcamDatasetHelper.instances.push(this);
      this.captureButton = captureButton;
      this.video = webcamPreview;
      this.canvas = document.createElement("canvas");
   }

   /**
    * @private
    */
   purge() {
      console.log("purging");
      DOM_ELEMENT.WEBCAM_AREA.style.display = "none";

      this.stream.getTracks().forEach((track) => {
         track.stop();
      });

      this.captureButton.disabled = false;
      this.video.srcObject = null;
      this.canvas.remove();
   }

   /**
    * @private
    */
   async initialize() {
      this.stream = await this.getStream();
      this.video.srcObject = this.stream;

      await new Promise((resolve) => {
         this.video.addEventListener("canplay", () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.context = this.canvas.getContext("2d");

            this.context.translate(this.video.videoWidth, 0);
            this.context.scale(-1, 1);
            this.video.play();

            resolve();
         });
      });
   }

   /**
    * @private
    * @returns {Promise<HTMLImageElement>}
    */
   async captureImage() {
      return new Promise((resolve) => {
         this.context.drawImage(
            this.video,
            0,
            0,
            this.video.videoWidth,
            this.video.videoHeight
         );

         const image = new Image();
         image.addEventListener("load", () => {
            resolve(image);
         });
         image.src = this.canvas.toDataURL("image/png");
      });
   }

   async getStream() {
      return new Promise((resolve) => {
         setTimeout(async () => {
            this.captureButton.disabled = true;

            const constraints = {
               audio: false,
               video: {
                  width: { ideal: 4096 },
                  height: { ideal: 2160 },
               },
            };

            try {
               resolve(await navigator.mediaDevices.getUserMedia(constraints));
               this.captureButton.disabled = false;
            } catch (error) {
               console.error("An error occurred: " + error);
               console.log("Retrying in 5 seconds.");
               setTimeout(async () => {
                  resolve(await this.getStream());
               }, 5000);
            }
         });
      });
   }
}

/** @type {WebcamDatasetHelper[]} */
WebcamDatasetHelper.instances = [];
