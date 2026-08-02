/** Resize any image to a square 6x6 thumbnail (600x600 px), <= 80KB, base64 string. */
export async function toSquareBase64(file: File, px = 600, maxBytes = 80 * 1024): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

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

/** Remove a near-white/solid background from a logo, making it transparent. */
function knockOutBackground(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 235 && g > 235 && b > 235) d[i + 3] = 0;
    else if (r > 215 && g > 215 && b > 215) d[i + 3] = Math.min(d[i + 3], 90);
  }
  ctx.putImageData(img, 0, 0);
}

/** Logos keep aspect ratio and get an automatic transparent background. */
export async function toLogoBase64(file: File, max = 512): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  knockOutBackground(canvas);
  return canvas.toDataURL("image/png");
}

/** Report logo: plain rectangular, transparent background, never cropped or circled. */
export async function toCircleBase64(src: string, px = 512): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const scale = Math.min(px / img.width, px / img.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  knockOutBackground(canvas);
  return canvas.toDataURL("image/png");
}

export const toReportLogo = toCircleBase64;
