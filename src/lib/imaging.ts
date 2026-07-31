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

/** Logos keep transparency + aspect ratio. */
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
  return canvas.toDataURL("image/png");
}

/** Fit any image (base64/url) fully inside a circle with a soft 3D ring — returns PNG base64.
 *  The whole logo is contained (never cropped) and no square edges/background remain. */
export async function toCircleBase64(src: string, px = 512): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  const r = px / 2 - 6;
  ctx.save();
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px, px);
  // contain-fit so the entire logo is visible inside the circle
  const box = r * 1.42; // inscribed square inside the circle
  const scale = Math.min(box / img.width, box / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (px - w) / 2, (px - h) / 2, w, h);
  ctx.restore();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(20,60,110,0.85)";
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, r - 7, Math.PI * 0.9, Math.PI * 1.9);
  ctx.stroke();
  return canvas.toDataURL("image/png");

}
