//@ts-check
"use strict";

class WebcamDatasetHelper {
   /** @privet @type {WebcamDatasetHelper[]} */
   static instances = [];

   static purgeWebcamConnections() {
      WebcamDatasetHelper.instances.forEach((instance) => {
         instance.purge();
      });
      WebcamDatasetHelper.instances = [];
   }

   /**
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
         captureButton.addEventListener("click", async () => {
            const lightDiv = /**@type {HTMLDivElement} */ (
               document.createElement("div")
            );
            const lightCanvas = /**@type {HTMLCanvasElement} */ (
               document.createElement("canvas")
            );

            lightDiv.style.position = "absolute";
            lightDiv.style.top = "0";
            lightDiv.style.left = "0";
            lightDiv.style.width = "100%";
            lightDiv.style.width = "100%";
            lightDiv.style.backgroundColor = "black";
            lightDiv.appendChild(lightCanvas);
            document.body.appendChild(lightDiv);
            await lightDiv.requestFullscreen();

            const lightDimension = Math.min(
               lightDiv.clientWidth,
               lightDiv.clientHeight
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
            const lightImages = [];

            await new Promise((resolve) => {
               setTimeout(resolve, 1000);
            });

            const noLightImage = await webcamDatasetHelper.captureImage();

            context.beginPath();
            context.arc(
               lightDimension - radius,
               lightDimension / 2,
               radius,
               0,
               2 * Math.PI
            );
            context.fillStyle = "white";
            context.fill();

            const lightDegrees = [0, 45, 90, 135, 180, 225, 270, 315];

            const inheritTransform = lightCanvas.style.transform;

            for (let i = 0; i < lightDegrees.length; i++) {
               console.log(lightDegrees[i]);

               lightCanvas.style.transform =
                  inheritTransform +
                  " rotateZ(" +
                  String(lightDegrees[i]) +
                  "deg)";

               await new Promise((resolve) => {
                  setTimeout(resolve, 500);
               });

               lightImages.push(await webcamDatasetHelper.captureImage());
            }

            lightImages.push(noLightImage);

            resolve(lightImages);
            document.exitFullscreen();
            lightCanvas.remove();
            lightDiv.remove();
         });
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
      this.captureButton.disabled = true;
      this.video.srcObject = null;
      this.canvas.remove();
   }

   /**
    * @private
    */
   async initialize() {
      this.video.srcObject = await this.getStream();
      this.video.play();

      await new Promise((resolve) => {
         this.video.addEventListener("canplay", () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.context = this.canvas.getContext("2d");
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
