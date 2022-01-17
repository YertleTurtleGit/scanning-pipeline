self.addEventListener("message", (messageEvent) => {
   const reader = new FileReader();
   const name = messageEvent.data.name;

   reader.addEventListener("load", async () => {
      const imageDataUrl = reader.result;

      fetch(imageDataUrl).then(async (res) => {
         const blob = await res.blob();
         const imageBitmap = await createImageBitmap(blob);
         self.postMessage({ imageBitmap: imageBitmap, name: name });
      });
   });
   reader.readAsDataURL(messageEvent.data);
});
