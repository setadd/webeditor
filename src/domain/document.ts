export type ElementKind = "device" | "text" | "metric" | "chart";

export interface DiagramElement {
  id: string;
  kind: ElementKind;
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number;
  binding?: string;
  historyMinutes?: number;
}

export interface DiagramDocument {
  formatVersion: 1;
  id: string;
  name: string;
  page: { id: string; width: number; height: number };
  elements: DiagramElement[];
  savedAt: string | null;
}

export const isColor = (value: string) => /^#[\da-f]{6}$/i.test(value);

export function createDocument(
  name = "未命名组态",
  width = 960,
  height = 640,
): DiagramDocument {
  return {
    formatVersion: 1,
    id: crypto.randomUUID(),
    name,
    page: { id: crypto.randomUUID(), width, height },
    elements: [],
    savedAt: null,
  };
}

export function createElement(
  kind: ElementKind,
  doc: DiagramDocument,
): DiagramElement {
  const index = doc.elements.filter((item) => item.kind === kind).length + 1;
  const offset = (doc.elements.length % 8) * 28;
  const width = kind === "chart" ? 320 : kind === "device" ? 184 : 240;
  const height = kind === "chart" ? 180 : kind === "text" ? 48 : 112;
  const title = {
    device: "设备",
    text: "文字",
    metric: "指标",
    chart: "趋势图",
  }[kind];
  return {
    id: crypto.randomUUID(),
    kind,
    name: `${title} ${index}`,
    text: kind === "text" ? "在右侧编辑显示文字" : `${title} ${index}`,
    x: Math.min(96 + offset, doc.page.width - width),
    y: Math.min(96 + offset, doc.page.height - height),
    width,
    height,
    color: kind === "device" ? "#0d9488" : "#334155",
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Validate stored data before handing it to the renderer, preserving invalid saves for recovery.
export function parseDocument(value: unknown): DiagramDocument {
  const invalid = () => {
    throw new Error("本机文件格式不兼容或内容损坏，原文件未被覆盖。");
  };
  if (
    !record(value) ||
    value.formatVersion !== 1 ||
    !nonEmpty(value.id) ||
    !nonEmpty(value.name) ||
    !record(value.page) ||
    !nonEmpty(value.page.id) ||
    !finite(value.page.width) ||
    !finite(value.page.height) ||
    value.page.width < 400 ||
    value.page.width > 3840 ||
    value.page.height < 300 ||
    value.page.height > 2160 ||
    !Array.isArray(value.elements) ||
    !(
      value.savedAt === null ||
      (typeof value.savedAt === "string" &&
        Number.isFinite(Date.parse(value.savedAt)))
    )
  ) {
    return invalid();
  }
  const ids = new Set<string>();
  for (const item of value.elements) {
    if (
      !record(item) ||
      !nonEmpty(item.id) ||
      ids.has(item.id) ||
      !["device", "text", "metric", "chart"].includes(String(item.kind)) ||
      (item.historyMinutes !== undefined &&
        ![15, 60].includes(Number(item.historyMinutes))) ||
      (item.binding !== undefined && typeof item.binding !== "string") ||
      typeof item.name !== "string" ||
      typeof item.text !== "string" ||
      typeof item.color !== "string" ||
      !isColor(item.color) ||
      !finite(item.x) ||
      !finite(item.y) ||
      (item.rotation !== undefined && !finite(item.rotation)) ||
      !finite(item.width) ||
      !finite(item.height) ||
      item.width <= 0 ||
      item.height <= 0 ||
      item.x < 0 ||
      item.y < 0 ||
      item.x + item.width > value.page.width ||
      item.y + item.height > value.page.height
    ) {
      return invalid();
    }
    ids.add(item.id);
  }
  return value as unknown as DiagramDocument;
}
