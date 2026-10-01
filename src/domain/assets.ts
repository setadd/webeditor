export interface ImageAsset {
  id: string;
  name: string;
  mime: "image/png" | "image/jpeg" | "image/webp";
  dataUrl: string;
}
export interface PageBackground {
  color: string;
  imageId?: string;
  mode: "contain" | "cover" | "stretch" | "tile";
  opacity: number;
}
export const defaultBackground = (): PageBackground => ({
  color: "#ffffff",
  mode: "contain",
  opacity: 1,
});
export const MAX_ASSETS = 100;
export const MAX_TOTAL_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const types = ["image/png", "image/jpeg", "image/webp"];
export function isImageAsset(value: unknown): value is ImageAsset {
  if (!value || typeof value !== "object") return false;
  const a = value as ImageAsset;
  return (
    typeof a.id === "string" &&
    !!a.id &&
    typeof a.name === "string" &&
    types.includes(a.mime) &&
    typeof a.dataUrl === "string" &&
    a.dataUrl.length <= Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64 &&
    new RegExp(`^data:${a.mime};base64,[A-Za-z0-9+/]+={0,2}$`).test(a.dataUrl)
  );
}
export async function readImageAsset(file: File, assets: Record<string, ImageAsset> = {}): Promise<ImageAsset> {
  if(Object.keys(assets).length >= MAX_ASSETS) throw new Error('项目最多支持 100 张图片。');
  const total = Object.values(assets).reduce((sum, asset)=>sum + atob(asset.dataUrl.split(',')[1]!).length,0);
  if(total + file.size > MAX_TOTAL_IMAGE_BYTES) throw new Error('项目图片原始总大小不能超过 25 MB。');
  if (!types.includes(file.type))
    throw new Error("仅支持 PNG、JPEG、WebP 静态图片。");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("单张图片不能超过 5 MB，请压缩后重试。");
  if (!file.size) throw new Error("图片文件为空，原图片已保留。");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败，原图片已保留。"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth * image.naturalHeight > 25000000)
        reject(new Error("图片像素总数不能超过 2500 万，请缩小图片。"));
      else resolve();
    };
    image.onerror = () => reject(new Error("图片内容无法读取，原图片已保留。"));
    image.src = dataUrl;
  });
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type as ImageAsset["mime"],
    dataUrl,
  };
}
