import { isImageAsset, type ImageAsset, type PageBackground } from "./assets";
import { isValidRules, type DisplayRule, type FlowEffect } from "./rules";
import type { LineGeometry } from "./lines";
export type ElementKind = "device" | "text" | "metric" | "chart" | "line";

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
  rules?: DisplayRule[];
  flow?: FlowEffect;
  rotation?: number;
  line?: LineGeometry;
  binding?: string;
  historyMinutes?: number;
  interaction?: { action: "details" | "navigate"; pageId?: string };
}

export interface DiagramPageSnapshot {
  name: string;
  page: { id: string; width: number; height: number };
  elements: DiagramElement[];
}

export interface DiagramDocument {
  formatVersion: 1;
  id: string;
  name: string;
  page: {
    id: string;
    width: number;
    height: number;
    background?: PageBackground;
  };
  assets?: Record<string, ImageAsset>;
  elements: DiagramElement[];
  savedAt: string | null;
  otherPages?: DiagramPageSnapshot[];
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
    line: "线条",
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
export function parseDocument(value: unknown, validateReferences = true): DiagramDocument {
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
  if (
    value.assets !== undefined &&
    (!record(value.assets) ||
      Object.entries(value.assets).some(
        ([id, asset]) => !isImageAsset(asset) || id !== asset.id,
      ))
  )
    return invalid();
  const bg = value.page.background;
  if (
    bg !== undefined &&
    (!record(bg) ||
      typeof bg.color !== "string" ||
      !isColor(bg.color) ||
      !["contain", "cover", "stretch", "tile"].includes(String(bg.mode)) ||
      !finite(bg.opacity) ||
      bg.opacity < 0 ||
      bg.opacity > 1 ||
      (bg.imageId !== undefined &&
        (typeof bg.imageId !== "string" ||
          !record(value.assets) ||
          !Object.hasOwn(value.assets, bg.imageId))))
  )
    return invalid();
  const ids = new Set<string>();
  for (const item of value.elements) {
    if (
      !record(item) ||
      (item.interaction !== undefined && (!record(item.interaction) || !["details", "navigate"].includes(String(item.interaction.action)) || (item.interaction.action === "navigate" && !nonEmpty(item.interaction.pageId)))) ||
      (item.rules !== undefined && !isValidRules(item.rules)) ||
      !nonEmpty(item.id) ||
      ids.has(item.id) ||
      !["device", "text", "metric", "chart", "line"].includes(
        String(item.kind),
      ) ||
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
    if (
      item.flow !== undefined &&
      (!record(item.flow) ||
        typeof item.flow.enabled !== "boolean" ||
        !["forward", "reverse", "stopped"].includes(
          String(item.flow.direction),
        ) ||
        !finite(item.flow.speed) ||
        item.flow.speed < 0.1 ||
        item.flow.speed > 10)
    )
      return invalid();
    if (item.kind === "line") {
      const l = item.line;
      if (
        !record(l) ||
        !["straight", "polyline", "curve"].includes(String(l.type)) ||
        !Array.isArray(l.points) ||
        l.points.length < 2 ||
        (l.type === "straight" && l.points.length !== 2) ||
        (l.type === "curve" && l.points.length !== 4) ||
        !l.points.every(
          (p) =>
            record(p) &&
            finite(p.x) &&
            finite(p.y) &&
            p.x >= 0 &&
            p.x <= 1 &&
            p.y >= 0 &&
            p.y <= 1,
        ) ||
        !finite(l.strokeWidth) ||
        l.strokeWidth < 1 ||
        l.strokeWidth > 40 ||
        !["solid", "dashed"].includes(String(l.dash)) ||
        typeof l.startArrow !== "boolean" ||
        typeof l.endArrow !== "boolean"
      )
        return invalid();
    }
    ids.add(item.id);
  }
  if (value.otherPages !== undefined) {
    if (!Array.isArray(value.otherPages)) return invalid();
    const pageIds = new Set([value.page.id]);
    for (const page of value.otherPages) {
      if (
        !record(page) ||
        !record(page.page) ||
        !nonEmpty(page.page.id) ||
        pageIds.has(page.page.id)
      )
        return invalid();
      pageIds.add(page.page.id);
      parseDocument({
        ...page,
        formatVersion: 1,
        id: value.id,
        assets: value.assets,
        savedAt: null,
        otherPages: undefined,
      }, false);
      for (const element of page.elements as DiagramElement[]) {
        if (ids.has(element.id)) return invalid();
        ids.add(element.id);
      }
    }
  }
  if (validateReferences) {
    const document = value as unknown as DiagramDocument;
    const pages = [{ page: document.page, elements: document.elements }, ...(document.otherPages || [])];
    const targets = new Set(pages.map(p => p.page.id));
    if (pages.some(p => p.elements.some(e => e.interaction?.action === 'navigate' && !targets.has(e.interaction.pageId || '')))) {
      throw new Error('页面跳转目标不存在，请重新选择目标页面。');
    }
  }
  return value as unknown as DiagramDocument;
}
