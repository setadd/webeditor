import { parseDocument, type DiagramDocument } from "../domain/document";
import {
  MAX_IMAGE_BYTES,
  MAX_ASSETS,
  MAX_TOTAL_IMAGE_BYTES,
  type ImageAsset,
} from "../domain/assets";
import { mockDataProvider } from "../data/useMockData";
export const MAX_PROJECT_BYTES = 50 * 1024 * 1024;
async function verifyImage(asset: ImageAsset): Promise<number> {
  let bytes: string;
  try {
    bytes = atob(asset.dataUrl.split(",")[1]!);
  } catch {
    throw new Error(`图片「${asset.name}」编码损坏。`);
  }
  const starts = (list: number[]) =>
    list.every((n, i) => bytes.charCodeAt(i) === n);
  const signature =
    asset.mime === "image/png"
      ? starts([137, 80, 78, 71, 13, 10, 26, 10])
      : asset.mime === "image/jpeg"
        ? starts([255, 216, 255])
        : bytes.slice(0, 4) === "RIFF" && bytes.slice(8, 12) === "WEBP";
  if (!signature || bytes.length > MAX_IMAGE_BYTES)
    throw new Error(`图片「${asset.name}」内容无效或超过 5 MB。`);
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      image.naturalWidth * image.naturalHeight <= 25000000
        ? resolve()
        : reject(new Error(`图片「${asset.name}」超过 2500 万像素。`));
    image.onerror = () => reject(new Error(`图片「${asset.name}」无法解码。`));
    image.src = asset.dataUrl;
  });
  return bytes.length;
}
export async function readProjectFile(file: File): Promise<DiagramDocument> {
  if (file.size > MAX_PROJECT_BYTES)
    throw new Error("项目文件不能超过 50 MB。");
  let source: string;
  try {
    source = await file.text();
  } catch {
    throw new Error("文件读取失败，请重新选择项目文件。");
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("项目文件不是有效的 JSON，当前项目已保留。");
  }
  if (
    value &&
    typeof value === "object" &&
    "formatVersion" in value &&
    value.formatVersion !== 1
  )
    throw new Error("不支持此项目格式版本，当前仅支持版本 1。");
  const project = parseDocument(value);
  const points = new Set(mockDataProvider.catalog().map((p) => p.id));
  const pages = [project, ...(project.otherPages || [])];
  const ids = new Set(pages.map((p) => p.page.id));
  for (const page of pages)
    for (const e of page.elements) {
      if (ids.has(e.id)) throw new Error("项目中的页面或图元标识重复。");
      ids.add(e.id);
      if (
        [
          e.binding,
          ...(e.rules || []).flatMap((r) => r.conditions.map((c) => c.pointId)),
        ].some((p) => p !== undefined && !points.has(p))
      )
        throw new Error(
          "项目引用了不可用的点位，首版支持温度、运行状态、故障状态和流量。",
        );
    }
  const assets = Object.values(project.assets || {});
  if (assets.length > MAX_ASSETS) throw new Error("项目最多支持 100 张图片。");
  let bytes = 0;
  for (const asset of assets) {
    bytes += await verifyImage(asset);
    if (bytes > MAX_TOTAL_IMAGE_BYTES)
      throw new Error("项目图片原始总大小不能超过 25 MB。");
  }
  return project;
}
export function exportProject(document: DiagramDocument) {
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${document.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_") || "组态项目"}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
