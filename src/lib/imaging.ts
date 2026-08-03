/** Resize any image to a square 6x6 thumbnail (600x600 px), <= 80KB, base64 string. */
export async function toSquareBase64(file: File, px = 600, maxBytes = 80 * 1024): Promise<string> {
  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px, px);

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, px, px);

  let quality = 0.85;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length * 0.75 > maxBytes && quality > 0.25) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  return out;
}

function readFile(file: File) {
  return new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/**
 * Logo upload: keeps the original picture exactly as uploaded (aspect ratio kept,
 * no automatic background removal). The circular frame is applied when rendering.
 */
export async function toLogoBase64(file: File, max = 512): Promise<string> {
  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

/**
 * Report logo: the picture is auto-fitted inside a perfect circle (circular mask
 * always active). `scale` zooms the artwork inside the circle.
 */
export async function toCircleBase64(src: string, px = 512, scale = 1): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;

  ctx.save();
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const z = Math.max(0.2, scale);
  const fit = Math.min(px / img.width, px / img.height) * z;
  const w = img.width * fit;
  const h = img.height * fit;
  ctx.drawImage(img, (px - w) / 2, (px - h) / 2, w, h);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

export const toReportLogo = toCircleBase64;
