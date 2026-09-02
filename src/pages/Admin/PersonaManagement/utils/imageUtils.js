/**
 * Utilidades de imagen del módulo de Gestión de Personas.
 * Incluye limpieza de blobs creados con URL.createObjectURL
 * para evitar fugas de memoria.
 */

/**
 * Carga una imagen desde una URL (dataURL o blob URL).
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

/**
 * Recorta una imagen a 512x512 y devuelve un File JPEG (calidad 0.85).
 * Si imageSrc es un blob URL, queda a cargo del llamador revocarlo.
 * @param {string} imageSrc - dataURL o blob URL
 * @param {{x:number,y:number,width:number,height:number}} pixelCrop
 * @returns {Promise<File>}
 */
async function getCroppedImg(imageSrc, pixelCrop) {
  if (!imageSrc) {
    throw new Error("No hay imagen para recortar.");
  }
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener el contexto de dibujo 2D.");
  }
  const crop =
    pixelCrop && typeof pixelCrop.x === "number"
      ? pixelCrop
      : { x: 0, y: 0, width: 100, height: 100 };
  const TARGET_SIZE = 512;
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar el blob de la imagen."));
          return;
        }
        const file = new File([blob], "foto_cropped.jpg", {
          type: "image/jpeg",
        });
        resolve(file);
      },
      "image/jpeg",
      0.85,
    );
  });
}

/**
 * Libera un objeto URL de tipo blob. No-op si no es un blob URL.
 * @param {string|null|undefined} url
 */
const revokeObjectUrl = (url) => {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

export { createImage, getCroppedImg, revokeObjectUrl };
export default { createImage, getCroppedImg, revokeObjectUrl };
