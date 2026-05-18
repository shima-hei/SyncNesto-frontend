import type { Area } from "react-easy-crop";

export const createCroppedImageBlob = async (
  imageSrc: string,
  cropArea: Area
) => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("画像のトリミングに失敗しました。");
  }

  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  return canvasToBlob(canvas);
};

const loadImage = async (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    image.src = src;
  });
};

const canvasToBlob = async (canvas: HTMLCanvasElement) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("画像の変換に失敗しました。"));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      0.92
    );
  });
};

